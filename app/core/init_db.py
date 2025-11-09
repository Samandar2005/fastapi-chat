"""Database initialization script.

Run with:
    python -m app.core.init_db

This creates SQLite tables using a synchronous engine derived from DATABASE_URL in database.py.
"""

from sqlalchemy import create_engine
from app.core.database import Base, DATABASE_URL

# DATABASE_URL is async (sqlite+aiosqlite:///...), create a sync URL for table creation
sync_url = DATABASE_URL.replace("+aiosqlite", "")

engine = create_engine(sync_url, echo=False, future=True)

# Import models so they are registered on Base.metadata
import app.models  # noqa: F401

def init_db():
    Base.metadata.create_all(bind=engine)
    print("Database initialized (chat.db)")

if __name__ == "__main__":
    init_db()
