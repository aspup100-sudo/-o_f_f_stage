import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { LIVE } from './edition';
import { initAuth } from './store/auth';

if (LIVE) initAuth();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// 웹에 올렸을 때 홈 화면 설치·오프라인 실행을 위한 서비스 워커. 미리보기 환경에서는 조용히 넘어간다.
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
