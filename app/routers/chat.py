from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from app.core.manager import ConnectionManager
from app.core.database import SessionLocal
from app.models.message import Message

router = APIRouter()
manager = ConnectionManager()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.websocket("/ws/{username}")
async def websocket_chat(websocket: WebSocket, username: str, db: Session = Depends(get_db)):
    await manager.connect(websocket, username)
    try:
        # Eski xabarlarni yuborish
        old_messages = db.query(Message).order_by(Message.created_at).all()
        for msg in old_messages:
            await websocket.send_text(f"📜 {msg.username}: {msg.content}")

        while True:
            data = await websocket.receive_text()

            # Xabarni bazaga yozish
            new_msg = Message(username=username, content=data)
            db.add(new_msg)
            db.commit()
            db.refresh(new_msg)

            # Barcha foydalanuvchilarga yuborish
            await manager.broadcast(f"💬 {username}: {data}")

    except WebSocketDisconnect:
        left_user = manager.disconnect(websocket)
        await manager.broadcast(f"🔴 {left_user} chatdan chiqdi")
