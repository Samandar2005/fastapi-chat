from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.manager import ConnectionManager

router = APIRouter()
manager = ConnectionManager()

@router.websocket("/ws/{username}")
async def websocket_chat(websocket: WebSocket, username: str):
    await manager.connect(websocket, username)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(f"💬 {username}: {data}")
    except WebSocketDisconnect:
        left_user = manager.disconnect(websocket)
        await manager.broadcast(f"🔴 {left_user} chatdan chiqdi")
