from pydantic import BaseModel, HttpUrl
from typing import Optional, Literal

class TextSummarizeRequest(BaseModel):
    content: str
    target_language: str = "English"
    length_format: Literal["Short", "Detailed", "Key points"] = "Short"
    reading_level: str = "General Public"

class UrlSummarizeRequest(BaseModel):
    url: HttpUrl
    target_language: str = "English"
    length_format: Literal["Short", "Detailed", "Key points"] = "Short"
    reading_level: str = "General Public"

class SummarizeResponse(BaseModel):
    original_text_preview: str
    full_text: str  # Allows the React frontend to cache the article for chat
    summary: str
    language: str
    length_format: str
    word_count_original: int

class ChatRequest(BaseModel):
    article_text: str
    question: str
    language: str = "English"