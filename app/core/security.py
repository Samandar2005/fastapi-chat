from datetime import datetime, timedelta
from jose import JWTError, jwt
import bcrypt

SECRET_KEY = "super_secret_key"  # bu keyni .env faylga ko'chirish tavsiya etiladi
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24
SALT_ROUNDS = 12  # Number of rounds for bcrypt

def hash_password(password: str) -> str:
    if len(password.encode()) > 72:
        raise ValueError("Password too long - must be less than 72 bytes when encoded")
    salt = bcrypt.gensalt(rounds=SALT_ROUNDS)
    hashed = bcrypt.hashpw(password.encode(), salt)
    return hashed.decode()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode(),
            hashed_password.encode()
        )
    except ValueError:
        return False  # Password too long or invalid format

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
