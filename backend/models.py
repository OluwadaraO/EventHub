from pydantic import BaseModel, EmailStr

class RegisterIn(BaseModel):
    name: str | None = None
    email: EmailStr
    password: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    name: str | None = None
    email: EmailStr
