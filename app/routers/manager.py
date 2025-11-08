from fastapi import WebSocket
from typing import List

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.usernames: dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, username: str):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.usernames[websocket] = username
        await self.broadcast(f"🔵 {username} chatga qo‘shildi")

    def disconnect(self, websocket: WebSocket):
        username = self.usernames.get(websocket, "Noma'lum")
        self.active_connections.remove(websocket)
        del self.usernames[websocket]
        return username

    async def broadcast(self, message: str):
        for conn in self.active_connections:
            await conn.send_text(message)
