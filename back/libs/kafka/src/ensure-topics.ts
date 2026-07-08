import { Kafka } from 'kafkajs';

/**
 * 토픽을 멱등하게 미리 생성한다.
 *
 * KRaft 브로커는 볼륨 없이 매 기동 새로 포맷되어 토픽이 비어 있다.
 * 이때 consumer가 존재하지 않는 토픽을 subscribe하면 메타데이터 조회에서
 * UNKNOWN_TOPIC_OR_PARTITION(code 3)으로 프로세스가 죽는다.
 * auto-create는 producer 경로에서만 안정적이라, consumer 쪽은 선제 생성이 안전하다.
 *
 * createTopics는 이미 있으면 false만 반환(에러 X)하므로 재기동에도 안전.
 */
export async function ensureTopics(kafka: Kafka, topics: string[]): Promise<void> {
  const admin = kafka.admin();
  await admin.connect();
  try {
    await admin.createTopics({
      waitForLeaders: true,
      topics: topics.map((topic) => ({ topic, numPartitions: 1, replicationFactor: 1 })),
    });
  } finally {
    await admin.disconnect();
  }
}
