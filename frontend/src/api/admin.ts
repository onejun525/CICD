import apiClient from "./client";

// 관리자용 유저 리스트
export async function getAdminUserList() {
    const res = await apiClient.get("/users/list");
    // Ensure array
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.data.users)) return res.data.users;
    return [];
}

// 관리자용 챗봇 히스토리 리스트
export async function getAdminChatHistoryList() {
    const res = await apiClient.get("/users/list/chat_history");
    // Ensure array
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.data.chat_histories)) return res.data.chat_histories;
    return [];
}

// 관리자용 AI 피드백 리스트
export async function getAdminAIFeedbackList() {
    const res = await apiClient.get("/feedback/list/ai_feedbacks");
    // Ensure array
    if (Array.isArray(res.data.ai_feedbacks)) return res.data.ai_feedbacks;
    if (Array.isArray(res.data)) return res.data;
    return [];
}
