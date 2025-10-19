import React from 'react';
import { Row, Col, Card, Typography } from 'antd';
import { LoginForm } from '@/components';

const { Title } = Typography;

const LoginPage: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 flex justify-center p-4 pt-30">
      <Row justify="center" className="w-full max-w-6xl">
        <Col xs={24} sm={20} md={16} lg={12} xl={10}>
          <Card className="shadow-xl border-0" style={{ borderRadius: '16px' }}>
            <div className="text-center mb-8">
              <Title level={2} className="gradient-text mb-2">
                로그인
              </Title>
            </div>

            {/* 로그인 폼 */}
            <LoginForm />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default LoginPage;
