import asyncio
import uuid
from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, HTTPException, UploadFile, File

from database import get_db
from embeddings import get_embeddings_batch
from log_parser import parse_line
from vector_index import vector_index

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.post("/upload")
async def upload_log(file: UploadFile = File(...)):
    if not (file.filename.endswith(".txt") or file.filename.endswith(".log")):
        raise HTTPException(400, "Only .txt and .log files are supported")

    db = get_db()
    session_id = str(uuid.uuid4())
    content = await file.read()
    lines = content.decode("utf-8", errors="replace").splitlines()

    await db.ingestion_sessions.insert_one({
        "session_id": session_id,
        "filename": file.filename,
        "total_lines": len(lines),
        "parsed_lines": 0,
        "status": "processing",
        "uploaded_at": datetime.utcnow(),
    })

    asyncio.create_task(_process(session_id, lines, file.filename, db))
    return {"session_id": session_id, "total_lines": len(lines), "status": "processing"}


async def _process(session_id: str, lines: list[str], filename: str, db):
    batch_size = 100
    parsed_total = 0

    try:
        for i in range(0, len(lines), batch_size):
            batch = [parse_line(l, i + j + 1) for j, l in enumerate(lines[i:i + batch_size]) if parse_line(l, i + j + 1)]
            if not batch:
                continue

            texts = [p["message"] or p["raw"] for p in batch]
            embeddings = await get_embeddings_batch(texts, concurrency=5)

            docs = [
                {**p, "session_id": session_id, "filename": filename,
                 "embedding": emb, "uploaded_at": datetime.utcnow()}
                for p, emb in zip(batch, embeddings)
            ]

            result = await db.log_entries.insert_many(docs)
            mongo_ids = [str(oid) for oid in result.inserted_ids]
            faiss_ids = await vector_index.add(mongo_ids, embeddings)

            # Store faiss_id back so index can be rebuilt on next startup
            for oid, fid in zip(result.inserted_ids, faiss_ids):
                await db.log_entries.update_one({"_id": oid}, {"$set": {"faiss_id": fid}})

            parsed_total += len(batch)

        await db.ingestion_sessions.update_one(
            {"session_id": session_id},
            {"$set": {"parsed_lines": parsed_total, "status": "completed"}},
        )
    except Exception as exc:
        await db.ingestion_sessions.update_one(
            {"session_id": session_id},
            {"$set": {"status": "failed", "error": str(exc)}},
        )


@router.get("/sessions")
async def list_sessions():
    db = get_db()
    sessions = await db.ingestion_sessions.find({}).sort("uploaded_at", -1).to_list(50)
    for s in sessions:
        s["_id"] = str(s["_id"])
    return sessions


@router.get("/sessions/{session_id}/status")
async def session_status(session_id: str):
    db = get_db()
    session = await db.ingestion_sessions.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(404, "Session not found")
    session["_id"] = str(session["_id"])
    return session


@router.get("")
async def get_logs(
    session_id: str = None,
    service: str = None,
    severity: str = None,
    page: int = 1,
    limit: int = 50,
):
    db = get_db()
    query = {}
    if session_id:
        query["session_id"] = session_id
    if service:
        query["service"] = service
    if severity:
        query["severity"] = severity

    skip = (page - 1) * limit
    total = await db.log_entries.count_documents(query)
    entries = await (
        db.log_entries.find(query, {"embedding": 0})
        .sort("line_number", 1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )
    for e in entries:
        e["_id"] = str(e["_id"])
    return {"total": total, "page": page, "limit": limit, "entries": entries}
