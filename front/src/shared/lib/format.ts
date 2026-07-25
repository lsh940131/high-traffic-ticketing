export const formatWon = (n: number) => n.toLocaleString('ko-KR');

const DOW = ['일', '월', '화', '수', '목', '금', '토'];
export const formatDate = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
};
export const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${formatDate(iso)} (${DOW[d.getDay()]}) ${p(d.getHours())}:${p(d.getMinutes())}`;
};
