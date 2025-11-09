# FastAPI Real-Time Chat

Bu README loyihani tez tushunishingiz va ishga tushirishingiz uchun barcha muhim ma'lumotlarni o'z ichiga oladi (o'zbek tilida).

## Umumiy ma'lumot

FastAPI Real-Time Chat — bu oddiy, lekin to'liq ishlaydigan chat ilovasi. U quyidagilarni o'z ichiga oladi:

- FastAPI backend (REST + WebSocket)
- Async SQLAlchemy + SQLite (aiosqlite) baza
- JWT asosida oddiy autentifikatsiya (/auth/register va /auth/login)
- WebSocket chat endpoint: `/ws/{username}`
- Frontend: oddiy static fayllar (`app/static/index.html`, `script.js`, `style.css`)

Loyihaning maqsadi — real vaqt chat va autentifikatsiya misolini ko'rsatish, shuningdek WebSocket va async DB ishlashini namoyish qilish.

## Asosiy xususiyatlar

- Ro'yxatga olish va kirish (bcrypt bilan parol xeshlash)
- JWT token bilan autentifikatsiya (frontend tokenni saqlaydi)
- WebSocket orqali xabarlarni jo'natish va qabul qilish
- Xabarlarni SQLite bazasiga saqlash

## Texnologiyalar

- Python 3.10+ (yoki 3.11/3.12 mos muhit)
- FastAPI
- Uvicorn (ASGI server)
- SQLAlchemy (async)
- aiosqlite
- passlib / bcrypt (parol xeshlash uchun)
- python-jose (JWT)

## Fayl tuzilishi (asosiy)

```
requirements.txt
app/
  main.py
  core/
    database.py
    init_db.py
    security.py
    manager.py
    state.py
  models/
    __init__.py
    message.py
  routers/
    chat.py
    auth.py
  static/
    index.html
    script.js
    style.css
scripts/
  test_password.py
README.md
```

## Talablar (Prerequisites)

Windows PowerShell misoli:

- Python (3.10+ tavsiya etiladi)
- virtualenv yoki venv

## Ishga tushirish (Develop / Local)

Quyidagi amallarni PowerShell oynasida bajarish tavsiya etiladi (repo root bilan):

1) Virtual muhit yaratish va faollashtirish

```powershell
python -m venv venv
# PowerShell-da:
.\venv\Scripts\Activate.ps1
# Agar cmd.exe ishlatayotgan bo'lsangiz:
# .\venv\Scripts\activate
```

2) Kerakli paketlarni o'rnatish

```powershell
pip install -r requirements.txt
```

3) Bazani yaratish (birinchi marta yoki schema o'zgarganda)

```powershell
python -m app.core.init_db
```
Bu `chat.db` faylini loyihaning ildizida yaratadi va kerakli jadvalarni qo'shadi.

4) Serverni ishga tushirish

```powershell
python -m uvicorn app.main:app --reload
# yoki
uvicorn app.main:app --reload
```
Keyin brauzerda http://127.0.0.1:8000/ ni oching. Frontend sahifasi `app/static/index.html` bo'ladi.

## API va WebSocket foydalanish

1) Ro'yxatdan o'tish

- Endpoint: `POST /auth/register`
- Body (JSON):

```json
{
  "username": "foydalanuvchi",
  "password": "sizning_parolingiz"
}
```

Parol bcrypt cheklovi sabab 72 baytdan (bytes) uzun bo'lmasligi kerak — frontend va backend bu cheklovni tekshiradi.

2) Kirish

- Endpoint: `POST /auth/login`
- Body (JSON): xuddi `register` kabi
- Javob: access token (JWT)

Frontend tokenni localStorage-ga saqlaydi va WebSocket-ga username orqali ulanadi.

3) WebSocket

- Endpoint: `ws://localhost:8000/ws/{username}`
- Masalan: `ws://localhost:8000/ws/samandar`
- WebSocket orqali yuborilgan xabarlar serverda saqlanadi va barcha hozirgi ulashgan mijozlarga broadcast qilinadi.

> Eslatma: hozirgi implementatsiyada WebSocket autentifikatsiyasi token asosida emas — bu keyingi takomillashtirish bo'lishi mumkin (token tekshiruvi, cookie yoki subprotocol orqali yuborish).

## Muhit o'zgaruvchilari va xavfsizlik

- `app/core/security.py` faylida `SECRET_KEY` o'rnatilgan. Ishlab chiqarishda bu qiymatni `.env` faylga yoki muhit o'zgaruvchilariga ko'chiring va loyiha `python-dotenv` yordamida .env-ni yuklasin.
- HTTPS/SSL: ishlab chiqarishda HTTPS bilan joylashtiring.
- CORS: agar frontend boshqa domen/portda bo'lsa, CORS sozlamalarini qo'shing.
- Parol cheklovi: bcrypt algoritmi 72 bayt limitiga ega — bu bilan hisoblashda e'tiborli bo'ling.

## Tez-tez uchraydigan muammolar va ularni hal qilish

1) ValueError: password cannot be longer than 72 bytes
   - Sabab: bcrypt cheklovi. Yechim: parolni 72 baytdan kichik qilib yuboring yoki serverda inputni qirqing (emas, tavsiya etilmaydi). Loyihada frontend va backendda bu tekshirish qo'yilgan.

2) passlib / bcrypt versiya xatolari
   - Agar `passlib` va `bcrypt` kutubxonalari orasida mos kelmaslik bo'lsa, `requirements.txt` faylida mos versiyalar ko'rsatilgan. Virtual muhitni yangilang va `pip install -r requirements.txt` qiling.

3) Circular import (ImportError: cannot import name 'manager')
   - Buni hal qilish uchun global `manager` obyekti `app/core/state.py` da saqlanadi. Agar shu xato chiqsa, fayllarni tahrir qilinganligiga va `state.py` mavjudligiga ishonch hosil qiling.

4) WebSocket: Unexpected ASGI message 'websocket.send', after sending 'websocket.close'
   - Buning sababi: websocket holati allaqachon yopilgan yoki xabar yuborishda xato yuz berdi. Loyihada broadcast va connect metodlari tozalandi va xatolar uchun exception handling qo'shildi.

5) Coroutine was never awaited warning for DB session
   - Buning sababi sync/async session aralash ishlatish. Chat router uchun `AsyncSession` va `async with SessionLocal()` ishlatiladi. Agar bu warning ko'rinsa, `app/routers/chat.py` faylini tekshiring.

## Diagnostika va testlar

- Parol hashing testini ishlatish:

```powershell
python scripts/test_password.py
```
Bu oddiy test parolni hash qiladi va 72 bayt chegarasini tekshiradi.

- DB jadvalini tekshirish (skript):

```powershell
python scripts/list_tables.py
```
Bu `chat.db` dagi jadvallar ro'yxatini chop etadi.

## Rivojlantirish va keyingi qadamlar

- WebSocket autentifikatsiyasini qo'shish (JWT ni WebSocket ulanishiga yuborish va serverda tekshirish)
- Alembic yordamida migratsiyalar qo'shish (havo o'zgartirishlar uchun)
- Yagona frontendi va prod deploy (Dockerfile, gunicorn/uvicorn + nginx)
- Testlarni kengaytirish (pytest — unit va integratsion testlar)

## Xulosa va foydalanish bo'yicha tez yo'l-yo'riq

1. Virtual muhitni yaratish va faollashtirish
2. `pip install -r requirements.txt`
3. `python -m app.core.init_db`
4. `python -m uvicorn app.main:app --reload`
5. Brauzerda `http://127.0.0.1:8000/` oching va chatni sinab ko'ring

## Mualliflik va litsenziya

Loyiha MIT litsenziyasi ostida mavjud (ko'proq ma'lumot `LICENSE` faylida).

---
Agar README ga qo'shimcha bo'limlar yoki tarjima uslubi bo'yicha o'zgarishlar kerak bo'lsa, ayting — men kerakli o'zgartirishlarni kiritaman.
