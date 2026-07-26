import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// 라우트(pathname) 변경 시 스크롤을 최상단으로. (결제→결과 등 이동 시 이전 스크롤 위치 잔존 방지)
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
