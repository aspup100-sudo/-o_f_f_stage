/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 로고의 보라(#5E56D0)를 기준으로 한 브랜드 색
        brand: { 50: '#f1f0fc', 100: '#e2e0f9', 200: '#c5c1f2', 400: '#8b84e3', 500: '#5e56d0', 600: '#4c44b9', 700: '#3b3495' },
        ink: { 900: '#111111', 700: '#3f3f46', 500: '#71717a', 300: '#d4d4d8', 100: '#f4f4f5' },
      },
      fontFamily: { sans: ['Pretendard Variable', 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
