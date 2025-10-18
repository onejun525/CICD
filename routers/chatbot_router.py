# routers/chatbot_router.py

import os
import json
from typing import List, Dict, Any
from math import sqrt

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from datetime import datetime, timezone

import models
from routers.user_router import get_current_user
from database import SessionLocal

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("환경변수 OPENAI_API_KEY가 설정되지 않았습니다.")

client = OpenAI(api_key=OPENAI_API_KEY)
router = APIRouter(prefix="/api/chatbot", tags=["Chatbot"])

def get_db():
    try:
        db = SessionLocal()
        print("▶ DB 세션 생성 성공:", db)
    except Exception as e:
        print("▶ DB 세션 생성 오류:", e)
        raise
    try:
        yield db
    finally:
        db.close()
        print("▶ DB 세션 종료")

# ---------------- 유틸 함수 ----------------
def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> List[str]:
    if overlap >= chunk_size:
        raise ValueError("overlap은 chunk_size보다 작아야 합니다.")
    chunks = []
    start = 0
    text_length = len(text)
    while start < text_length:
        end = min(start + chunk_size, text_length)
        chunks.append(text[start:end])
        if end == text_length:
            break
        start += (chunk_size - overlap)
    return [c.strip() for c in chunks if c.strip()]

def cosine_similarity(a: List[float], b: List[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = sqrt(sum(x * x for x in a)) or 1e-8
    nb = sqrt(sum(x * x for x in b)) or 1e-8
    return dot / (na * nb)

def embed_texts(client: OpenAI, texts: List[str], model: str = "text-embedding-3-small") -> List[List[float]]:
    res = client.embeddings.create(model=model, input=texts)
    return [item.embedding for item in res.data]

def top_k_chunks(query: str, index: Dict[str, Any], client: OpenAI, k: int = 3) -> List[str]:
    q_emb = embed_texts(client, [query])[0]
    sims = [(cosine_similarity(q_emb, emb), i) for i, emb in enumerate(index["embeddings"])]
    sims.sort(reverse=True, key=lambda x: x[0])
    return [index["chunks"][i] for _, i in sims[:k]]

def build_rag_index(client: OpenAI, filepath: str) -> Dict[str, Any]:
    with open(filepath, encoding="utf-8") as f:
        text = f.read()
    chunks = chunk_text(text, chunk_size=800, overlap=100)
    embeddings = embed_texts(client, chunks)
    return {"chunks": chunks, "embeddings": embeddings}

fixed_index = build_rag_index(client, "data/RAG/personal_color_RAG.txt")
trend_index = build_rag_index(client, "data/RAG/beauty_trend_2025_autumn_RAG.txt")

class ChatbotRequest(BaseModel):
    answers: List[str]

class ChatbotResponse(BaseModel):
    primary_tone: str
    sub_tone: str
    description: str
    recommendations: List[str]

@router.get("/health")
def health_check(current_user: models.User = Depends(get_current_user)):
    return {"status": "ok", "message": "Chatbot API is running"}

@router.post("/analyze", response_model=ChatbotResponse)
def analyze_personal_color(
    request: ChatbotRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # 0. 챗봇 히스토리 세션 생성
        chat_history = models.ChatHistory(user_id=current_user.id)
        db.add(chat_history)
        db.commit()
        db.refresh(chat_history)

        # 1. 사용자 질문 ChatMessage 저장
        user_msg_text = " / ".join(request.answers).strip()
        user_msg = models.ChatMessage(
            history_id=chat_history.id,
            role="user",
            text=user_msg_text
        )
        db.add(user_msg)
        db.commit()
        db.refresh(user_msg)

        # 2. 설문 결과 컨텍스트 생성
        survey_result = db.query(models.SurveyResult)\
            .filter(models.SurveyResult.user_id == current_user.id)\
            .order_by(models.SurveyResult.created_at.desc())\
            .first()
        survey_context = ""
        if survey_result:
            survey_context = (
                f"[최신 설문 결과]\n"
                f"진단 tone: {survey_result.result_tone}\n"
                f"confidence: {survey_result.confidence}\n"
                f"total_score: {survey_result.total_score}\n"
            )
            survey_context += "\n".join(
                f"{ans.question_id}: {ans.option_label}"
                for ans in survey_result.answers
            )

        # 3. 사용자 입력 + 설문 합치기
        combined_query = (
            f"{user_msg_text}\n\n[사용자 설문 결과]\n{survey_context}" if survey_context else user_msg_text
        )

        if not combined_query.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="answers 배열에 하나 이상의 답변이 필요합니다."
            )

        # 4. RAG 검색
        fixed_chunks = top_k_chunks(combined_query, fixed_index, client, k=3)
        trend_chunks = top_k_chunks(combined_query, trend_index, client, k=3)

        # 5. 프롬프트 생성
        prompt_system = (
            "당신은 퍼스널컬러 전문가이자 최신 패션 트렌드 컨설턴트입니다. "
            "사용자의 최신 설문 진단 결과(result_tone, confidence, total_score 등)를 반드시 참고해서 퍼스널컬러 리포트와 추천을 작성해 주세요."
        )
        prompt_user = f"""
사용자 데이터:
{combined_query}

[불변 지식]
{chr(10).join(fixed_chunks)}

[가변 지식]
{chr(10).join(trend_chunks)}

JSON 형식으로 only 결과를 반환:
- primary_tone: '웜' 또는 '쿨'
- sub_tone: '봄'/'여름'/'가을'/'겨울'
- description: 설명
- recommendations: 추천 리스트
"""
        messages = [
            {"role": "system", "content": prompt_system},
            {"role": "user", "content": prompt_user}
        ]

        # 6. LLM 호출
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.3,
            max_tokens=600
        )
        content = resp.choices[0].message.content

        # 7. JSON 파싱
        start, end = content.find("{"), content.rfind("}")
        if start == -1 or end == -1:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="JSON 결과를 찾을 수 없습니다."
            )
        data = json.loads(content[start:end+1])

        recs = data.get("recommendations")
        if isinstance(recs, dict):
            data["recommendations"] = recs.get("colors") or list(recs.values())[0]
        if not isinstance(data["recommendations"], list):
            data["recommendations"] = []

        # 8. AI 답변 메시지 ChatMessage 저장
        ai_msg = models.ChatMessage(
            history_id=chat_history.id,
            role="ai",
            text=json.dumps(data, ensure_ascii=False)
        )
        db.add(ai_msg)
        db.commit()
        db.refresh(ai_msg)

        # 9. AI 피드백 채점 (임시 예시, 실제 production에서는 LLM 평가 등 연동)
        def request_ai_feedback(question, answer):
            # 실제 LLM 평가 연동 필요! 예시코드임
            return {
                "accuracy": 95,
                "consistency": 90,
                "reliability": 93,
                "personalization": 88,
                "practicality": 85,
                "total_score": 90,
                "vector_db_quality": 96,
                "detail_accuracy": "RAG 데이터와 잘 일치.",
                "detail_consistency": "논리적 연결성이 높음.",
                "detail_reliability": "진단 근거 충분.",
                "detail_personalization": "사용자 정보 반영.",
                "detail_practicality": "실제 활용 가능."
            }

        feedback = request_ai_feedback(user_msg_text, content)
        ai_feedback = models.AIFeedback(
            message_id=ai_msg.id,
            accuracy=feedback["accuracy"],
            consistency=feedback["consistency"],
            reliability=feedback["reliability"],
            personalization=feedback["personalization"],
            practicality=feedback["practicality"],
            total_score=feedback["total_score"],
            vector_db_quality=feedback["vector_db_quality"],
            detail_accuracy=feedback["detail_accuracy"],
            detail_consistency=feedback["detail_consistency"],
            detail_reliability=feedback["detail_reliability"],
            detail_personalization=feedback["detail_personalization"],
            detail_practicality=feedback["detail_practicality"]
        )
        db.add(ai_feedback)
        db.commit()

        # 필요시 세션 종료 후 UserFeedback도 별도 엔드포인트로 저장 가능

        return ChatbotResponse(**data)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"서버 내부 오류: {e}")

# =========== 여기서부터 챗봇 세션 종료 ===========

@router.post("/end/{history_id}")
def end_chat_session(
    history_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    chat = db.query(models.ChatHistory).filter_by(id=history_id, user_id=current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="대화 세션 없음")
    if chat.ended_at:
        return {"message": "이미 종료됨", "ended_at": chat.ended_at}
    chat.ended_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "대화 종료", "ended_at": chat.ended_at}
