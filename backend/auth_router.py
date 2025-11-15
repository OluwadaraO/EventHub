from fastapi import APIRouter, Depends, HTTPException, status
from prisma.prisma_client import Prisma
from models import RegisterIn, LoginIn, UserOut
from security import hash_password, verify_password, create_access_token
from dependencies import get_db
from security_deps import get_current_user_email

router = APIRouter(tags=["auth"])

@router.post("/register", response_model=UserOut, status_code=201)
async def register(data: RegisterIn, db: Prisma = Depends(get_db)):
    try:
        existing = await db.user.find_unique(where={"email": data.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        hashed = hash_password(data.password)
        user = await db.user.create(
            data={
                "name": data.name,
                "email": data.email,
                "passwordHash": hashed,
            }
        )
        return UserOut(id=user.id, name=user.name, email=user.email)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Register failed: {str(e)}")


@router.post("/login")
async def login(data: LoginIn, db: Prisma = Depends(get_db)):
    user = await db.user.find_unique(where={"email": data.email})
    if not user or not verify_password(data.password, user.passwordHash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token = create_access_token(user.email)
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me")
async def get_me(
    user_email: str = Depends(get_current_user_email),
    db: Prisma = Depends(get_db)
):
    user = await db.user.find_unique(where={"email": user_email})
    if not user:
        raise HTTPException(404, "User not found")

    return {"id": user.id, "name": user.name, "email": user.email}