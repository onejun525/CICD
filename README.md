# 🎨 퍼스널컬러 진단 서비스

SKN 16기 Final 단위프로젝트 - AI 기반 퍼스널컬러 진단 웹 애플리케이션

## 🚀 빠른 시작

### 필수 요구사항

- **Python**: 3.11+
- **MySQL**: 8.0+
- **Node.js**: 22+

### 1. 프로젝트 클론 및 의존성 설치

```bash
# 프로젝트 클론
git clone https://github.com/SKNETWORKS-FAMILY-AICAMP/SKN16-FINAL-4Team.git
cd SKN16-FINAL-4Team

# 백엔드 의존성 설치
pip install -r requirements.txt

# 프론트엔드 의존성 설치
cd frontend
npm install
cd ..
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
DB_URL=mysql+pymysql://myapi_user:myapipassword@localhost:3306/myapi_db
OPENAI_API_KEY=your_openai_api_key_here
SECRET_KEY=your_secret_key_here
```

### 3. 데이터베이스 설정

#### MySQL 데이터베이스 생성

```bash
# MySQL 접속
mysql -u root -p

# 데이터베이스 및 사용자 생성
CREATE DATABASE myapi_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'myapi_user'@'localhost' IDENTIFIED BY 'myapipassword';
GRANT ALL PRIVILEGES ON myapi_db.* TO 'myapi_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### Alembic 마이그레이션

```bash
# 데이터베이스 테이블 생성
alembic upgrade head
```

### 4. 서버 실행

```bash
# 백엔드 서버 실행
python run.py

# 새 터미널에서 프론트엔드 실행
cd frontend
npm run dev
```

**접속 주소:**

- 백엔드: http://127.0.0.1:8000
- 프론트엔드: http://localhost:5173
- API 문서: http://127.0.0.1:8000/docs

## 🔧 개발 가이드

### 데이터베이스 스키마 변경

```bash
# 1. models.py 수정 후 마이그레이션 생성
alembic revision --autogenerate -m "변경사항 설명"

# 2. 마이그레이션 적용
alembic upgrade head
```

### Alembic 유용한 명령어

```bash
# 현재 마이그레이션 상태 확인
alembic current

# 마이그레이션 기록 확인
alembic history

# 이전 버전으로 되돌리기
alembic downgrade -1

# 특정 버전으로 이동
alembic upgrade <revision_id>

# SQL 미리보기 (실제 실행 안함)
alembic upgrade head --sql
```

### 문제 해결

#### MySQL 연결 오류

```bash
# MySQL 서버 상태 확인
brew services list | grep mysql  # macOS
sudo service mysql status        # Ubuntu

# MySQL 서버 시작
brew services start mysql        # macOS
sudo service mysql start         # Ubuntu

# MySQL 접속 테스트
mysql -h localhost -u root -p
```

#### 포트 충돌 해결

```bash
# 포트 사용 확인
lsof -i :8000    # 백엔드 포트
lsof -i :5173    # 프론트엔드 포트

# 프로세스 종료
kill -9 <PID>
```

## 📁 프로젝트 구조

```
SKN16-FINAL-4Team/
├── main.py              # FastAPI 메인 애플리케이션
├── run.py               # 서버 실행 스크립트
├── database.py          # 데이터베이스 설정
├── models.py            # SQLAlchemy 모델
├── schemas.py           # Pydantic 스키마
├── requirements.txt     # Python 의존성
├── alembic.ini          # Alembic 설정 파일
├── .env                 # 환경 변수
├── 📂 migrations/       # Alembic 마이그레이션
│   ├── env.py           # Alembic 환경 설정
│   ├── script.py.mako   # 마이그레이션 템플릿
│   └── versions/        # 마이그레이션 파일들
├── 📂 routers/          # API 라우터
│   ├── user_router.py   # 사용자 인증 API
│   ├── survey_router.py # 설문조사 API (OpenAI 통합)
│   └── chatbot_router.py # 챗봇 API
├── 📂 frontend/         # React 프론트엔드
│   ├── src/             # 소스 코드
│   ├── package.json     # Node.js 의존성
│   └── README.md        # 프론트엔드 가이드
└── 📂 data/             # RAG 데이터
    └── RAG/             # 퍼스널컬러 관련 데이터
```

## 🔑 주요 기능

### 백엔드 (FastAPI)

- **사용자 인증**: JWT 토큰 기반 인증/인가
- **퍼스널컬러 진단**: OpenAI API를 활용한 AI 기반 분석
- **설문조사 시스템**: 사용자 응답 수집 및 저장
- **RAG 챗봇**: 퍼스널컬러 관련 질의응답
- **데이터베이스**: MySQL + SQLAlchemy ORM

### 프론트엔드 (React + TypeScript)

- **반응형 UI**: Ant Design 컴포넌트 활용
- **퍼스널컬러 테스트**: 단계별 설문 진행
- **결과 분석**: AI 기반 상세 분석 결과 표시
- **사용자 관리**: 회원가입/로그인 시스템

## 🛠 기술 스택

### 백엔드

- **Python**: 3.11+
- **FastAPI**: 웹 프레임워크
- **SQLAlchemy**: ORM
- **Alembic**: 데이터베이스 마이그레이션
- **MySQL**: 데이터베이스
- **OpenAI API**: AI 분석 서비스

### 프론트엔드

- **React**: 18+
- **TypeScript**: 타입 안전성
- **Vite**: 빌드 도구
- **Ant Design**: UI 컴포넌트
- **Axios**: HTTP 클라이언트

## 📈 개발 현황

- ✅ 백엔드 API 구축 완료
- ✅ 데이터베이스 설계 및 마이그레이션 완료
- ✅ OpenAI 연동 및 퍼스널컬러 분석 기능 완료
- ✅ 프론트엔드 기본 구조 및 컴포넌트 완료
- ✅ 사용자 인증 시스템 완료
- ✅ 퍼스널컬러 테스트 UI 완료
