import os
import uuid
import logging
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from fastapi import Depends
from backend.app.database import get_db
from backend.app.models import ScanRecord
from backend.app.config import UPLOADS_PATH, MAX_FILE_SIZE_MB, SUPPORTED_EXTENSIONS
from backend.app.engine.parsing.formatter import format_text_with_llm
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)

os.makedirs(UPLOADS_PATH, exist_ok=True)


@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    job_description: str = Form(...),
    scan_name: str = Form(default=""),
    db: Session = Depends(get_db),
):
    filename = file.filename or "resume"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type not supported. Use PDF or DOCX. Got: {ext}")

    if len(job_description.strip()) < 50:
        raise HTTPException(status_code=400, detail="Job description must be at least 50 characters.")

    content = await file.read()
    file_size_mb = len(content) / (1024 * 1024)
    if file_size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(status_code=400, detail=f"File too large. Max size is {MAX_FILE_SIZE_MB}MB. Got {file_size_mb:.1f}MB.")

    scan_id = str(uuid.uuid4())
    safe_filename = f"{scan_id}_{filename}"
    file_path = os.path.join(UPLOADS_PATH, safe_filename)

    with open(file_path, "wb") as f:
        f.write(content)

    clean_name = scan_name.strip() or None

    record = ScanRecord(
        scan_id=scan_id,
        scan_name=clean_name,
        filename=filename,
        file_type=ext.lstrip("."),
        file_size_mb=round(file_size_mb, 3),
        jd_length=len(job_description),
        jd_text=job_description,
        file_path=file_path,
        status="uploaded",
    )
    db.add(record)
    db.commit()

    logger.info("Uploaded resume: %s (%s, %.1fMB) scan_name=%s", filename, ext, file_size_mb, clean_name)

    return {
        "scan_id": scan_id,
        "scan_name": clean_name,
        "filename": filename,
        "file_type": ext.lstrip("."),
        "file_size_mb": round(file_size_mb, 3),
        "jd_length": len(job_description),
        "status": "uploaded",
    }

@router.post("/parse")
async def parse_resume_endpoint(file: UploadFile = File(...)):
    filename = file.filename or "resume"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type not supported. Got: {ext}")

    content = await file.read()
    temp_id = str(uuid.uuid4())
    temp_path = os.path.join(UPLOADS_PATH, f"temp_{temp_id}{ext}")
    
    with open(temp_path, "wb") as f:
        f.write(content)
        
    try:
        from backend.app.engine.parsing import parser
        parsed = parser.parse_resume(temp_path)
        raw_text = parsed["raw_text"]
        
        # Bypass LLM formatting and use native rich text extraction from parser
        structured_html = parsed.get("rich_text") or f"<p style='white-space: pre-wrap;'>{parsed['raw_text']}</p>"
        
        return {"text": structured_html}
    except Exception as e:
        logger.error("Error parsing resume temp file: %s", e)
        raise HTTPException(status_code=422, detail=f"Could not parse resume: {e}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

class FormatJDRequest(BaseModel):
    jd_text: str

@router.post("/format_jd")
async def format_jd_endpoint(req: FormatJDRequest):
    if not req.jd_text or len(req.jd_text.strip()) < 50:
        raise HTTPException(status_code=400, detail="JD text is too short")
    
    structured_html = format_text_with_llm(req.jd_text, doc_type="job description")
    return {"text": structured_html}
