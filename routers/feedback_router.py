from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from routers.user_router import get_current_user
from database import SessionLocal
import models
import json
import os
from openai import OpenAI

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)

router = APIRouter(prefix="/api/feedback", tags=["Feedback"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 사용자 피드백: 상담 종료 후 전체 챗봇 경험 1회 평가
class UserFeedbackRequest(BaseModel):
    history_id: int
    feedback: str     # "좋다" 또는 "싫다"

@router.post("/user")
def submit_user_feedback(
    req: UserFeedbackRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.query(models.UserFeedback).filter_by(history_id=req.history_id, user_id=current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="이미 이 대화 히스토리에 대해 피드백을 남겼습니다.")
    chat_history = db.query(models.ChatHistory).filter_by(id=req.history_id, user_id=current_user.id).first()
    # 종료된 세션(ended_at not null)만 피드백 허용
    if not chat_history or chat_history.ended_at is None:
        raise HTTPException(status_code=400, detail="대화가 종료된 뒤에만 피드백 제출이 가능합니다.")
    user_feedback = models.UserFeedback(
        history_id=req.history_id,
        user_id=current_user.id,
        feedback=req.feedback
    )
    db.add(user_feedback)
    db.commit()
    db.refresh(user_feedback)
    return {"message": "피드백 저장 성공", "user_feedback_id": user_feedback.id}

@router.get("/user/{history_id}")
def get_user_feedback(
    history_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    feedback = db.query(models.UserFeedback).filter_by(history_id=history_id, user_id=current_user.id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="피드백 없음")
    return {
        "feedback": feedback.feedback,
        "created_at": feedback.created_at
    }

# AI 자동 평가 요청 모델
class AIFeedbackRequest(BaseModel):
    message_id: int

@router.post("/ai/auto")
def auto_evaluate_ai_feedback(
    req: AIFeedbackRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    message = db.query(models.ChatMessage)\
        .join(models.ChatHistory)\
        .filter(
            models.ChatMessage.id == req.message_id,
            models.ChatHistory.user_id == current_user.id,
            models.ChatMessage.role == "ai"
        ).first()
    if not message:
        raise HTTPException(status_code=404, detail="평가할 AI 답변(chat_message)을 찾지 못했습니다.")
    # 해당 메시지의 히스토리 세션 종료(ended_at not null)만 평가 허용
    chat_history = db.query(models.ChatHistory).filter_by(id=message.history_id, user_id=current_user.id).first()
    if not chat_history or chat_history.ended_at is None:
        raise HTTPException(status_code=400, detail="대화 종료 후에만 AI 피드백이 가능합니다.")
    # 중복 체크
    existing = db.query(models.AIFeedback).filter_by(message_id=req.message_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="이미 AI피드백이 존재합니다.")
    answer = message.text

    # 프롬프트(항목, 점수(0~100), 2~3문장 근거, total_score, vector_db_quality 포함)
    llm_prompt = f"""
너는 퍼스널컬러 AI 진단 결과를 평가하는 AI 평가자야.

아래 AI 답변 결과에 대해 5개 평가항목(정확도, 일관성, 신뢰도, 개인화, 실용성)을 각각 0~100점 만점으로 평가하고,
각 항목의 상세평가 근거는 반드시 2문장 이상, 3문장 이상이면 더 좋으며, 1문장만 쓰면 오류라고 간주한다!
각 근거에는 점수 이유, 객관적 근거, 구체적 예시, 해당 결과의 강점 또는 약점 모두 포함할 것.

반드시 아래 단계별로 detail_필드별로 작성하라:
1. 왜 그 점수를 줬는지 이유
2. 객관적 검증 근거
3. 구체적 예시나 상황
4. 해당 결과의 강점 또는 약점

아래는 평가 예시입니다:

예시1:
"detail_accuracy": "RAG 데이터와 설문 결과가 대부분 일치하며 추천 색상 타입 역시 실제 메이크업 사례와 같은 객관적 지표와 부합합니다. 특히, 색상 분류가 세부 옵션까지 논리적으로 잘 구분됩니다."
예시2:
"detail_accuracy": "추천 결과가 사용자의 피부톤, 머리색, 눈동자색 등 입력 정보와 일치합니다. 실제 진단 사례와 비교해도 결과가 신뢰할 만합니다."
예시3:
"detail_accuracy": "추천된 색상 팔레트가 기존 퍼스널컬러 진단 기준과 부합하며, 구체적 근거와 함께 설명이 잘 제시되어 있습니다. 색상별로 실제 활용 예시도 포함되어 신뢰도가 높습니다."

예시1:
"detail_consistency": "모든 조건의 연결이 논리적이며 사용자 특성과 질문 변화에도 결과의 일관성이 높습니다. 추가적인 입력 질문을 넣어도 결과가 크게 바뀌지 않는 안정감이 있습니다."
예시2:
"detail_consistency": "추천 결과가 여러 번 반복해도 일관된 답변이 나오며, 입력값 변화에도 논리적 흐름이 유지됩니다."
예시3:
"detail_consistency": "색상 추천과 진단 결과가 여러 조건에서 일관되게 유지되어 신뢰할 수 있습니다. 실제 사용자 피드백과도 일치합니다."

예시1:
"detail_reliability": "진단 근거와 confidence 점수 설명이 포함되어 신뢰성이 높게 느껴집니다. 추천 색상 모두 관련 출처(논문, 표준 자료 등)가 명시되어 있어 신뢰도를 더 높입니다."
예시2:
"detail_reliability": "AI가 제시한 진단 결과가 기존 연구와 일치하며, 객관적 데이터와 비교해도 신뢰할 만합니다. 추천 색상에 대한 과학적 근거가 명확합니다."
예시3:
"detail_reliability": "추천 결과가 여러 번 테스트해도 동일하게 나오며, 외부 전문가 평가와도 일치합니다. 진단 과정이 투명하게 설명되어 신뢰도가 높습니다."

예시1:
"detail_personalization": "피부톤, 취향 등 사용자의 세부 특징이 설명에 여러 번 직접적으로 언급되었습니다. 단순 분류를 넘어서, 실제 사용자에게 맞춤 추천이 이루어진 부분이 강점입니다."
예시2:
"detail_personalization": "사용자의 입력 정보에 따라 추천 색상과 스타일이 달라지며, 개인별 맞춤형 진단이 잘 이루어집니다. 실제 사용자 사례와 비교해도 개인화가 뛰어납니다."
예시3:
"detail_personalization": "추천 결과가 사용자의 선호도와 라이프스타일을 반영하여 제시됩니다. 기존 진단 시스템보다 더 세밀한 개인화가 이루어졌습니다."

예시1:
"detail_practicality": "추천 색상 및 스타일이 실제 패션·메이크업 사례에 적용 가능한 수준으로 구체적이고 실효성 있게 제시되었습니다. 일상 활용 가능 범위와 예시까지 제공되어 실용성이 높습니다."
예시2:
"detail_practicality": "추천된 색상 팔레트가 실제 제품과 연계되어 있어 바로 활용할 수 있습니다. 사용자가 쉽게 적용할 수 있는 구체적 안내가 포함되어 있습니다."
예시3:
"detail_practicality": "추천 결과가 실제 생활에서 적용 가능한지에 대한 설명이 충분하며, 다양한 상황별 활용 예시가 포함되어 있습니다. 실용성 측면에서 매우 우수합니다."

반드시 위 예시처럼 detail_필드별로 2문장 이상, 단계별로 논리적으로 작성하라.
만약 2문장 미만이면 오류 메시지를 포함하고, 반드시 예시 스타일을 따라 써라.

아래는 이 평가 대상 AI 답변(진단 결과)야:
----- AI 답변 -----
{answer}
---------------------
"""
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "퍼스널컬러 평가 전문 AI"},
            {"role": "user", "content": llm_prompt}
        ],
        temperature=0.30,
        max_tokens=1200
    )

    content = resp.choices[0].message.content

    # JSON 파싱
    try:
        start, end = content.find("{"), content.rfind("}")
        if start == -1 or end == -1:
            raise Exception("JSON 결과를 찾을 수 없음: " + content)
        data = json.loads(content[start:end+1])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 자동평가 결과 파싱 오류: {e}")

    # DB 저장
    ai_feedback = models.AIFeedback(
        message_id=req.message_id,
        accuracy=data["accuracy"],
        consistency=data["consistency"],
        reliability=data["reliability"],
        personalization=data["personalization"],
        practicality=data["practicality"],
        total_score=data["total_score"],
        vector_db_quality=data["vector_db_quality"],
        detail_accuracy=data["detail_accuracy"],
        detail_consistency=data["detail_consistency"],
        detail_reliability=data["detail_reliability"],
        detail_personalization=data["detail_personalization"],
        detail_practicality=data["detail_practicality"]
    )
    db.add(ai_feedback)
    db.commit()
    db.refresh(ai_feedback)
    return {"message": "AI 자동평가 성공", "ai_feedback_id": ai_feedback.id, **data}

@router.get("/ai/{message_id}")
def get_ai_feedback(
    message_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    message = db.query(models.ChatMessage).join(models.ChatHistory).filter(models.ChatMessage.id == message_id, models.ChatHistory.user_id == current_user.id).first()
    if not message:
        raise HTTPException(status_code=404, detail="본인 답변만 조회 가능.")
    feedback = db.query(models.AIFeedback).filter_by(message_id=message_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="AI 피드백 없음")
    return {
        "message_id": feedback.message_id,
        "accuracy": feedback.accuracy,
        "consistency": feedback.consistency,
        "reliability": feedback.reliability,
        "personalization": feedback.personalization,
        "practicality": feedback.practicality,
        "total_score": feedback.total_score,
        "vector_db_quality": feedback.vector_db_quality,
        "detail_accuracy": feedback.detail_accuracy,
        "detail_consistency": feedback.detail_consistency,
        "detail_reliability": feedback.detail_reliability,
        "detail_personalization": feedback.detail_personalization,
        "detail_practicality": feedback.detail_practicality,
        "created_at": feedback.created_at
    }
