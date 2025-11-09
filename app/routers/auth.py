from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.future import select
from app.models import User
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register")
async def register(username: str, password: str, db=Depends(get_db)):
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user:
        raise HTTPException(status_code=400, detail="Username already taken")

    new_user = User(username=username, hashed_password=hash_password(password))
    db.add(new_user)
    await db.commit()
    return {"message": "User registered successfully"}

@router.post("/login")
async def login(username: str, password: str, db=Depends(get_db)):
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}
