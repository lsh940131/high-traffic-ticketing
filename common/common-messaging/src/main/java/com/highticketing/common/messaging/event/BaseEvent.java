package com.highticketing.common.messaging.event;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.Instant;
import java.util.UUID;

@Getter
@SuperBuilder
@NoArgsConstructor
public abstract class BaseEvent {

    private String eventId;
    private String eventType;
    private Instant occurredAt;
    private String producer;
    private String traceId;
    private int version;

    protected void initializeBase(String eventType, String producer) {
        this.eventId = UUID.randomUUID().toString();
        this.eventType = eventType;
        this.occurredAt = Instant.now();
        this.producer = producer;
        this.version = 1;
    }

    protected void initializeBase(String eventType, String producer, String traceId) {
        initializeBase(eventType, producer);
        this.traceId = traceId;
    }
}
