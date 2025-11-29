from fastapi import WebSocket
from typing import List, Dict
import json

from contextlib import asynccontextmanager

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.usernames: dict[WebSocket, str] = {}
        self.typing_users: Dict[str, bool] = {}  # Track typing status
        self._shutdown = False
    
    @asynccontextmanager
    async def lifespan(self):
        try:
            yield
        finally:
            self._shutdown = True
            # Close all active connections during shutdown
            for connection in self.active_connections.copy():
                try:
                    await connection.close(code=1000)  # Normal closure
                except Exception:
                    pass
            self.active_connections.clear()
            self.usernames.clear()

    async def connect(self, websocket: WebSocket, username: str):
        try:
            await websocket.accept()
            self.active_connections.append(websocket)
            self.usernames[websocket] = username
            # Send welcome message only to already connected clients
            existing_connections = self.active_connections[:-1]  # All except the new connection
            for conn in existing_connections:
                await conn.send_text(f"🔵 {username} chatga qo'shildi")
        except Exception:
            # If anything goes wrong, make sure to clean up
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
            if websocket in self.usernames:
                del self.usernames[websocket]
            raise

    def disconnect(self, websocket: WebSocket):
        username = self.usernames.get(websocket, "Noma'lum")
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.usernames:
            del self.usernames[websocket]
        return username

    async def broadcast(self, message: str):
        # Make a copy of connections to avoid modification during iteration
        connections = self.active_connections.copy()
        disconnected = []
        
        for connection in connections:
            try:
                await connection.send_text(message)
            except Exception:
                # Mark for removal if sending fails
                disconnected.append(connection)
                
        # Clean up any disconnected clients
        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)
            if conn in self.usernames:
                del self.usernames[conn]

    async def broadcast_json(self, data: dict):
        """Broadcast JSON data to all connected clients."""
        message = json.dumps(data, ensure_ascii=False)
        await self.broadcast(message)

    async def user_typing(self, username: str, is_typing: bool):
        """Update and broadcast typing status for a user."""
        if is_typing:
            self.typing_users[username] = True
        else:
            self.typing_users.pop(username, None)
        
        # Broadcast typing status to all clients
        typing_list = list(self.typing_users.keys())
        await self.broadcast_json({
            "type": "typing",
            "users": typing_list
        })

    def get_online_users(self) -> List[str]:
        """Get list of currently online usernames."""
        return list(self.usernames.values())
