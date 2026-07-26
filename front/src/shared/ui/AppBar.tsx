import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './AppBar.css';

/** 상단 네비게이션. 로고 + 마이페이지 링크만.
 *  로그아웃·언어·테마 토글은 전부 마이페이지로 이동(헤더 간결화).
 *  아바타는 마이페이지 링크와 목적지가 겹쳐 제거. */
export default function AppBar() {
  const { t } = useTranslation();
  return (
    <header className="appbar">
      <div className="appbar__inner">
        <Link to="/" className="appbar__logo">
          {t('common.appName')}
        </Link>
        <div className="appbar__right">
          <Link to="/mypage" className="appbar__link">
            {t('common.mypage')}
          </Link>
        </div>
      </div>
    </header>
  );
}
