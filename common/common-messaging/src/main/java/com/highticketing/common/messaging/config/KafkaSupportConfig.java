package com.highticketing.common.messaging.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.listener.CommonErrorHandler;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.util.backoff.FixedBackOff;

@Slf4j
@Configuration
public class KafkaSupportConfig {

  private static final long RETRY_INTERVAL_MS = 1000L;
  private static final long MAX_RETRY_ATTEMPTS = 3L;

  @Bean
  public CommonErrorHandler kafkaErrorHandler() {
    DefaultErrorHandler errorHandler =
        new DefaultErrorHandler(
            (consumerRecord, exception) -> {
              log.error(
                  "Kafka message processing failed after retries. topic={}, partition={}, offset={}, key={}",
                  consumerRecord.topic(),
                  consumerRecord.partition(),
                  consumerRecord.offset(),
                  consumerRecord.key(),
                  exception);
            },
            new FixedBackOff(RETRY_INTERVAL_MS, MAX_RETRY_ATTEMPTS));
    return errorHandler;
  }

  public static <T> JsonDeserializer<T> createJsonDeserializer(Class<T> targetType) {
    JsonDeserializer<T> deserializer = new JsonDeserializer<>(targetType);
    deserializer.setRemoveTypeHeaders(false);
    deserializer.addTrustedPackages("com.highticketing.*");
    deserializer.setUseTypeMapperForKey(false);
    return deserializer;
  }
}
