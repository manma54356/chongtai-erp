import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, theme as antTheme } from 'antd'
import zhTW from 'antd/locale/zh_TW'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-tw'
import { AuthProvider } from './context/AuthContext'
import App from './App'

dayjs.locale('zh-tw')

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 * 5 } },
})

// 2026 雙配色：深墨藍 + 暖金
const erpTheme = {
  algorithm: antTheme.defaultAlgorithm,
  token: {
    colorPrimary: '#C9993E',       // 暖金 — 主色、按鈕、連結
    colorLink: '#C9993E',
    colorInfo: '#0F2647',
    colorBgLayout: '#F5F4F0',      // 暖米白底
    borderRadius: 6,
    fontFamily: "'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif",
  },
  components: {
    Layout: {
      siderBg: '#0F2647',          // 深墨藍側欄
      triggerBg: '#0A1D38',
    },
    Menu: {
      darkItemBg: '#0F2647',
      darkSubMenuItemBg: '#0A1D38',
      darkItemSelectedBg: '#C9993E',
      darkItemSelectedColor: '#ffffff',
      darkItemHoverBg: 'rgba(201,153,62,0.15)',
      darkItemColor: 'rgba(255,255,255,0.75)',
    },
    Button: {
      primaryColor: '#ffffff',
    },
    Table: {
      headerBg: '#F0EDE6',
    },
  },
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={zhTW} theme={erpTheme}>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
