from fastapi import WebSocket
from typing import List

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.usernames: dict[WebSocket, str] = {}
        self.online_users: set[str] = set()
        self.typing_users: set[str] = set()

    async def connect(self, websocket: WebSocket, username: str):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.usernames[websocket] = username
        self.online_users.add(username)
        await self.broadcast_online_users()
        await self.broadcast(f"🔵 {username} chatga qo'shildi")

    def disconnect(self, websocket: WebSocket):
        username = self.usernames.get(websocket, "Noma'lum")
        self.active_connections.remove(websocket)
        if username in self.online_users:
            self.online_users.remove(username)
        del self.usernames[websocket]
        return username

    async def broadcast(self, message: str):
        for conn in self.active_connections:
            await conn.send_text(message)
            
    async def broadcast_online_users(self):
        online_list = list(self.online_users)
        for conn in self.active_connections:
            await conn.send_text(f"ONLINE_USERS:{','.join(online_list)}")
        async def broadcast_json(self, data: dict):
            """Send JSON data to all connected clients"""
            for conn in self.active_connections:
                await conn.send_json(data)

    async def user_typing(self, username: str, is_typing: bool):
        if is_typing:
            self.typing_users.add(username)
        else:
            self.typing_users.discard(username)
        
        typing_list = list(self.typing_users)
        for conn in self.active_connections:
            if self.usernames[conn] != username:  # O'zi yozayotganini ko'rsatmaslik uchun
                await conn.send_text(f"TYPING_USERS:{','.join(typing_list)}")
