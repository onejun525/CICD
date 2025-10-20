import React, { useEffect, useState } from "react";
import { Tabs, Table, Spin, message, Card, Typography, Button, Drawer, List, Descriptions, Select } from "antd";
import type { TabsProps } from "antd";
import { getAdminUserList, getAdminChatHistoryList, getAdminAIFeedbackList } from "../api/admin";

const { Title } = Typography;

const AdminDashboard: React.FC = () => {
    // 권한 변경 상태 관리
    const [roleEditUserId, setRoleEditUserId] = useState<number | null>(null);
    const [roleEditValue, setRoleEditValue] = useState<string>("");
    const [roleEditLoading, setRoleEditLoading] = useState(false);

    // 권한 변경 API 호출 함수
    const handleRoleChange = async (userId: number, newRole: string) => {
        setRoleEditLoading(true);
        try {
            const res = await fetch(`/api/users/${userId}/role`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ role: newRole }),
            });
            const data = await res.json();
            if (data.success) {
                message.success(data.message || "권한 변경 완료");
                // 변경된 유저 리스트 반영
                setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
            } else {
                message.error(data.message || "권한 변경 실패");
            }
        } catch (err) {
            message.error("권한 변경 중 오류 발생");
        } finally {
            setRoleEditUserId(null);
            setRoleEditLoading(false);
        }
    };
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [chatHistories, setChatHistories] = useState<any[]>([]);
    const [aiFeedbacks, setAIFeedbacks] = useState<any[]>([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerQAPairs, setDrawerQAPairs] = useState<any[]>([]);

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

    // qa_paris 답변 구조 표 렌더 함수
    const renderQaParisAnswerTable = (answerObj: any) => {
        if (!answerObj) return null;
        const { primary_tone, sub_tone, description, recommendations } = JSON.parse(answerObj);
        if (!primary_tone || !sub_tone || !description || !recommendations) return null;
        return (
            <Descriptions bordered column={1} size="middle" style={{ marginBottom: 12 }}>
                <Descriptions.Item label="추천 톤">{primary_tone}</Descriptions.Item>
                <Descriptions.Item label="서브 톤">{sub_tone}</Descriptions.Item>
                <Descriptions.Item label="설명">{description}</Descriptions.Item>
                <Descriptions.Item label="추천">
                    <ul style={{ margin: 0 }}>
                        {Array.isArray(recommendations) && recommendations.map((rec: string, idx: number) => (
                            <li key={idx}>- {rec}</li>
                        ))}
                    </ul>
                </Descriptions.Item>
            </Descriptions>
        );
    };

    const userColumns = [
        { title: "ID", dataIndex: "id", key: "id" },
        { title: "닉네임", dataIndex: "nickname", key: "nickname" },
        { title: "이메일", dataIndex: "email", key: "email" },
        { title: "성별", dataIndex: "gender", key: "gender" },
        { title: "가입일", dataIndex: "create_date", key: "create_date" },
        {
            title: "권한",
            dataIndex: "role",
            key: "role",
            render: (role: string) => <b>{role}</b>,
        },
        {
            title: "권한변경",
            key: "role_edit",
            width: 250,
            render: (_: any, record: any) => {
                const isEditing = roleEditUserId === record.id;
                return (
                    <>
                        {isEditing ? (
                            <span>
                                <Select
                                    value={roleEditValue || record.role}
                                    style={{ marginRight: 8 }}
                                    onChange={v => setRoleEditValue(v)}
                                    options={[{ value: "user", label: "user" }, { value: "admin", label: "admin" }]}
                                    disabled={roleEditLoading}
                                />
                                <Button
                                    type="primary"
                                    size="small"
                                    loading={roleEditLoading}
                                    onClick={() => handleRoleChange(record.id, roleEditValue || record.role)}
                                    disabled={roleEditValue === record.role}
                                >저장</Button>
                                <Button
                                    size="small"
                                    style={{ marginLeft: 4 }}
                                    onClick={() => { setRoleEditUserId(null); setRoleEditValue(""); }}
                                    disabled={roleEditLoading}
                                >취소</Button>
                            </span>
                        ) : (
                            <Button
                                type="link"
                                size="small"
                                style={{ padding: 0, height: 22 }}
                                onClick={() => { setRoleEditUserId(record.id); setRoleEditValue(record.role); }}
                            >권한변경</Button>
                        )}
                    </>
                );
            },
        },
    ];
    // ...existing code...
    const chatColumns = [
        { title: "히스토리ID", dataIndex: "chat_history_id", key: "chat_history_id" },
        { title: "유저ID", dataIndex: "user_id", key: "user_id" },
        { title: "시작", dataIndex: "created_at", key: "created_at" },
        { title: "종료", dataIndex: "ended_at", key: "ended_at" },
        { title: "피드백", dataIndex: ["user_feedback", "feedback"], key: "feedback" },
        {
            title: "Q/A 요약",
            key: "qa_summary",
            render: (_: any, record: any) => {
                const qa = record.qa_pairs?.[0];
                if (!qa) return "-";
                const truncate = (text: string, len: number) => text.length > len ? text.slice(0, len) + "..." : text;
                return (
                    <span>
                        <b>Q:</b> {truncate(qa.question, 20)} <b>A:</b> {truncate(qa.answer, 20)}
                    </span>
                );
            },
        },
        {
            title: "상세보기",
            key: "qa_detail",
            render: (_: any, record: any) => (
                <Button
                    type="primary"
                    size="small"
                    disabled={!Array.isArray(record.qa_pairs) || record.qa_pairs.length === 0}
                    onClick={() => { setDrawerQAPairs(record.qa_pairs); setDrawerOpen(true); }}
                >상세보기</Button>
            ),
        },
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
            children: (
                <>
                    <Table
                        rowKey="chat_history_id"
                        columns={chatColumns}
                        dataSource={chatHistories}
                        pagination={false}
                    />
                    <Drawer
                        title="질문/답변 상세내역"
                        open={drawerOpen}
                        onClose={() => setDrawerOpen(false)}
                        width={500}
                    >
                        <List
                            dataSource={drawerQAPairs}
                            renderItem={(item, idx) => (
                                <List.Item key={idx} style={{ padding: '0', borderBottom: 'none' }}>
                                    <Card style={{ marginBottom: 16, borderRadius: 10, boxShadow: '0 2px 8px #eee' }}>
                                        <Descriptions
                                            title={`Q${idx + 1}. ${item.question}`}
                                            column={1}
                                            size="small"
                                            bordered
                                        >
                                            <Descriptions.Item label="답변">
                                                {typeof JSON.parse(item.answer) === 'object' && item.answer !== null ? (
                                                    renderQaParisAnswerTable(item.answer)
                                                ) : (
                                                    <span style={{ color: '#1769aa', fontWeight: 600, whiteSpace: 'pre-line' }}>{item.answer}</span>
                                                )}
                                            </Descriptions.Item>
                                        </Descriptions>
                                        <div style={{ fontSize: 12, color: '#bbb', marginTop: 6, marginBottom: 2 }}>
                                            질문ID: {item.question_id} / 답변ID: {item.answer_id}
                                        </div>
                                    </Card>
                                </List.Item>
                            )}
                        />
                    </Drawer>
                </>
            ),
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
