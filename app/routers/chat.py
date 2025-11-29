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
                    history_data = {
                        "type": "message",
                        "username": msg.username,
                        "timestamp": msg.created_at.isoformat()
                    }
                    if msg.content:
                        history_data["message"] = msg.content
                        # Check if it's a sticker (single emoji character)
                        if len(msg.content) == 1 and ord(msg.content) > 0x1F000:
                            history_data["isSticker"] = True
                    if msg.image:
                        history_data["image"] = msg.image
                    await websocket.send_json(history_data)
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
                        # Get the actual message content, image, and sticker flag
                        message_content = message_data.get("message", "")
                        message_image = message_data.get("image", "")
                        is_sticker = message_data.get("isSticker", False)
                        
                        # Validate: must have either message or image
                        if (not message_content or not message_content.strip()) and not message_image:
                            continue  # Skip empty messages
                        
                        # Limit message length (e.g., 1000 characters)
                        if message_content and len(message_content) > 1000:
                            message_content = message_content[:1000]
                        
                        # Limit image size (base64 can be large, but we'll store it)
                        # In production, you might want to save images to disk and store URLs
                        if message_image and len(message_image) > 5 * 1024 * 1024:  # 5MB limit
                            await websocket.send_json({
                                "type": "error",
                                "message": "Rasm hajmi juda katta"
                            })
                            continue
                        
                        # Save message to database
                        new_msg = Message(
                            username=username,
                            content=message_content if message_content else None,
                            image=message_image if message_image else None
                        )
                        db.add(new_msg)
                        await db.commit()
                        await db.refresh(new_msg)

                        # Reset typing status when message is sent
                        await manager.user_typing(username, False)

                        # Broadcast to all users
                        broadcast_data = {
                            "type": "message",
                            "username": username,
                            "timestamp": new_msg.created_at.isoformat()
                        }
                        if message_content:
                            broadcast_data["message"] = message_content
                        if message_image:
                            broadcast_data["image"] = message_image
                        if is_sticker:
                            broadcast_data["isSticker"] = True
                        
                        await manager.broadcast_json(broadcast_data)
                    
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
