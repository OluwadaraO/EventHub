from datetime import datetime, timedelta, timezone
from jose import jwt
from passlib.context import CryptContext
import os

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_SECRET = os.getenv("JWT_SECRET", "supersecret")
JWT_ALG = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_MIN = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(sub: str):
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_MIN)
    payload = {"sub": sub, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def decode_access_token(token: str) -> dict:
    """
    Decode JWT and return the payload.
    Raises JWTError if invalid/expired.
    """
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    return payload