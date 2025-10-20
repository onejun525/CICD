import React, { useEffect, useState } from "react";
import { Tabs, Table, Spin, message, Card, Typography } from "antd";
import type { TabsProps } from "antd";
import { getAdminUserList, getAdminChatHistoryList, getAdminAIFeedbackList } from "../api/admin";

const { Title } = Typography;

const AdminDashboard: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [chatHistories, setChatHistories] = useState<any[]>([]);
    const [aiFeedbacks, setAIFeedbacks] = useState<any[]>([]);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            getAdminUserList(),
            getAdminChatHistoryList(),
            getAdminAIFeedbackList(),
        ])
            .then(([userRes, chatRes, feedbackRes]) => {
                setUsers(userRes);
                setChatHistories(chatRes);
                setAIFeedbacks(feedbackRes);
            })
            .catch(() => message.error("관리자 데이터 로드 실패"))
            .finally(() => setLoading(false));
    }, []);

    const userColumns = [
        { title: "ID", dataIndex: "id", key: "id" },
        { title: "닉네임", dataIndex: "nickname", key: "nickname" },
        { title: "이메일", dataIndex: "email", key: "email" },
        { title: "성별", dataIndex: "gender", key: "gender" },
        { title: "가입일", dataIndex: "create_date", key: "create_date" },
        { title: "권한", dataIndex: "role", key: "role" },
    ];

    const chatColumns = [
        { title: "히스토리ID", dataIndex: "chat_history_id", key: "chat_history_id" },
        { title: "유저ID", dataIndex: "user_id", key: "user_id" },
        { title: "시작", dataIndex: "created_at", key: "created_at" },
        { title: "종료", dataIndex: "ended_at", key: "ended_at" },
        { title: "피드백", dataIndex: ["user_feedback", "feedback"], key: "feedback" },
    ];

    const aiFeedbackColumns = [
        { title: "피드백ID", dataIndex: ["ai_feedback", "id"], key: "id" },
        { title: "히스토리ID", dataIndex: "history_id", key: "history_id" },
        { title: "질문", dataIndex: "question", key: "question" },
        { title: "답변", dataIndex: "answer", key: "answer" },
        { title: "정확도", dataIndex: ["ai_feedback", "accuracy"], key: "accuracy" },
        { title: "일관성", dataIndex: ["ai_feedback", "consistency"], key: "consistency" },
        { title: "신뢰도", dataIndex: ["ai_feedback", "reliability"], key: "reliability" },
        { title: "개인화", dataIndex: ["ai_feedback", "personalization"], key: "personalization" },
        { title: "실용성", dataIndex: ["ai_feedback", "practicality"], key: "practicality" },
        { title: "총점", dataIndex: ["ai_feedback", "total_score"], key: "total_score" },
    ];

    const items: TabsProps["items"] = [
        {
            key: "users",
            label: "유저 리스트",
            children: <Table rowKey="id" columns={userColumns} dataSource={users} pagination={false} />,
        },
        {
            key: "chat",
            label: "챗봇 히스토리",
            children: <Table rowKey="chat_history_id" columns={chatColumns} dataSource={chatHistories} pagination={false} />,
        },
        {
            key: "ai_feedback",
            label: "AI 피드백",
            children: <Table rowKey={(r: any) => r.ai_feedback?.id} columns={aiFeedbackColumns} dataSource={aiFeedbacks} pagination={false} />,
        },
    ];

    return (
        <div className="max-w-5xl mx-auto py-8 px-4">
            <Card variant={'outlined'} className="shadow-md rounded-xl">
                <Title level={3} style={{ marginBottom: 24, textAlign: 'center', fontWeight: 700 }}>
                    관리자 대시보드
                </Title>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '48px 0' }}>
                        <Spin size="large" />
                    </div>
                ) : (
                    <Tabs
                        items={items}
                        tabBarStyle={{ marginBottom: 24 }}
                        type="card"
                    />
                )}
            </Card>
        </div>
    );
};

export default AdminDashboard;
