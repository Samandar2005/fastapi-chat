"""Shared state module to avoid circular imports."""
from app.core.manager import ConnectionManager

# Create global connection manager
manager = ConnectionManager()