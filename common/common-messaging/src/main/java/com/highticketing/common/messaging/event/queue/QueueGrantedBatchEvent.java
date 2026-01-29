package com.highticketing.common.messaging.event.queue;

import com.highticketing.common.messaging.event.BaseEvent;
import java.time.Instant;
import java.util.List;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class QueueGrantedBatchEvent extends BaseEvent {

  private String grantId;
  private List<String> tokens;
  private Instant expiresAt;

  @Builder
  public QueueGrantedBatchEvent(
      String grantId, List<String> tokens, Instant expiresAt, String producer, String traceId) {
    this.grantId = grantId;
    this.tokens = tokens;
    this.expiresAt = expiresAt;
    initializeBase("QUEUE_GRANTED_BATCH", producer, traceId);
  }
}
