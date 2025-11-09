from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.routers import chat
from app.core.database import Base, engine

# Jadval yaratishni qo'lda amalga oshiring: async engine bilan avtomatik create_all ishlamaydi.
# Iltimos quyidagi faylni ishga tushiring loyiha boshlanishidan oldin:
#     python -m app.core.init_db
# Bu skript `app/core/init_db.py` yordamida SQLite bazasini yaratadi.

app = FastAPI(title="FastAPI Real-Time Chat")

app.include_router(chat.router)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.get("/")
async def root():
    return FileResponse("app/static/index.html")
