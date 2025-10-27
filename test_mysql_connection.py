#!/usr/bin/env python3
"""
MySQL 연결 테스트 스크립트
사용법: python test_mysql_connection.py
"""
import os
import pymysql
import logging
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_mysql_connection():
    """MySQL 서버 연결 테스트"""
    try:
        # .env 파일의 DB_URL에서 연결 정보 추출
        db_url = os.getenv("DB_URL")
        if not db_url:
            logger.error("❌ DB_URL 환경 변수가 설정되지 않았습니다.")
            return False

        # DB_URL 파싱: mysql+pymysql://{username}:{password}@{host}:{port}/{database}
        import re
        pattern = r'mysql\+pymysql://([^:]+):([^@]+)@([^:/]+)(?::(\d+))?/(.+)'
        match = re.match(pattern, db_url)
        
        if not match:
            logger.error("❌ DB_URL 파싱 실패")
            return False
            
        DB_USER = match.group(1)
        DB_PASSWORD = match.group(2)
        DB_HOST = match.group(3)
        DB_PORT = int(match.group(4) or "3306")
        
        logger.info("🔍 MySQL 연결 정보:")
        logger.info(f"   호스트: {DB_HOST}")
        logger.info(f"   포트: {DB_PORT}")
        logger.info(f"   사용자: {DB_USER}")
        
        # MySQL 서버 연결 테스트
        logger.info("🔌 MySQL 서버에 연결 중...")
        connection = pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            charset='utf8mb4'
        )
        
        with connection:
            with connection.cursor() as cursor:
                # 버전 확인
                cursor.execute("SELECT VERSION()")
                version = cursor.fetchone()[0]
                logger.info(f"✅ MySQL 서버 연결 성공!")
                logger.info(f"📊 MySQL 버전: {version}")
                
                # 데이터베이스 목록 확인
                cursor.execute("SHOW DATABASES")
                databases = [row[0] for row in cursor.fetchall()]
                logger.info(f"🗄️ 사용 가능한 데이터베이스: {', '.join(databases)}")
                
                # 현재 사용자 권한 확인
                cursor.execute("SELECT USER(), CURRENT_USER()")
                user_info = cursor.fetchone()
                logger.info(f"👤 현재 사용자: {user_info[0]} (권한: {user_info[1]})")
        
        return True
        
    except pymysql.Error as e:
        logger.error(f"❌ MySQL 연결 실패: {e}")
        logger.error("💡 다음 사항들을 확인해주세요:")
        logger.error("   1. MySQL 서버가 실행 중인가?")
        logger.error("   2. 호스트와 포트 번호가 올바른가?")
        logger.error("   3. 사용자명과 비밀번호가 정확한가?")
        logger.error("   4. 방화벽이 MySQL 포트를 차단하고 있지 않은가?")
        return False
        
    except Exception as e:
        logger.error(f"❌ 예상치 못한 오류: {e}")
        return False

def test_database_access():
    """특정 데이터베이스 접근 테스트"""
    try:
        # .env 파일의 DB_URL에서 연결 정보 추출
        db_url = os.getenv("DB_URL")
        if not db_url:
            logger.error("❌ DB_URL 환경 변수가 설정되지 않았습니다.")
            return False
        
        # DB_URL 파싱
        import re
        pattern = r'mysql\+pymysql://([^:]+):([^@]+)@([^:/]+)(?::(\d+))?/(.+)'
        match = re.match(pattern, db_url)
        
        if not match:
            logger.error("❌ DB_URL 파싱 실패")
            return False
            
        DB_USER = match.group(1)      # username
        DB_PASSWORD = match.group(2)  # password
        DB_HOST = match.group(3)      # host
        DB_PORT = int(match.group(4) or "3306")  # port
        DB_NAME = match.group(5)      # database
        
        logger.info(f"🎯 데이터베이스 '{DB_NAME}' 접근 테스트...")
        
        connection = pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            charset='utf8mb4'
        )
        
        with connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT DATABASE()")
                current_db = cursor.fetchone()[0]
                logger.info(f"✅ 데이터베이스 '{current_db}' 접근 성공!")
                
                # 테이블 목록 확인
                cursor.execute("SHOW TABLES")
                tables = [row[0] for row in cursor.fetchall()]
                if tables:
                    logger.info(f"📋 기존 테이블: {', '.join(tables)}")
                else:
                    logger.info("📋 테이블이 아직 생성되지 않았습니다.")
        
        return True
        
    except pymysql.Error as e:
        if "Unknown database" in str(e):
            logger.warning(f"⚠️ 데이터베이스 '{DB_NAME}'가 존재하지 않습니다.")
            logger.info("💡 'python db_manager.py create' 명령어로 데이터베이스를 생성하세요.")
        else:
            logger.error(f"❌ 데이터베이스 접근 실패: {e}")
        return False

def main():
    """메인 함수"""
    print("🔧 MySQL 연결 테스트 도구")
    print("=" * 50)
    
    # 기본 연결 테스트
    if test_mysql_connection():
        print("\n" + "=" * 50)
        # 데이터베이스 접근 테스트
        test_database_access()
    
    print("\n" + "=" * 50)
    print("테스트 완료!")

if __name__ == "__main__":
    main()
