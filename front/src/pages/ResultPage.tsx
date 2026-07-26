import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppBar, Button, StatusResult, type ResultVariant } from '@/shared/ui';
import { getOrder, retryPayment } from '@/features/booking/api';
import { formatWon } from '@/shared/lib/format';
import './ResultPage.css';

// S5+R · 결제 결과. 주문 상태 폴링 → StatusResult 4상태. 실패=재결제, 만료(재결제 실패)=재예매.
export default function ResultPage() {
  const { t } = useTranslation();
  const { orderId = '' } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [expired, setExpired] = useState(false);

  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrder(orderId),
    enabled: !!orderId,
    refetchInterval: (q) => (!expired && q.state.data?.status === 'PENDING' ? 1500 : false),
  });

  const retry = useMutation({
    mutationFn: () => retryPayment(orderId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['order', orderId] }),
    onError: () => setExpired(true), // hold 만료 등 → 재결제 불가
  });

  if (!order) {
    return (
      <div>
        <AppBar />
        <div className="result-stage">{t('common.loading')}</div>
      </div>
    );
  }

  const variant: ResultVariant = expired
    ? 'expired'
    : order.status === 'CONFIRMED'
      ? 'confirmed'
      : order.status === 'FAILED'
        ? 'failed'
        : order.status === 'CANCELLED'
          ? 'expired'
          : 'processing';

  const orderNoText = t('result.orderNo', { no: order.orderNo });
  let heading = '';
  let sub: string | undefined;
  let mini: string | undefined;
  let orderNo: string | undefined;
  let actions: React.ReactNode;

  if (variant === 'processing') {
    heading = t('result.processingHeading');
    sub = t('result.processingSub');
    orderNo = orderNoText;
  } else if (variant === 'confirmed') {
    heading = t('result.confirmedHeading');
    sub = orderNoText;
    mini = t('result.mini', {
      concert: order.concertName,
      qty: order.items.length,
      amount: formatWon(order.amount),
    });
    actions = (
      <>
        <Button fullWidth onClick={() => nav('/mypage')}>
          {t('result.viewMypage')}
        </Button>
        <Button variant="ghost" size="md" fullWidth onClick={() => nav('/')}>
          {t('result.home')}
        </Button>
      </>
    );
  } else if (variant === 'failed') {
    heading = t('result.failedHeading');
    sub = order.failReason ?? t('result.failedSub');
    actions = (
      <Button fullWidth disabled={retry.isPending} onClick={() => retry.mutate()}>
        {t('result.retry')}
      </Button>
    );
  } else {
    // expired
    heading = t('result.expiredHeading');
    sub = t('result.expiredSub');
    actions = (
      <Button fullWidth onClick={() => nav('/')}>
        {t('result.rebook')}
      </Button>
    );
  }

  return (
    <div>
      <AppBar />
      <div className="result-stage">
        <StatusResult
          variant={variant}
          heading={heading}
          sub={sub}
          orderNo={orderNo}
          mini={mini}
          actions={actions}
        />
      </div>
    </div>
  );
}
