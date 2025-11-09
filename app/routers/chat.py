from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
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
                await websocket.send_text(f"📜 {msg.username}: {msg.content}")
            except Exception:
                break  # Stop if we can't send messages

        while not manager._shutdown:
            try:
                data = await websocket.receive_text()
                
                # Save message to database
                new_msg = Message(username=username, content=data)
                db.add(new_msg)
                await db.commit()
                await db.refresh(new_msg)

                # Broadcast to all users
                await manager.broadcast(f"💬 {username}: {data}")
                
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
