import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';
import { useLogout } from '@/features/auth/hooks';

// 임시 홈(추후 Figma 공연목록으로 대체). 로그인·로그아웃 확인용.
export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const nav = useNavigate();
  return (
    <div style={{ padding: 32 }}>
      <h1>홈 (임시)</h1>
      <p>{user ? `${user.name}님 로그인됨 (${user.email})` : '로그인 필요'}</p>
      <button
        onClick={() =>
          logout.mutate(undefined, { onSettled: () => nav('/login', { replace: true }) })
        }
      >
        로그아웃
      </button>
    </div>
  );
}
