from bson import ObjectId
from fastapi import APIRouter
from pydantic import BaseModel

from database import get_db
from embeddings import get_embedding
from vector_index import vector_index

router = APIRouter(prefix="/api/search", tags=["search"])


class SearchRequest(BaseModel):
    query: str
    top_k: int = 20
    session_id: str = None
    service: str = None
    severity: str = None


@router.post("")
async def semantic_search(req: SearchRequest):
    db = get_db()
    embedding = await get_embedding(req.query)
    # Oversample to allow post-filtering by session/service/severity
    raw_results = await vector_index.search(embedding, top_k=req.top_k * 4)
    if not raw_results:
        return {"results": []}

    score_map = {r[0]: r[1] for r in raw_results}
    mongo_ids = [ObjectId(r[0]) for r in raw_results]

    query: dict = {"_id": {"$in": mongo_ids}}
    if req.session_id:
        query["session_id"] = req.session_id
    if req.service:
        query["service"] = req.service
    if req.severity:
        query["severity"] = req.severity

    entries = await db.log_entries.find(query, {"embedding": 0}).to_list(req.top_k)
    for e in entries:
        e["_id"] = str(e["_id"])
        e["score"] = score_map.get(e["_id"], 0.0)

    entries.sort(key=lambda x: x["score"], reverse=True)
    return {"results": entries[: req.top_k]}
