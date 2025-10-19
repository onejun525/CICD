import { QueryClient } from '@tanstack/react-query';

/**
 * TanStack Query 클라이언트 설정
 * - 전역 캐싱 및 재시도 정책
 * - 에러 핸들링
 * - 개발자 도구 설정
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 5분간 캐시 유지
      staleTime: 1000 * 60 * 5,
      // 15분 후 가비지 컬렉션
      gcTime: 1000 * 60 * 15,
      // 실패 시 3번 재시도
      retry: 3,
      // 재시도 딜레이 (지수 백오프)
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      // 윈도우 포커스 시 자동 리페치 비활성화
      refetchOnWindowFocus: false,
      // 네트워크 재연결 시 자동 리페치
      refetchOnReconnect: true,
    },
    mutations: {
      // 뮤테이션 실패 시 1번 재시도
      retry: 1,
      // 재시도 딜레이
      retryDelay: 1000,
    },
  },
});

/**
 * 쿼리 키 팩토리
 * 일관된 쿼리 키 관리를 위한 헬퍼 함수들
 */
export const queryKeys = {
  // 사용자 관련 쿼리 키
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.users.lists(), { filters }] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.users.details(), id] as const,
    stats: () => [...queryKeys.users.all, 'stats'] as const,
  },

  // 인증 관련 쿼리 키
  auth: {
    all: ['auth'] as const,
    currentUser: () => [...queryKeys.auth.all, 'currentUser'] as const,
  },
} as const;
