from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from app.routers import chat, auth
from app.core.database import Base, engine
from app.core.state import manager

# Load environment variables at startup
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with manager.lifespan():
        yield

# Jadval yaratishni qo'lda amalga oshiring: async engine bilan avtomatik create_all ishlamaydi.
# Iltimos quyidagi faylni ishga tushiring loyiha boshlanishidan oldin:
#     python -m app.core.init_db
# Bu skript `app/core/init_db.py` yordamida SQLite bazasini yaratadi.

app = FastAPI(
    title="FastAPI Real-Time Chat",
    lifespan=lifespan
)

# CORS configuration
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:8000,http://127.0.0.1:8000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(auth.router)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.get("/")
async def root():
    return FileResponse("app/static/index.html")

@app.get("/.well-known/appspecific/com.chrome.devtools.json")
async def ignore_chrome_devtools():
    return {"status": "ok"}  # Chrome DevTools so'rovini ignore qilish
