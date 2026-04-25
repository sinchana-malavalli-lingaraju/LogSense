from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import close_db, connect_db, get_db
from routers import analytics, chat, logs, search
from vector_index import vector_index


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    await vector_index.build_from_db(get_db())
    yield
    await close_db()


app = FastAPI(title="LogSense API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(logs.router)
app.include_router(search.router)
app.include_router(chat.router)
app.include_router(analytics.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
