from fastapi import WebSocket
from typing import List

from contextlib import asynccontextmanager

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.usernames: dict[WebSocket, str] = {}
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
