import httpx
from config import settings

_SYSTEM = """You are LogSense, an expert debugging assistant specializing in system log analysis.
You help engineers perform root-cause analysis on ILO/BMC firmware and system logs.

Guidelines:
- Identify error patterns and their root causes from the provided log context
- Explain what each service and component does (e.g. svcsHost, evtsrv, compauth, restserver)
- Suggest likely causes and concrete next debugging steps
- Reference specific line numbers when relevant
- Be concise and technical — your audience is hardware/firmware engineers
- Only use information from the provided log context; if uncertain, say so"""


async def chat_with_context(question: str, context_logs: list[dict], history: list[dict]) -> str:
    context_text = "\n".join(
        f"[Line {e['line_number']}] {e['raw']}" for e in context_logs
    )

    user_message = (
        f"Relevant log entries:\n```\n{context_text}\n```\n\nQuestion: {question}"
    )

    messages = [{"role": "system", "content": _SYSTEM}]
    for h in history[-6:]:  # last 3 turns of context
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": user_message})

    async with httpx.AsyncClient(timeout=180.0) as client:
        response = await client.post(
            f"{settings.ollama_url}/api/chat",
            json={"model": settings.ollama_chat_model, "messages": messages, "stream": False},
        )
        response.raise_for_status()
        return response.json()["message"]["content"]
