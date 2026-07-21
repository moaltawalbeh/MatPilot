"""AI Chat API endpoint using Groq for MatPilot."""

import os
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(tags=["Chat"])

SYSTEM_PROMPT = """You are MatPilot AI Assistant, a specialized expert in materials science, crystallography, and materials characterization. You are part of the MatPilot platform — a cloud-based tool for materials research.

Your expertise covers:
- Materials science fundamentals (structure–property–processing relationships)
- Crystallography (space groups, unit cells, crystal systems, Miller indices)
- X-ray diffraction (XRD) interpretation and analysis
- Rietveld refinement concepts and metrics (Rwp, Rp, Chi², GoF) — you explain results, you do NOT perform refinements
- Phase identification and composition analysis
- PDF (Pair Distribution Function) analysis
- Microscopy techniques (SEM, TEM, AFM)
- Spectroscopy (XPS, FTIR, Raman, EDS)
- Thermodynamic and mechanical properties of materials

Guidelines:
- Provide clear, scientifically accurate answers.
- When explaining refinement results, help users understand what Rwp, Rp, Chi², and GoF mean and whether their values are acceptable.
- You help users interpret and understand their experimental data — you do NOT execute refinements or calculations.
- If a user provides experimental context, use it to give more targeted answers.
- Keep responses concise but thorough. Use bullet points for clarity when appropriate.
- If unsure about something, say so rather than guessing.
- Respond in the same language the user writes in."""

MAX_HISTORY = 20
MAX_TOKENS = 1024


class ChatMessage(BaseModel):
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    message: str = Field(..., description="User message")
    conversation_history: Optional[list[ChatMessage]] = Field(
        default=None,
        description="Optional conversation history for multi-turn context",
    )


class ChatResponse(BaseModel):
    response: str
    model: str
    tokens_used: Optional[int] = None


@router.post("/chat/message", response_model=ChatResponse)
async def send_message(req: ChatRequest):
    """Send a message and receive an AI response from the MatPilot assistant."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return ChatResponse(
            response="AI chat is not configured. The GROQ_API_KEY environment variable is missing.",
            model="none",
        )

    try:
        from groq import Groq
    except ImportError:
        return ChatResponse(
            response="AI chat is unavailable. The groq package is not installed on the server.",
            model="none",
        )

    messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]

    if req.conversation_history:
        trimmed = req.conversation_history[-MAX_HISTORY:]
        for msg in trimmed:
            messages.append({"role": msg.role, "content": msg.content})

    messages.append({"role": "user", "content": req.message})

    try:
        client = Groq(api_key=api_key)
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=MAX_TOKENS,
            temperature=0.7,
        )
        reply = completion.choices[0].message.content
        tokens = getattr(completion.usage, "total_tokens", None)
        return ChatResponse(response=reply, model="llama-3.3-70b-versatile", tokens_used=tokens)
    except Exception as exc:
        return ChatResponse(
            response=f"An error occurred while contacting the AI service: {exc}",
            model="llama-3.3-70b-versatile",
        )
