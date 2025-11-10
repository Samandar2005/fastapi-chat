from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import json
from app.core.database import SessionLocal
from app.models.message import Message
from app.core.state import manager  # Import from state module

router = APIRouter()

async def get_db():
    async with SessionLocal() as session:
        yield session

from sqlalchemy import select

@router.websocket("/ws/{username}")
async def websocket_chat(websocket: WebSocket, username: str, db: AsyncSession = Depends(get_db)):
    try:
        # Check if server is shutting down
        if manager._shutdown:
            await websocket.close(code=1001)  # Going away
            return
            
        await manager.connect(websocket, username)
        
        # First send history only to the new connection
        result = await db.execute(
            select(Message).order_by(Message.created_at)
        )
        old_messages = result.scalars().all()
        
        for msg in old_messages:
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
                
                print("Received message:", message_data)  # Debug print
                
                # Handle ping/pong
                if message_data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                    continue
                elif message_data.get("type") == "pong":
                    continue
                
                # Handle typing status
                if message_data.get("type") == "typing":
                    is_typing = data.split(":")[1] == "true"
                    await manager.user_typing(username, is_typing)
                    continue

                # Save message to database
                new_msg = Message(username=username, content=data)
                db.add(new_msg)
                await db.commit()
                await db.refresh(new_msg)

                # Handle regular messages
                if message_data.get("type") == "message":
                    # Get the actual message content
                    message_content = message_data.get("message", "")
                    
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
