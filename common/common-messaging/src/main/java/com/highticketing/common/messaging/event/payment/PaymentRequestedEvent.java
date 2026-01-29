package com.highticketing.common.messaging.event.payment;

import com.highticketing.common.messaging.event.BaseEvent;
import java.math.BigDecimal;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class PaymentRequestedEvent extends BaseEvent {

  private Long reservationId;
  private Long userId;
  private BigDecimal amount;

  @Builder
  public PaymentRequestedEvent(
      Long reservationId, Long userId, BigDecimal amount, String producer, String traceId) {
    this.reservationId = reservationId;
    this.userId = userId;
    this.amount = amount;
    initializeBase("PAYMENT_REQUESTED", producer, traceId);
  }
}
