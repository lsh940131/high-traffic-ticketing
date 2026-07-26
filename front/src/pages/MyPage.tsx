import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppBar, Footer, Button, BookingRow, ConfirmDialog, type BadgeTone } from '@/shared/ui';
import { listOrders, cancelOrder, type OrderView } from '@/features/booking/api';
import { formatDateTime, formatWon } from '@/shared/lib/format';
import './MyPage.css';

type Kind = 'confirmed' | 'watched' | 'cancelled' | 'pending' | 'failed';

// 주문 상태 + 공연일로 표시 종류 파생. CONFIRMED는 공연 지났으면 관람완료.
function kindOf(o: OrderView, now: number): Kind {
  if (o.status === 'CANCELLED') return 'cancelled';
  if (o.status === 'PENDING') return 'pending';
  if (o.status === 'FAILED') return 'failed';
  return new Date(o.endsAt).getTime() < now ? 'watched' : 'confirmed';
}
const TONE: Record<Kind, BadgeTone> = {
  confirmed: 'success',
  watched: 'neutral',
  cancelled: 'danger',
  pending: 'warning',
  failed: 'danger',
};

// M · 마이페이지. 예매 내역 리스트. 예매완료만 취소 가능(ConfirmDialog).
export default function MyPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['orders'], queryFn: listOrders });
  const [cancelId, setCancelId] = useState<string | null>(null);

  const cancel = useMutation({
    mutationFn: (orderId: string) => cancelOrder(orderId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
    onSettled: () => setCancelId(null),
  });

  const now = Date.now();

  return (
    <div>
      <AppBar />
      <main className="mypage-wrap">
        <h1 className="mypage-title">{t('mypage.title')}</h1>
        <p className="mypage-count">{t('mypage.count', { n: data?.length ?? 0 })}</p>

        {isLoading ? (
          <p className="mypage-empty">{t('common.loading')}</p>
        ) : !data || data.length === 0 ? (
          <p className="mypage-empty">{t('mypage.empty')}</p>
        ) : (
          <div className="mypage-list">
            {data.map((o) => {
              const kind = kindOf(o, now);
              const seat = `${o.items.map((i) => i.seatLabel).join(', ')} · ${o.items.length}${t('mypage.unit')}`;
              return (
                <BookingRow
                  key={o.orderId}
                  posterUrl={o.posterUrl}
                  badge={{ tone: TONE[kind], label: t(`mypage.status.${kind}`) }}
                  orderNo={t('mypage.orderNo', { no: o.orderNo })}
                  title={o.concertName}
                  meta={`${formatDateTime(o.startsAt)} · ${o.venueName}`}
                  seat={seat}
                  price={t('mypage.won', { n: formatWon(o.amount) })}
                  dimmed={kind === 'cancelled'}
                  action={
                    kind === 'confirmed' ? (
                      <Button variant="ghost" size="sm" onClick={() => setCancelId(o.orderId)}>
                        {t('mypage.cancelBtn')}
                      </Button>
                    ) : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </main>
      <Footer />

      <ConfirmDialog
        open={cancelId !== null}
        title={t('mypage.cancelTitle')}
        body={t('mypage.cancelBody')}
        confirmLabel={t('mypage.cancelConfirm')}
        cancelLabel={t('mypage.cancelBack')}
        danger
        onConfirm={() => cancelId && cancel.mutate(cancelId)}
        onCancel={() => setCancelId(null)}
      />
    </div>
  );
}
