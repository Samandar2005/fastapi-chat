from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.routers import chat

app = FastAPI(title="FastAPI Real-Time Chat")

# WebSocket endpoint
app.include_router(chat.router, prefix="")

# Router ulash
app.include_router(chat.router)

# Statik fayllarni ulash
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Root path uchun
@app.get("/")
async def root():
    return FileResponse("app/static/index.html")

