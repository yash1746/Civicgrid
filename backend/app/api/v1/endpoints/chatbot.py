import base64
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
import google.generativeai as genai
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

class ChatbotQueryRequest(BaseModel):
    text: str
    image_base64: Optional[str] = None  # Base64 data URL e.g. "data:image/jpeg;base64,..."

# System instructions to configure the chatbot's role
SYSTEM_INSTRUCTION = """
You are CivicGrid AI, an intelligent community and municipal assistant.
You help citizens report and track community issues, explain Civic Trust scores, guide users through incident reporting procedures, and explain SLA deadlines.
Keep your responses professional, helpful, concise, and focused on civic/community matters.
"""

@router.post("/query")
async def query_chatbot(body: ChatbotQueryRequest):
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        # Use gemini-1.5-flash for super-fast interactive chat responses
        model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL,
            system_instruction=SYSTEM_INSTRUCTION
        )
        
        contents = []
        if body.image_base64:
            # Parse base64 string
            header, encoded = body.image_base64.split(",", 1) if "," in body.image_base64 else ("", body.image_base64)
            mime_type = "image/jpeg"
            if "image/png" in header:
                mime_type = "image/png"
            elif "image/webp" in header:
                mime_type = "image/webp"
            
            image_data = base64.b64decode(encoded)
            contents.append({
                "mime_type": mime_type,
                "data": image_data
            })
            
        # Add text prompt
        contents.append(body.text if body.text else "Analyze this image.")
        
        response = model.generate_content(contents)
        
        return {"reply": response.text}
        
    except Exception as e:
        logger.error(f"Chatbot query failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chatbot failed to respond: {str(e)}"
        )
