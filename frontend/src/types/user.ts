export type UserRole = 'user' | 'admin';

export interface User {
    id: number;
    nickname: string;
    username: string;
    email: string;
    gender: string;
    create_date: string;
    role: UserRole;
}