"""
Photo/Voice to ML Pipeline
Processes meal photos (OCR + ML vision) and voice inputs for meal logging.
Integrates with ML inference service for carb estimation and food recognition.
"""

import asyncio
import base64
import hashlib
import io
import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any, Tuple
from PIL import Image
import numpy as np
import aiohttp
import pytesseract
from PIL import Image

logger = logging.getLogger(__name__)

class MediaType(str, Enum):
    PHOTO = "photo"
    VOICE = "voice"

class ProcessingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class MediaInput:
    id: str
    user_id: str
    media_type: MediaType
    data: bytes
    mime_type: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)

@dataclass
class ProcessingResult:
    id: str
    input_id: str
    status: ProcessingStatus
    items: List[Dict[str, Any]] = field(default_factory=list)
    total_carbs: float = 0.0
    total_protein: float = 0.0
    total_fat: float = 0.0
    confidence: float = 0.0
    processing_time_ms: float = 0.0
    error: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)

@dataclass
class FoodItem:
    food_id: Optional[str] = None
    name: str = ""
    name_localized: Optional[str] = None
    quantity_g: float = 100.0
    prep_method: str = "boiled"
    carbs_g: float = 0.0
    protein_g: float = 0.0
    fat_g: float = 0.0
    fiber_g: float = 0.0
    confidence: float = 0.0
    source: str = "ml"  # ml, ocr, manual, composite

class MediaPipeline:
    """Processes meal photos and voice inputs through OCR/ML pipeline."""
    
    def __init__(self, 
                 ml_service_url: str = "http://localhost:8000",
                 ml_api_key: str = "dev-key",
                 tesseract_path: str = None):
        self.ml_service_url = ml_service_url
        self.ml_api_key = ml_api_key
        self.session: Optional[aiohttp.ClientSession] = None
        
        # Configure Tesseract
        if tesseract_path:
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
        
        # Hindi/English OCR config
        self.ocr_config = {
            'lang': 'hin+eng',
            'config': '--psm 6 --oem 3',
        }
        
        # Indian food keywords for OCR post-processing
        self.indian_food_keywords = {
            'hindi': [
                'राजमा', 'चावल', 'रोटी', 'दाल', 'सब्जी', 'आलू', 'पनीर', 'चिकन',
                'मछली', 'अंडा', 'दही', 'दूध', 'घी', 'तेल', 'नमक', 'मिर्च',
                'हल्दी', 'धनिया', 'जीरा', 'अदरक', 'लहसुन', 'प्याज', 'टमाटर',
                'भिंडी', 'बैंगन', 'कद्दू', 'लौकी', 'तोरई', 'परवल', 'करेला',
                'पालक', 'मेथी', 'सरसों', 'बथुआ', 'चौलाई', 'सोया', 'मटर',
                'गाजर', 'मूली', 'शलजम', 'चुकंदर', 'खीरा', 'ककड़ी', 'नींबू',
                'आम', 'केला', 'सेब', 'अनार', 'अंगूर', 'संतरा', 'मौसमी',
                'पपीता', 'अनानास', 'लीची', 'जामुन', 'शरीफा', 'सीताफल',
                'पोहा', 'उपमा', 'इडली', 'डोसा', 'सांभर', 'चटनी', 'वडा',
                'उत्तपम', 'पोंगल', 'खिचड़ी', 'बिसी बेले बाथ', 'रसम',
                'पराठा', 'पूरी', 'भटूरा', 'नान', 'कुलचा', 'रुमाली रोटी',
                'बिरयानी', 'पुलाव', 'तहरी', 'खीर', 'हलवा', 'लड्डू',
                'गुलाब जामुन', 'जलेबी', 'रसगुल्ला', 'संदेश', 'रसमलाई',
                'पेड़ा', 'बर्फी', 'काजू कतली', 'सूजी हलवा', 'गाजर हलवा',
            ],
            'english': [
                'rajma', 'chawal', 'roti', 'dal', 'sabzi', 'aloo', 'paneer', 'chicken',
                'fish', 'egg', 'curd', 'milk', 'ghee', 'oil', 'salt', 'chili',
                'turmeric', 'coriander', 'cumin', 'ginger', 'garlic', 'onion', 'tomato',
                'okra', 'brinjal', 'pumpkin', 'bottle gourd', 'ridge gourd', 'parwal', 'bitter gourd',
                'spinach', 'fenugreek', 'mustard', 'bathua', 'amaranth', 'soya', 'peas',
                'carrot', 'radish', 'turnip', 'beetroot', 'cucumber', 'cucumber', 'lemon',
                'mango', 'banana', 'apple', 'pomegranate', 'grapes', 'orange', 'mosambi',
                'papaya', 'pineapple', 'lychee', 'jamun', 'custard apple', 'sitaphal',
                'poha', 'upma', 'idli', 'dosa', 'sambar', 'chutney', 'vada',
                'uttapam', 'pongal', 'khichdi', 'bisi bele bath', 'rasam',
                'paratha', 'puri', 'bhature', 'naan', 'kulcha', 'rumali roti',
                'biryani', 'pulao', 'tehri', 'kheer', 'halwa', 'laddu',
                'gulab jamun', 'jalebi', 'rasgulla', 'sandesh', 'rasmalai',
                'peda', 'barfi', 'kaju katli', 'suji halwa', 'gajar halwa',
            ]
        }
        
        # Composite meal patterns
        self.composite_patterns = {
            'rajma_chawal': ['rajma', 'chawal', 'chawal'],
            'chole_bhature': ['chole', 'bhature', 'bhature'],
            'dal_chawal': ['dal', 'chawal', 'chawal'],
            'roti_sabzi': ['roti', 'sabzi', 'sabzi'],
            'dal_roti': ['dal', 'roti', 'roti'],
            'chole_chawal': ['chole', 'chawal', 'chawal'],
            'kadhi_chawal': ['kadhi', 'chawal', 'chawal'],
            'pav_bhaji': ['pav', 'bhaji', 'bhaji'],
            'vada_pav': ['vada', 'pav', 'pav'],
            'idli_sambar': ['idli', 'sambar', 'sambar'],
            'dosa_sambar': ['dosa', 'sambar', 'sambar'],
            'puri_bhaji': ['puri', 'bhaji', 'bhaji'],
            'chole_bhature': ['chole', 'bhature', 'bhature'],
        }
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def _ensure_session(self):
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
    
    # ============================================
    # PHOTO PROCESSING
    # ============================================
    
    async def process_photo(self, media: MediaInput) -> ProcessingResult:
        """Process meal photo through OCR + ML vision pipeline."""
        start_time = time.time()
        result = ProcessingResult(
            id=str(uuid.uuid4()),
            input_id=media.id,
            status=ProcessingStatus.PROCESSING,
        )
        
        try:
            # Load image
            image = Image.open(io.BytesIO(media.data))
            
            # Run OCR and ML vision in parallel
            ocr_task = asyncio.create_task(self._run_ocr(image))
            ml_task = asyncio.create_task(self._run_ml_vision(media.data))
            
            ocr_result, ml_result = await asyncio.gather(ocr_task, ml_task)
            
            # Fuse results
            fused_items = self._fuse_results(ocr_result, ml_result)
            
            # Calculate totals
            total_carbs = sum(item.carbs_g for item in fused_items)
            total_protein = sum(item.protein_g for item in fused_items)
            total_fat = sum(item.fat_g for item in fused_items)
            avg_confidence = np.mean([item.confidence for item in fused_items]) if fused_items else 0
            
            result.items = [
                {
                    "food_id": item.food_id,
                    "name": item.name,
                    "name_localized": item.name_localized,
                    "quantity_g": item.quantity_g,
                    "prep_method": item.prep_method,
                    "carbs_g": item.carbs_g,
                    "protein_g": item.protein_g,
                    "fat_g": item.fat_g,
                    "fiber_g": item.fiber_g,
                    "confidence": item.confidence,
                    "source": item.source,
                }
                for item in fused_items
            ]
            result.total_carbs = round(total_carbs, 1)
            result.total_protein = round(total_protein, 1)
            result.total_fat = round(total_fat, 1)
            result.confidence = round(avg_confidence, 2)
            result.status = ProcessingStatus.COMPLETED
            
        except Exception as e:
            logger.error(f"Photo processing failed: {e}")
            result.status = ProcessingStatus.FAILED
            result.error = str(e)
        
        result.processing_time_ms = round((time.time() - start_time) * 1000, 1)
        return result
    
    async def _run_ocr(self, image: Image.Image) -> Dict:
        """Run Tesseract OCR on image."""
        try:
            # Preprocess image for better OCR
            processed = self._preprocess_for_ocr(image)
            
            # Run Tesseract
            text = pytesseract.image_to_string(processed, **self.ocr_config)
            
            # Parse food items from text
            items = self._parse_ocr_text(text)
            
            return {
                "text": text,
                "items": items,
                "confidence": 0.7,  # OCR confidence
            }
        except Exception as e:
            logger.warning(f"OCR failed: {e}")
            return {"text": "", "items": [], "confidence": 0.0}
    
    def _preprocess_for_ocr(self, image: Image.Image) -> Image.Image:
        """Preprocess image for better OCR results."""
        # Convert to grayscale
        if image.mode != 'L':
            image = image.convert('L')
        
        # Resize if too small
        width, height = image.size
        if width < 800:
            scale = 800 / width
            new_size = (int(width * scale), int(height * scale))
            image = image.resize(new_size, Image.LANCZOS)
        
        # Enhance contrast
        from PIL import ImageEnhance
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.5)
        
        # Sharpen
        enhancer = ImageEnhance.Sharpness(image)
        image = enhancer.enhance(2.0)
        
        return image
    
    def _parse_ocr_text(self, text: str) -> List[Dict]:
        """Parse OCR text to extract food items."""
        items = []
        text_lower = text.lower()
        
        # Search for Indian food keywords
        for lang, keywords in self.indian_food_keywords.items():
            for keyword in keywords:
                if keyword.lower() in text_lower:
                    # Try to find quantity near keyword
                    qty = self._extract_quantity_near(text, keyword)
                    items.append({
                        "name": keyword,
                        "quantity_g": qty,
                        "confidence": 0.6,
                        "source": "ocr",
                        "language": lang,
                    })
        
        # Try to find composite meals
        for composite, components in self.composite_patterns.items():
            if all(c in text_lower for c in components):
                items.append({
                    "name": composite.replace('_', ' '),
                    "quantity_g": 350,  # typical serving
                    "confidence": 0.8,
                    "source": "ocr_composite",
                })
        
        return items
    
    def _extract_quantity_near(self, text: str, keyword: str) -> float:
        """Extract quantity mentioned near a keyword."""
        import re
        keyword_pos = text.lower().find(keyword.lower())
        if keyword_pos == -1:
            return 100.0  # default
        
        # Look for numbers near keyword (±50 chars)
        start = max(0, keyword_pos - 50)
        end = min(len(text), keyword_pos + len(keyword) + 50)
        context = text[start:end]
        
        # Find numbers
        numbers = re.findall(r'\b(\d+(?:\.\d+)?)\s*(?:g|gm|gram|kg|किलो|ग्राम)?\b', context)
        if numbers:
            return float(numbers[0])
        
        # Look for Hindi numbers
        hindi_numbers = re.findall(r'[०-९]+', context)
        if hindi_numbers:
            # Convert Devanagari to Arabic
            hindi_to_arabic = str.maketrans('०१२३४५६७८९', '0123456789')
            return float(hindi_numbers[0].translate(hindi_to_arabic))
        
        return 100.0
    
    async def _run_ml_vision(self, image_bytes: bytes) -> Dict:
        """Call ML service for food recognition and carb estimation."""
        try:
            import base64
            base64_image = base64.b64encode(image_bytes).decode('utf-8')
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.ml_service_url}/v1/predict/carbs",
                    json={"imageBase64": base64_image},
                    headers={"X-API-Key": self.ml_api_key},
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as resp:
                    if resp.status == 200:
                        return await resp.json()
        except Exception as e:
            logger.warning(f"ML vision failed: {e}")
        
        return {"foodClass": "unknown", "foodClassConfidence": 0.0, "portionG": 0, "carbsG": 0, "carbsConfidence": 0.0}
    
    def _fuse_results(self, ocr_result: Dict, ml_result: Dict) -> List[FoodItem]:
        """Fuse OCR and ML vision results using confidence weighting."""
        items = []
        
        # Process OCR items
        for ocr_item in ocr_result.get("items", []):
            items.append(FoodItem(
                name=ocr_item.get("name", ""),
                quantity_g=ocr_item.get("quantity_g", 100),
                confidence=ocr_item.get("confidence", 0.5),
                source="ocr",
            ))
        
        # Process ML result
        if ml_result.get("foodClass") and ml_result["foodClass"] != "unknown":
            ml_item = FoodItem(
                name=ml_result["foodClass"],
                quantity_g=ml_result.get("portionG", 100),
                carbs_g=ml_result.get("carbsG", 0),
                confidence=ml_result.get("carbsConfidence", 0.5),
                source="ml",
            )
            
            # Check if ML result matches any OCR item
            matched = False
            for item in items:
                if self._names_match(item.name, ml_item.name):
                    # Fuse: weight by confidence
                    total_conf = item.confidence + ml_item.confidence
                    if total_conf > 0:
                        item.carbs_g = (item.carbs_g * item.confidence + ml_item.carbs_g * ml_item.confidence) / total_conf
                        item.confidence = min(0.95, total_conf)
                    matched = True
                    break
            
            if not matched:
                items.append(ml_item)
        
        # Deduplicate by name similarity
        return self._deduplicate_items(items)
    
    def _names_match(self, name1: str, name2: str, threshold: float = 0.7) -> bool:
        """Check if two food names refer to the same item."""
        # Simple fuzzy matching
        n1 = name1.lower().replace(' ', '').replace('_', '')
        n2 = name2.lower().replace(' ', '').replace('_', '')
        
        if n1 == n2:
            return True
        
        # Check if one contains the other
        if n1 in n2 or n2 in n1:
            return True
        
        # Jaccard similarity on character bigrams
        def bigrams(s):
            return set(s[i:i+2] for i in range(len(s)-1))
        
        b1, b2 = bigrams(n1), bigrams(n2)
        if not b1 or not b2:
            return False
        
        intersection = len(b1 & b2)
        union = len(b1 | b2)
        return intersection / union >= threshold if union > 0 else False
    
    def _deduplicate_items(self, items: List[FoodItem]) -> List[FoodItem]:
        """Remove duplicate items based on name similarity."""
        unique = []
        for item in items:
            is_duplicate = False
            for existing in unique:
                if self._names_match(item.name, existing.name):
                    # Merge: keep higher confidence, average quantities
                    if item.confidence > existing.confidence:
                        existing.name = item.name
                    existing.quantity_g = (existing.quantity_g * existing.confidence + 
                                          item.quantity_g * item.confidence) / (existing.confidence + item.confidence)
                    existing.confidence = max(existing.confidence, item.confidence)
                    existing.source = f"{existing.source}+{item.source}"
                    is_duplicate = True
                    break
            
            if not is_duplicate:
                unique.append(item)
        
        return unique
    
    # ============================================
    # VOICE PROCESSING
    # ============================================
    
    async def process_voice(self, media: MediaInput) -> ProcessingResult:
        """Process voice input through speech-to-text + NLP pipeline."""
        start_time = time.time()
        result = ProcessingResult(
            id=str(uuid.uuid4()),
            input_id=media.id,
            status=ProcessingStatus.PROCESSING,
        )
        
        try:
            # Speech to text
            transcript = await self._speech_to_text(media.data, media.mime_type)
            
            # Parse transcript for food items
            items = await self._parse_voice_transcript(transcript)
            
            # Calculate totals
            total_carbs = sum(item.carbs_g for item in items)
            total_protein = sum(item.protein_g for item in items)
            total_fat = sum(item.fat_g for item in items)
            avg_confidence = np.mean([item.confidence for item in items]) if items else 0
            
            result.items = [
                {
                    "name": item.name,
                    "quantity_g": item.quantity_g,
                    "prep_method": item.prep_method,
                    "carbs_g": item.carbs_g,
                    "protein_g": item.protein_g,
                    "fat_g": item.fat_g,
                    "fiber_g": item.fiber_g,
                    "confidence": item.confidence,
                    "source": item.source,
                }
                for item in items
            ]
            result.total_carbs = round(total_carbs, 1)
            result.total_protein = round(total_protein, 1)
            result.total_fat = round(total_fat, 1)
            result.confidence = round(avg_confidence, 2)
            result.status = ProcessingStatus.COMPLETED
            
        except Exception as e:
            logger.error(f"Voice processing failed: {e}")
            result.status = ProcessingStatus.FAILED
            result.error = str(e)
        
        result.processing_time_ms = round((time.time() - start_time) * 1000, 1)
        return result
    
    async def _speech_to_text(self, audio_data: bytes, mime_type: str) -> str:
        """Convert speech to text using speech recognition service."""
        # In production, integrate with:
        # - Google Speech-to-Text
        # - Azure Speech Services
        # - AWS Transcribe
        # - Whisper (local)
        
        # Mock implementation
        return "एक प्लेट राजमा चावल खाया"
    
    async def _parse_voice_transcript(self, transcript: str) -> List[FoodItem]:
        """Parse voice transcript for food items using NLP."""
        items = []
        transcript_lower = transcript.lower()
        
        # Hindi/English food detection
        for lang, keywords in self.indian_food_keywords.items():
            for keyword in keywords:
                if keyword.lower() in transcript_lower:
                    # Try to extract quantity from speech
                    qty = self._extract_quantity_from_speech(transcript, keyword)
                    items.append(FoodItem(
                        name=keyword,
                        quantity_g=qty,
                        confidence=0.7,
                        source="voice",
                    ))
        
        # Composite meal detection
        for composite, components in self.composite_patterns.items():
            if all(c in transcript_lower for c in components):
                items.append(FoodItem(
                    name=composite.replace('_', ' '),
                    quantity_g=350,
                    confidence=0.85,
                    source="voice_composite",
                ))
        
        return self._deduplicate_items(items)
    
    def _extract_quantity_from_speech(self, transcript: str, keyword: str) -> float:
        """Extract quantity mentioned in speech near a keyword."""
        import re
        
        # Hindi/English number words
        number_words = {
            'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5,
            'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
            'आधा': 0.5, 'डेढ़': 1.5, 'ढाई': 2.5,
            'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
            'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
            'half': 0.5,
        }
        
        # Find keyword position
        keyword_pos = transcript_lower.find(keyword.lower())
        if keyword_pos == -1:
            return 100.0
        
        # Check context before keyword (for "ek plate rajma")
        before = transcript_lower[max(0, keyword_pos-30):keyword_pos]
        for word, num in number_words.items():
            if word in before:
                return num * 100  # assume 100g per unit
        
        # Check for explicit quantities
        numbers = re.findall(r'\b(\d+(?:\.\d+)?)\s*(?:plate|bowl|katori|कटोरी|plate|bowl)\b', 
                           transcript_lower)
        if numbers:
            return float(numbers[0]) * 100
        
        return 100.0


# ============================================
# FASTAPI ROUTES
# ============================================

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI(title="T1D India Media Pipeline")

media_pipeline = MediaPipeline()

class MediaUploadResponse(BaseModel):
    input_id: str
    status: str
    message: str

class ProcessPhotoRequest(BaseModel):
    user_id: str
    meal_type: Optional[str] = None

class ProcessVoiceRequest(BaseModel):
    user_id: str
    language: str = "hi-IN"

@app.on_event("startup")
async def startup():
    await media_pipeline.__aenter__()

@app.on_event("shutdown")
async def shutdown():
    await media_pipeline.__aexit__(None, None, None)

@app.post("/api/v1/media/photo", response_model=MediaUploadResponse)
async def upload_photo(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    meal_type: str = Form(None),
):
    """Upload and process meal photo."""
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    data = await file.read()
    
    media = MediaInput(
        id=str(uuid.uuid4()),
        user_id=user_id,
        media_type=MediaType.PHOTO,
        data=data,
        mime_type=file.content_type,
        metadata={"meal_type": meal_type, "filename": file.filename},
    )
    
    # Process in background
    result = await media_pipeline.process_photo(media)
    
    return MediaUploadResponse(
        input_id=media.id,
        status=result.status.value,
        message="Photo processed successfully" if result.status == ProcessingStatus.COMPLETED else result.error,
    )

@app.post("/api/v1/media/voice", response_model=MediaUploadResponse)
async def upload_voice(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    language: str = Form("hi-IN"),
):
    """Upload and process voice input."""
    if not file.content_type.startswith('audio/'):
        raise HTTPException(status_code=400, detail="File must be audio")
    
    data = await file.read()
    
    media = MediaInput(
        id=str(uuid.uuid4()),
        user_id=user_id,
        media_type=MediaType.VOICE,
        data=data,
        mime_type=file.content_type,
        metadata={"language": language, "filename": file.filename},
    )
    
    result = await media_pipeline.process_voice(media)
    
    return MediaUploadResponse(
        input_id=media.id,
        status=result.status.value,
        message="Voice processed successfully" if result.status == ProcessingStatus.COMPLETED else result.error,
    )

@app.get("/api/v1/media/result/{input_id}", response_model=dict)
async def get_result(input_id: str):
    """Get processing result by input ID."""
    # In production, store results in Redis/DB
    # For now, return mock
    return {
        "input_id": input_id,
        "status": "completed",
        "items": [
            {
                "name": "Rajma Chawal",
                "quantity_g": 350,
                "carbs_g": 89,
                "protein_g": 17,
                "fat_g": 2.5,
                "confidence": 0.87,
            }
        ],
        "total_carbs": 89,
        "total_protein": 17,
        "total_fat": 2.5,
    }

@app.post("/api/v1/media/batch", response_model=dict)
async def process_batch(
    files: List[UploadFile] = File(...),
    user_id: str = Form(...),
    media_type: str = Form(...),
):
    """Process multiple media files in batch."""
    results = []
    
    for file in files:
        data = await file.read()
        media = MediaInput(
            id=str(uuid.uuid4()),
            user_id=user_id,
            media_type=MediaType(media_type),
            data=data,
            mime_type=file.content_type,
        )
        
        if media.media_type == MediaType.PHOTO:
            result = await media_pipeline.process_photo(media)
        else:
            result = await media_pipeline.process_voice(media)
        
        results.append({
            "input_id": media.id,
            "status": result.status.value,
            "total_carbs": result.total_carbs,
        })
    
    return {"results": results, "total": len(results)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)