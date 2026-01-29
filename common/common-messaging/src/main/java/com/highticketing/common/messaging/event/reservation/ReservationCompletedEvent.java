package com.highticketing.common.messaging.event.reservation;

import com.highticketing.common.messaging.event.BaseEvent;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ReservationCompletedEvent extends BaseEvent {

  private Long reservationId;
  private Long userId;
  private Long seatId;
  private ReservationStatus status;
  private String reason;

  @Builder
  public ReservationCompletedEvent(
      Long reservationId,
      Long userId,
      Long seatId,
      ReservationStatus status,
      String reason,
      String producer,
      String traceId) {
    this.reservationId = reservationId;
    this.userId = userId;
    this.seatId = seatId;
    this.status = status;
    this.reason = reason;
    initializeBase("RESERVATION_COMPLETED", producer, traceId);
  }
}
