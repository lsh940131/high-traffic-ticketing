package com.highticketing.common.messaging.topic;

public final class Topics {

    private Topics() {
    }

    public static final String QUEUE_GRANTED = "queue.granted";
    public static final String PAYMENT_REQUESTED = "payment.requested";
    public static final String PAYMENT_RESULT = "payment.result";
    public static final String RESERVATION_COMPLETED = "reservation.completed";
}
