from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
import json
from app.core.database import SessionLocal
from app.models.message import Message
from app.core.state import manager  # Import from state module
from app.core.security import get_username_from_token

router = APIRouter()

async def get_db():
    async with SessionLocal() as session:
        yield session

from sqlalchemy import select

@router.websocket("/ws/{token}")
async def websocket_chat(websocket: WebSocket, token: str):
    """WebSocket endpoint with JWT authentication."""
    username = None
    db = None
    
    try:
        # Check if server is shutting down
        if manager._shutdown:
            await websocket.close(code=1001)  # Going away
            return
        
        # Verify JWT token and extract username
        username = get_username_from_token(token)
        if not username:
            await websocket.close(code=1008, reason="Invalid or expired token")
            return
        
        # Accept WebSocket connection
        await manager.connect(websocket, username)
        
        # Create database session for this connection
        db = SessionLocal()
        
        try:
            # First send history only to the new connection (limit to last 50 messages)
            result = await db.execute(
                select(Message).order_by(Message.created_at.desc()).limit(50)
            )
            old_messages = result.scalars().all()
            
            # Reverse to show oldest first
            for msg in reversed(old_messages):
                try:
                    if manager._shutdown:
                        break
                    await websocket.send_json({
                        "type": "message",
                        "username": msg.username,
                        "message": msg.content,
                        "timestamp": msg.created_at.isoformat()
                    })
                except Exception:
                    break  # Stop if we can't send messages

            while not manager._shutdown:
                try:
                    data = await websocket.receive_text()
                    
                    # Parse JSON data
                    message_data = None
                    try:
                        message_data = json.loads(data)
                    except json.JSONDecodeError:
                        # If not JSON, treat as plain text message
                        message_data = {"type": "message", "message": data}
                    
                    # Handle ping/pong
                    if message_data.get("type") == "ping":
                        await websocket.send_json({"type": "pong"})
                        continue
                    elif message_data.get("type") == "pong":
                        continue
                    
                    # Handle typing status
                    if message_data.get("type") == "typing":
                        is_typing = message_data.get("typing", False)
                        await manager.user_typing(username, is_typing)
                        continue

                    # Handle regular messages
                    if message_data.get("type") == "message":
                        # Get the actual message content
                        message_content = message_data.get("message", "")
                        
                        # Validate message content
                        if not message_content or not message_content.strip():
                            continue  # Skip empty messages
                        
                        # Limit message length (e.g., 1000 characters)
                        if len(message_content) > 1000:
                            message_content = message_content[:1000]
                        
                        # Save message to database
                        new_msg = Message(username=username, content=message_content)
                        db.add(new_msg)
                        await db.commit()
                        await db.refresh(new_msg)

                        # Reset typing status when message is sent
                        await manager.user_typing(username, False)

                        # Broadcast to all users
                        await manager.broadcast_json({
                            "type": "message",
                            "username": username,
                            "message": message_content,
                            "timestamp": new_msg.created_at.isoformat()
                        })
                    
                except WebSocketDisconnect:
                    break
                except Exception:
                    break  # Handle any other errors by closing connection
        finally:
            # Close database session
            await db.close()
                
    except Exception as e:
        # If connection setup fails, ensure cleanup
        if websocket in manager.active_connections:
            manager.disconnect(websocket)
        # Re-raise unexpected exceptions
        if not isinstance(e, (WebSocketDisconnect, ConnectionResetError)):
            raise
    finally:
        # Always try to clean up and notify others
        if websocket in manager.active_connections:
            left_user = manager.disconnect(websocket)
            try:
                await manager.broadcast(f"🔴 {left_user} chatdan chiqdi")
            except Exception:
                pass  # Ignore broadcast errors during cleanup
