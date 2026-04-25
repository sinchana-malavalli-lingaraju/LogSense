from bson import ObjectId
from fastapi import APIRouter
from pydantic import BaseModel

from database import get_db
from embeddings import get_embedding
from rag import chat_with_context
from vector_index import vector_index

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []
    session_id: str = None


@router.post("")
async def chat(req: ChatRequest):
    db = get_db()
    embedding = await get_embedding(req.message)
    results = await vector_index.search(embedding, top_k=15)

    if not results:
        return {
            "response": "No logs have been ingested yet. Please upload a log file first.",
            "context": [],
        }

    score_map = {r[0]: r[1] for r in results}
    mongo_ids = [ObjectId(r[0]) for r in results]
    query: dict = {"_id": {"$in": mongo_ids}}
    if req.session_id:
        query["session_id"] = req.session_id

    context = await db.log_entries.find(query, {"embedding": 0}).to_list(15)
    context.sort(key=lambda x: x["line_number"])
    for e in context:
        e["_id"] = str(e["_id"])

    answer = await chat_with_context(req.message, context, req.history)
    return {"response": answer, "context": context}
