import { Outlet } from 'react-router-dom';
import { ConfigProvider, FloatButton } from 'antd';

import { Header, Footer, ScrollToTop } from './components';

import './App.css';

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
        },
      }}
    >
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        {/* 페이지 이동 시 스크롤 맨 위로 */}
        <ScrollToTop />

        {/* Header */}
        <Header />

        {/* Main Routes */}
        <div className="mt-15">
          <Outlet />
        </div>

        {/* Footer */}
        <Footer />
        <FloatButton.BackTop type="primary" />
      </div>
    </ConfigProvider>
  );
}

export default App;
