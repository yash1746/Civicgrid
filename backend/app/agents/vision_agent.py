"""
CivicGrid — Vision Agent
Uses Google Gemini 1.5 Pro to analyze issue images/video frames
and return: category, severity_score (1-10), and a human-readable description.

CRITICAL: This agent NEVER determines location. Coordinates come exclusively
from the frontend (EXIF metadata or browser Geolocation API).
"""
import json
import logging
import time
from typing import Optional
import google.generativeai as genai
from app.config import settings

logger = logging.getLogger(__name__)

# ── Category → Department mapping ──────────────────────────────────────────
CATEGORY_DEPARTMENT_MAP = {
    "pothole":            "Department of Roads & Infrastructure",
    "water_leak":         "Water & Sanitation Authority",
    "broken_streetlight": "Electrical & Public Lighting",
    "garbage_overflow":   "Solid Waste Management",
    "fallen_tree":        "Parks & Urban Forestry",
    "road_damage":        "Department of Roads & Infrastructure",
    "graffiti":           "Public Property & Urban Aesthetics",
    "flooding":           "Stormwater & Drainage Authority",
    "sewage_overflow":    "Water & Sanitation Authority",
    "other":              "General Municipal Services",
}

VALID_CATEGORIES = list(CATEGORY_DEPARTMENT_MAP.keys())

VISION_PROMPT = """
You are a municipal issue classification AI. Analyze this image of a community/civic issue.

Respond with a valid JSON object ONLY (no markdown, no code blocks, no extra text):
{{
  "category": "<one of: pothole, water_leak, broken_streetlight, garbage_overflow, fallen_tree, road_damage, graffiti, flooding, sewage_overflow, other>",
  "severity_score": <integer 1-10, where 1=minor cosmetic, 10=life-threatening hazard>,
  "severity_level": "<one of: low, medium, high, critical>",
  "description": "<2-3 sentence professional description of the issue suitable for a municipal work order>",
  "is_valid_civic_issue": <true|false>
}}

Severity guide:
- 1-3: low  (cosmetic, no immediate safety risk)
- 4-6: medium (moderate inconvenience or slow-developing hazard)
- 7-8: high  (significant safety risk or major infrastructure damage)
- 9-10: critical (imminent danger to life or major utility failure)

If the image does NOT show a civic/community issue, set is_valid_civic_issue to false
and category to "other" with severity_score of 0.
"""

PROOF_VALIDATION_PROMPT = """
You are a municipal work verification AI. You are comparing a BEFORE image (the original issue)
and an AFTER image (submitted as proof of resolution by a field worker).

Respond with a valid JSON object ONLY:
{{
  "is_resolved": <true|false>,
  "confidence_score": <float 0.0-1.0>,
  "validation_notes": "<brief professional assessment of whether the issue appears resolved>",
  "resolution_quality": "<one of: excellent, good, partial, insufficient>"
}}

Be strict: only mark is_resolved as true if the issue clearly appears fixed or resolved.
A partial fix should be flagged as is_resolved: false with resolution_quality: "partial".
"""


class VisionAgent:
    """
    Gemini-powered vision agent for issue categorization and proof validation.
    """

    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
        logger.info(f"VisionAgent initialized with model: {settings.GEMINI_MODEL}")

    def _parse_json_response(self, response_text: str) -> dict:
        """Robustly parse JSON from Gemini response."""
        text = response_text.strip()
        # Strip markdown code fences if present
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1]).strip()
        return json.loads(text)

    async def analyze_issue(
        self,
        image_bytes: bytes,
        mime_type: str = "image/jpeg",
    ) -> dict:
        """
        Analyze an issue image and return structured classification.

        Returns:
            {
                category: str,
                severity_score: int,
                severity_level: str,
                description: str,
                is_valid_civic_issue: bool,
                department: str,
            }
        """
        start = time.monotonic()
        try:
            image_part = {
                "mime_type": mime_type,
                "data": image_bytes,
            }
            response = await self.model.generate_content_async(
                [VISION_PROMPT, image_part],
                generation_config=genai.GenerationConfig(
                    temperature=0.1,  # Low temp for consistent classification
                    max_output_tokens=512,
                ),
            )

            result = self._parse_json_response(response.text)

            # Validate & sanitize category
            category = result.get("category", "other").lower()
            if category not in VALID_CATEGORIES:
                category = "other"

            result["category"] = category
            result["department"] = CATEGORY_DEPARTMENT_MAP[category]

            duration_ms = int((time.monotonic() - start) * 1000)
            logger.info(
                f"VisionAgent.analyze_issue completed in {duration_ms}ms "
                f"| category={category} severity={result.get('severity_score')}"
            )
            return result

        except json.JSONDecodeError as e:
            logger.error(f"VisionAgent JSON parse error: {e}")
            return self._fallback_result()
        except Exception as e:
            logger.error(f"VisionAgent.analyze_issue error: {e}", exc_info=True)
            return self._fallback_result()

    async def validate_proof(
        self,
        before_image_bytes: bytes,
        after_image_bytes: bytes,
        before_mime: str = "image/jpeg",
        after_mime: str = "image/jpeg",
    ) -> dict:
        """
        Compare before/after images to validate proof-of-work.

        Returns:
            {
                is_resolved: bool,
                confidence_score: float,
                validation_notes: str,
                resolution_quality: str,
            }
        """
        start = time.monotonic()
        try:
            before_part = {"mime_type": before_mime, "data": before_image_bytes}
            after_part  = {"mime_type": after_mime,  "data": after_image_bytes}

            response = await self.model.generate_content_async(
                [
                    "BEFORE IMAGE (original issue):",
                    before_part,
                    "AFTER IMAGE (claimed resolution):",
                    after_part,
                    PROOF_VALIDATION_PROMPT,
                ],
                generation_config=genai.GenerationConfig(
                    temperature=0.1,
                    max_output_tokens=256,
                ),
            )

            result = self._parse_json_response(response.text)
            duration_ms = int((time.monotonic() - start) * 1000)
            logger.info(
                f"VisionAgent.validate_proof completed in {duration_ms}ms "
                f"| resolved={result.get('is_resolved')} confidence={result.get('confidence_score')}"
            )
            return result

        except Exception as e:
            logger.error(f"VisionAgent.validate_proof error: {e}", exc_info=True)
            return {
                "is_resolved": False,
                "confidence_score": 0.0,
                "validation_notes": "Validation failed due to processing error. Manual review required.",
                "resolution_quality": "insufficient",
            }

    @staticmethod
    def _fallback_result() -> dict:
        return {
            "category": "other",
            "severity_score": 5,
            "severity_level": "medium",
            "description": "Issue submitted — manual classification required.",
            "is_valid_civic_issue": True,
            "department": CATEGORY_DEPARTMENT_MAP["other"],
        }
