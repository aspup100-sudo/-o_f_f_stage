/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#fff4ef', 100: '#ffe4d6', 200: '#ffc6a8', 400: '#ff8a5b', 500: '#ff6b35', 600: '#e85520', 700: '#c0410f' },
        ink: { 900: '#1c1917', 700: '#44403c', 500: '#78716c', 300: '#d6d3d1', 100: '#f5f5f4' },
      },
      fontFamily: { sans: ['Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
