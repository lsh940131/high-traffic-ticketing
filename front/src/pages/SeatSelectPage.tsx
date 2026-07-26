import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppBar, Footer, Button, SeatTile, ZoneBlock, type SeatState } from '@/shared/ui';
import { useConcert, useSeatMap, useBlockSeats } from '@/features/concert/hooks';
import type { SeatBlock, SeatCell } from '@/features/concert/api';
import { holdSeats } from '@/features/booking/api';
import { useBookingStore } from '@/features/booking/store';
import { formatDateTime, formatWon } from '@/shared/lib/format';
import './SeatSelectPage.css';

const FLOOR_ORDER = ['FLOOR', '1F', '2F', '3F'];
const GRADE_FLOOR: Record<string, string> = { STANDING: 'FLOOR', R: '1F', S: '2F', A: '3F' };
const MAX = 2;

// P3 · 좌석 선택. 좌(구역맵→좌석/수량→범례) / 우(등급·선택·합계·다음). 스탠딩=수량, 지정석=좌석.
export default function SeatSelectPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const nav = useNavigate();
  const setSummary = useBookingStore((s) => s.setSummary);

  const { data: concert } = useConcert(id);
  const { data: map, isLoading } = useSeatMap(id);

  const [block, setBlock] = useState<string | null>(null);
  const [seats, setSeats] = useState<SeatCell[]>([]); // 지정석 선택
  const [qty, setQty] = useState(0); // 스탠딩 수량
  const [pending, setPending] = useState(false);

  const { data: blockData } = useBlockSeats(id, block && block !== 'STANDING' ? block : null);
  const standing = block === 'STANDING';

  const floorLabel = (code: string) => t(`seat.floor${code}`);
  const gradeLabel = (g: string) =>
    g === 'STANDING'
      ? t('seat.gradeStanding')
      : `${g}석 (${floorLabel(GRADE_FLOOR[g] ?? 'FLOOR')})`;
  const seatLabel = (s: SeatCell) =>
    `${floorLabel(s.floor)} ${s.section}구역 · ${s.row}열 ${s.seatNo}번`;

  // 층별 블록 그룹
  const tiers = useMemo(() => {
    if (!map) return [];
    const byFloor = new Map<string, SeatBlock[]>();
    for (const b of map.blocks) {
      if (b.standing) continue;
      const arr = byFloor.get(b.floor) ?? [];
      arr.push(b);
      byFloor.set(b.floor, arr);
    }
    return FLOOR_ORDER.filter((f) => byFloor.has(f)).map((f) => ({
      floor: f,
      blocks: byFloor.get(f)!.sort((a, b) => a.blockId.localeCompare(b.blockId)),
    }));
  }, [map]);
  const standingBlock = map?.blocks.find((b) => b.standing) ?? null;
  const standingPrice = standingBlock?.price ?? 0;

  const selectBlock = (b: SeatBlock) => {
    if (b.remaining === 0) return;
    setBlock(b.blockId);
    if (b.standing) {
      setSeats([]);
      setQty((q) => q || 1);
    } else {
      setQty(0);
    }
  };

  const toggleSeat = (s: SeatCell) => {
    if (s.status !== 'AVAILABLE') return;
    setQty(0);
    setSeats((prev) => {
      const exists = prev.find((p) => p.ticketId === s.ticketId);
      if (exists) return prev.filter((p) => p.ticketId !== s.ticketId);
      if (prev.length >= MAX) return prev;
      return [...prev, s];
    });
  };

  const count = standing ? qty : seats.length;
  const amount = standing ? standingPrice * qty : seats.reduce((sum, s) => sum + s.price, 0);
  const canNext = count > 0 && !pending;

  const next = async () => {
    if (!concert || !map) return;
    setPending(true);
    try {
      const hold = await holdSeats(
        standing ? { standingQty: qty } : { ticketIds: seats.map((s) => s.ticketId) },
      );
      setSummary({
        concertId: id,
        concertName: concert.name,
        venueName: map.venueName,
        startsAt: concert.startsAt,
        lines: standing ? [t('seat.standingLine', { n: qty })] : seats.map(seatLabel),
        qty: count,
        amount,
        hold,
      });
      nav(`/concerts/${id}/order`);
    } catch {
      setPending(false); // 인터셉터가 에러 알림. 좌석이 이미 선점됐을 수 있음.
    }
  };

  // 좌석 그리드: 행별 그룹
  const rows = useMemo(() => {
    if (!blockData) return [];
    const byRow = new Map<string, SeatCell[]>();
    for (const s of blockData.seats) {
      const arr = byRow.get(s.row) ?? [];
      arr.push(s);
      byRow.set(s.row, arr);
    }
    return [...byRow.entries()].map(([row, cells]) => ({
      row,
      cells: cells.sort((a, b) => a.seatNo - b.seatNo),
    }));
  }, [blockData]);

  if (isLoading || !map) {
    return (
      <div>
        <AppBar />
        <p className="seat-wrap">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div>
      <AppBar />
      <main className="seat-wrap">
        <h1 className="seat-title">{t('seat.title')}</h1>
        <div className="seat-cols">
          {/* 좌: 좌석맵 */}
          <section className="seatmap-card">
            <div className="seatmap-card__venue">{map.venueName}</div>
            <div className="seatmap-card__sub">{t('seat.venueSub')}</div>

            <div className="seat-stage">STAGE</div>

            <div className="seat-zones">
              {standingBlock && (
                <div className="seat-floor">
                  <ZoneBlock
                    label={t('seat.floorStandingBlock')}
                    state={
                      standingBlock.remaining === 0 ? 'disabled' : standing ? 'selected' : 'default'
                    }
                    onClick={() => selectBlock(standingBlock)}
                  />
                </div>
              )}
              {tiers.map((tier) => (
                <div key={tier.floor}>
                  <div className="seat-tier__label">
                    {floorLabel(tier.floor)} · {tier.blocks[0].grade}석
                  </div>
                  <div className="seat-tier__blocks">
                    {tier.blocks.map((b) => (
                      <ZoneBlock
                        key={b.blockId}
                        label={b.blockId}
                        state={
                          b.remaining === 0
                            ? 'disabled'
                            : block === b.blockId
                              ? 'selected'
                              : 'default'
                        }
                        onClick={() => selectBlock(b)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* 좌석 그리드 / 스탠딩 수량 */}
            {standing ? (
              <div className="seat-standing">
                <div className="seat-grid-header">{t('seat.standingPick')}</div>
                <div className="seat-qty">
                  <button
                    className="seat-qty__btn"
                    disabled={qty <= 1}
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                  >
                    −
                  </button>
                  <span className="seat-qty__n">{qty}</span>
                  <button
                    className="seat-qty__btn"
                    disabled={qty >= MAX}
                    onClick={() => setQty((q) => Math.min(MAX, q + 1))}
                  >
                    +
                  </button>
                </div>
              </div>
            ) : block && blockData ? (
              <>
                <div className="seat-grid-header">
                  {t('seat.gridHeaderSeat', {
                    floor: floorLabel(blockData.seats[0]?.floor ?? '1F'),
                    block,
                    grade: blockData.grade,
                  })}
                </div>
                <div className="seat-grid">
                  {rows.map(({ row, cells }) => (
                    <div key={row} className="seat-grid__row">
                      {cells.map((s) => {
                        const selected = seats.some((p) => p.ticketId === s.ticketId);
                        const state: SeatState = selected
                          ? 'selected'
                          : s.status === 'AVAILABLE'
                            ? 'can'
                            : 'disabled';
                        return (
                          <SeatTile
                            key={s.ticketId}
                            state={state}
                            label={seatLabel(s)}
                            onClick={() => toggleSeat(s)}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="seat-empty">{t('seat.gridEmpty')}</div>
            )}

            <div className="seat-legend">
              <span className="seat-legend__item">
                <span className="seat-legend__sw seat-legend__sw--can" />
                {t('seat.legendCan')}
              </span>
              <span className="seat-legend__item">
                <span className="seat-legend__sw seat-legend__sw--sel" />
                {t('seat.legendSel')}
              </span>
              <span className="seat-legend__item">
                <span className="seat-legend__sw seat-legend__sw--dis" />
                {t('seat.legendDis')}
              </span>
            </div>
          </section>

          {/* 우: 예약 패널 */}
          <aside className="book-panel">
            {concert && (
              <div className="book-ctx">
                <div className="book-ctx__title">{concert.name}</div>
                <div className="book-ctx__meta">
                  {formatDateTime(concert.startsAt)} · {map.venueName}
                </div>
              </div>
            )}

            <div className="book-h">{t('seat.gradesH')}</div>
            <div className="book-grades">
              {map.grades.map((g) => {
                const soldout = g.remaining === 0;
                const active = block
                  ? standing
                    ? g.grade === 'STANDING'
                    : blockData?.grade === g.grade
                  : false;
                return (
                  <button
                    key={g.grade}
                    className={`book-grade ${active ? 'book-grade--active' : ''} ${soldout ? 'book-grade--soldout' : ''}`}
                    disabled={soldout}
                    onClick={() => {
                      if (g.grade === 'STANDING') {
                        if (standingBlock) selectBlock(standingBlock);
                      } else {
                        const first = map.blocks.find(
                          (b) => b.grade === g.grade && b.remaining > 0,
                        );
                        if (first) selectBlock(first);
                      }
                    }}
                  >
                    <span className="book-grade__g">{gradeLabel(g.grade)}</span>
                    <span className="book-grade__p">
                      ₩{formatWon(g.price)} · {t('seat.remain', { n: g.remaining })}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="book-h">{t('seat.seatsH', { n: count })}</div>
            <div className="book-chips">
              {standing
                ? qty > 0 && (
                    <div className="book-chip">
                      <span>{t('seat.standingLine', { n: qty })}</span>
                      <button className="book-chip__x" onClick={() => setQty(0)}>
                        ✕
                      </button>
                    </div>
                  )
                : seats.map((s) => (
                    <div key={s.ticketId} className="book-chip">
                      <span>{seatLabel(s)}</span>
                      <button className="book-chip__x" onClick={() => toggleSeat(s)}>
                        ✕
                      </button>
                    </div>
                  ))}
            </div>
            <div className="book-note">{t('seat.note')}</div>

            <div className="book-divider" />
            <div className="book-total">
              <span className="book-total__label">{t('seat.total', { n: count })}</span>
              <span className="book-total__amt">₩{formatWon(amount)}</span>
            </div>
            <Button fullWidth disabled={!canNext} onClick={next}>
              {t('seat.next')}
            </Button>
            <div className="book-timer-note">{t('seat.timerNote')}</div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
