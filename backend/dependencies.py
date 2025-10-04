from fastapi import Depends
from prisma.prisma_client  import Prisma
from db import db

async def get_db() -> Prisma:
    return db
