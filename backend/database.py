from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from config import settings

client: AsyncIOMotorClient = None
db: AsyncIOMotorDatabase = None


async def connect_db():
    global client, db
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.mongodb_db]
    await db.log_entries.create_index([("session_id", 1)])
    await db.log_entries.create_index([("service", 1)])
    await db.log_entries.create_index([("severity", 1)])
    await db.log_entries.create_index([("faiss_id", 1)])
    await db.ingestion_sessions.create_index([("session_id", 1)], unique=True)


async def close_db():
    if client:
        client.close()


def get_db() -> AsyncIOMotorDatabase:
    return db
