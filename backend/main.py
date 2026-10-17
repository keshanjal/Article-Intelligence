from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from schemas import TextSummarizeRequest, UrlSummarizeRequest, SummarizeResponse, ChatRequest
from services.extractor import ContentExtractor
from services.summarizer import SummarizerService

app = FastAPI(title="Multilingual AI Article Summarizer Backend", version="1.0.0")

@app.get("/")
def read_root():
    return {
        "message": "AI Summarizer Backend API is running",
        "docs_url": "http://localhost:8000/docs"
    }

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    # http://localhost:5173", "http://127.0.0.1:5173
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "summarizer-api"}

@app.post("/api/summarize/text", response_model=SummarizeResponse)
async def summarize_text(req: TextSummarizeRequest):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Article text cannot be empty.")

    summary = await SummarizerService.process_summary(
        text=req.content, target_language=req.target_language,
        length_format=req.length_format, reading_level=req.reading_level
    )

    return SummarizeResponse(
        original_text_preview=req.content[:200] + "...",
        full_text=req.content,
        summary=summary, language=req.target_language,
        length_format=req.length_format, word_count_original=len(req.content.split())
    )

@app.post("/api/summarize/url", response_model=SummarizeResponse)
async def summarize_url(req: UrlSummarizeRequest):
    try:
        extracted_text = ContentExtractor.extract_from_url(req.url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to extract URL content: {str(e)}")

    summary = await SummarizerService.process_summary(
        text=extracted_text, target_language=req.target_language,
        length_format=req.length_format, reading_level=req.reading_level
    )

    return SummarizeResponse(
        original_text_preview=extracted_text[:200] + "...",
        full_text=extracted_text,
        summary=summary, language=req.target_language,
        length_format=req.length_format, word_count_original=len(extracted_text.split())
    )

@app.post("/api/summarize/file", response_model=SummarizeResponse)
async def summarize_file(
    file: UploadFile = File(...), target_language: str = Form("English"),
    length_format: str = Form("Short"), reading_level: str = Form("General Public")
):
    try:
        content = await file.read()
        extracted_text = ContentExtractor.extract_from_file(file.filename, content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File parsing error: {str(e)}")

    summary = await SummarizerService.process_summary(
        text=extracted_text, target_language=target_language,
        length_format=length_format, reading_level=reading_level
    )

    return SummarizeResponse(
        original_text_preview=extracted_text[:200] + "...",
        full_text=extracted_text,
        summary=summary, language=target_language,
        length_format=length_format, word_count_original=len(extracted_text.split())
    )

@app.post("/api/chat")
async def chat_article(req: ChatRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
        
    answer = await SummarizerService.chat_with_article(
        article_text=req.article_text,
        question=req.question,
        target_language=req.language
    )
    return {"answer": answer}