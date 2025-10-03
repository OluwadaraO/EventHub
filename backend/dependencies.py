from fastapi import Depends
from prisma import Prisma
from main import db

async def get_db() -> Prisma:
    return db
