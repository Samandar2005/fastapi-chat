"""Migration script to add image column to messages table.

Run with:
    python scripts/migrate_add_image.py
"""

import sqlite3
import os

# Database path
db_path = "chat.db"

def migrate():
    """Add image column to messages table if it doesn't exist."""
    if not os.path.exists(db_path):
        print(f"Database {db_path} not found. Please run init_db first.")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(messages)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if "image" in columns:
            print("Column 'image' already exists in messages table.")
            return
        
        # Add image column
        cursor.execute("ALTER TABLE messages ADD COLUMN image TEXT")
        conn.commit()
        print("Successfully added 'image' column to messages table.")
        
    except sqlite3.Error as e:
        print(f"Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()

