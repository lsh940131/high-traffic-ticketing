package com.highticketing.common.messaging.event.payment;

import com.highticketing.common.messaging.event.BaseEvent;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class PaymentResultEvent extends BaseEvent {

    private Long reservationId;
    private PaymentStatus status;
    private String reason;

    @Builder
    public PaymentResultEvent(Long reservationId, PaymentStatus status, String reason,
                               String producer, String traceId) {
        this.reservationId = reservationId;
        this.status = status;
        this.reason = reason;
        initializeBase("PAYMENT_RESULT", producer, traceId);
    }
}
