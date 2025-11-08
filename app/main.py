from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.routers import chat
from app.core.database import Base, engine

# Jadval yaratish
Base.metadata.create_all(bind=engine)

app = FastAPI(title="FastAPI Real-Time Chat")

app.include_router(chat.router)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.get("/")
async def root():
    return FileResponse("app/static/index.html")
