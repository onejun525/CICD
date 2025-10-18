import type { GenderType } from '@/api/user';

export interface GenderAvatarConfig {
    avatarType: 'emoji' | 'icon';
    emoji?: string;
    iconType?: 'man' | 'woman' | 'user';
    className: string;
    color: string;
    style?: React.CSSProperties;
}

// 예쁜 아바타 이모티콘 옵션들
const MALE_AVATARS = ['👨‍💼', '🧑‍💻', '👨‍🎨', '🤵', '👨‍🔬', '🧑‍🎓'];
const FEMALE_AVATARS = ['👩‍💼', '👩‍💻', '👩‍🎨', '👰', '👩‍🔬', '👩‍🎓'];
const DEFAULT_AVATARS = ['😊', '🌟', '✨', '🎭', '🎨', '💫'];

/**
 * 랜덤한 아바타 이모티콘을 선택하는 함수
 * @param avatars - 아바타 이모티콘 배열
 * @param userId - 사용자 ID (일관된 선택을 위해)
 * @returns 선택된 이모티콘
 */
const getRandomAvatar = (avatars: string[], userId?: number): string => {
    if (userId) {
        // 사용자 ID를 기반으로 일관된 아바타 선택
        return avatars[userId % avatars.length];
    }
    return avatars[0]; // 기본값
};

/**
 * 성별에 따른 아바타 설정을 반환하는 함수
 * @param gender - 사용자 성별 ('남성' | '여성' | undefined)
 * @param userId - 사용자 ID (일관된 아바타 선택을 위해)
 * @returns 아바타 이모티콘/아이콘과 스타일 설정
 */
export const getGenderAvatarConfig = (gender?: GenderType, userId?: number): GenderAvatarConfig => {
    switch (gender) {
        case '남성':
            return {
                avatarType: 'emoji',
                emoji: getRandomAvatar(MALE_AVATARS, userId),
                className: 'custom-avatar-male',
                color: '#93c5fd',
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(147, 197, 253, 0.4)',
                    borderRadius: '50%'
                }
            };
        case '여성':
            return {
                avatarType: 'emoji',
                emoji: getRandomAvatar(FEMALE_AVATARS, userId),
                className: 'custom-avatar-female',
                color: '#f9a8d4',
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(249, 168, 212, 0.4)',
                    borderRadius: '50%'
                }
            };
        default:
            return {
                avatarType: 'emoji',
                emoji: getRandomAvatar(DEFAULT_AVATARS, userId),
                className: 'custom-avatar-default',
                color: '#c4b5fd',
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(196, 181, 253, 0.4)',
                    borderRadius: '50%'
                }
            };
    }
};

/**
 * 성별에 따른 아바타 렌더링 정보를 반환하는 함수
 * @param gender - 사용자 성별
 * @param userId - 사용자 ID
 * @returns 렌더링용 아바타 정보 (content, className, style)
 */
export const getAvatarRenderInfo = (gender?: GenderType, userId?: number) => {
    const config = getGenderAvatarConfig(gender, userId);

    if (config.avatarType === 'emoji') {
        return {
            content: config.emoji,
            className: config.className,
            style: config.style,
        };
    } else {
        // 기존 아이콘 방식은 컴포넌트에서 처리 필요
        return {
            iconType: config.iconType,
            className: config.className,
            style: config.style,
        };
    }
};