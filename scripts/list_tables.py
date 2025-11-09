import sqlite3
conn = sqlite3.connect('chat.db')
print(conn.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall())
conn.close()
