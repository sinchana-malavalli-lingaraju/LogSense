from fastapi import APIRouter

from database import get_db

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("")
async def get_analytics(session_id: str = None):
    db = get_db()
    match = {"session_id": session_id} if session_id else {}

    services, severities, top_errors, components, hostnames, total = await _run_all(db, match)

    return {
        "total_logs": total,
        "services": [{"name": s["_id"] or "unknown", "count": s["count"]} for s in services],
        "severities": [{"name": s["_id"], "count": s["count"]} for s in severities],
        "top_errors": [
            {"message": e["_id"], "count": e["count"], "service": e["service"]}
            for e in top_errors
        ],
        "components": [{"name": c["_id"] or "unknown", "count": c["count"]} for c in components],
        "hostnames": [{"name": h["_id"] or "unknown", "count": h["count"]} for h in hostnames],
    }


async def _run_all(db, match: dict):
    pipeline_services = [
        {"$match": match},
        {"$group": {"_id": "$service", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 15},
    ]
    pipeline_severities = [
        {"$match": match},
        {"$group": {"_id": "$severity", "count": {"$sum": 1}}},
    ]
    pipeline_errors = [
        {"$match": {**match, "severity": "ERROR"}},
        {"$group": {"_id": "$message", "count": {"$sum": 1}, "service": {"$first": "$service"}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    pipeline_components = [
        {"$match": match},
        {"$group": {"_id": "$component", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    pipeline_hostnames = [
        {"$match": match},
        {"$group": {"_id": "$hostname", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]

    services = await db.log_entries.aggregate(pipeline_services).to_list(15)
    severities = await db.log_entries.aggregate(pipeline_severities).to_list(10)
    top_errors = await db.log_entries.aggregate(pipeline_errors).to_list(10)
    components = await db.log_entries.aggregate(pipeline_components).to_list(10)
    hostnames = await db.log_entries.aggregate(pipeline_hostnames).to_list(10)
    total = await db.log_entries.count_documents(match)

    return services, severities, top_errors, components, hostnames, total
