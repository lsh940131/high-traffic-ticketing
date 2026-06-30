# 트랜잭션 전략 (Prisma + 도메인 분리)

이 프로젝트의 DB 트랜잭션 처리 방침과 그 배경을 정리한다.

> **현재 방침 (2026-06 기준):** plain **Prisma** 그대로 사용. tx 전파(`@nestjs-cls/transactional`)는 **아직 도입하지 않음** — 묶을 곳이 얕아 필요가 분명치 않음. 트랜잭션 전파가 실제로 필요해지는 순간(여러 도메인 메서드를 한 tx로 묶고 싶을 때)에 이 문서의 §3을 보고 도입한다. 즉 이 문서는 "그때를 위한 결정 기록"이다.

핵심 원칙: **평소엔 Prisma를 그대로 쓰고, 여러 도메인/메서드를 하나의 트랜잭션으로 묶어야 할 때만 `@Transactional()`(ambient tx)을 쓴다.**

---

## 1. Prisma 트랜잭션 기본

두 가지 형태가 있다.

- **Sequential**: `prisma.$transaction([op1, op2])` — 배열에 넣은 연산을 한 트랜잭션으로. 중간 로직을 끼울 수 없어 제약이 큼.
- **Interactive**: `prisma.$transaction(async (tx) => { ... })` — 콜백에서 `tx` 클라이언트를 받아 그걸로 호출하면 한 트랜잭션. 로직 분기 가능. 실무에선 이게 기본.

```ts
await this.prisma.$transaction(async (tx) => {
  await tx.order.create({ data: {...} });
  await tx.seat.update({ where: {...}, data: { state: 'SOLD' } });
});
```

---

## 2. Prisma의 약점 — 트랜잭션 "전파(propagation)"가 없다

Spring `@Transactional`처럼 *암묵적으로 같은 tx에 올라타는* 전파가 없다.
`$transaction`의 `tx`는 `Prisma.TransactionClient` 타입이고, 다른 메서드가 그 tx에 참여하려면 **인자로 직접 넘겨야** 한다.

```ts
// tx를 손으로 threading — 모든 메서드에 db 파라미터가 붙는다(지저분 + 도메인 결합)
createOrder(dto, db: Prisma.TransactionClient | PrismaClient = this.prisma) {
  return db.order.create({ ... });
}
```

문제: 이 `db`/`tx` 파라미터가 **도메인 경계를 넘나들며 시그니처를 오염**시킨다. A 도메인이 B 도메인 메서드를 부를 때 `methodB(args, tx)`가 되어 결합이 생긴다 → 우리가 피하고 싶은 것.

---

## 3. 해결 — `@nestjs-cls/transactional` (ambient 트랜잭션)

`AsyncLocalStorage` 기반으로 tx를 컨텍스트에 저장해, 인자로 넘기지 않아도 중첩 호출이 자동으로 같은 tx에 참여하게 한다.

- **`nestjs-cls`** = NestJS용 CLS(=AsyncLocalStorage 래퍼). 요청 스코프 값을 async 체인 어디서나 접근.
- **`@nestjs-cls/transactional`** = 그 위의 DB 무관 트랜잭션 추상화.
  - `TransactionHost` — 현재 활성 tx 클라이언트 제공(`@Transactional()` 안이면 tx, 밖이면 일반 client).
  - `@Transactional()` — 메서드를 tx로 감싸고 tx를 CLS에 저장 → 전파.
- **어댑터로 ORM/드라이버 연결** — Prisma: `@nestjs-cls/transactional-adapter-prisma`. (TypeORM·Knex·Kysely·Drizzle·pg 등 어댑터 존재 → ORM-agnostic.)

```ts
// npm i nestjs-cls @nestjs-cls/transactional @nestjs-cls/transactional-adapter-prisma

ClsModule.forRoot({
  plugins: [
    new ClsPluginTransactional({
      imports: [PrismaModule],
      adapter: new TransactionalAdapterPrisma({ prismaInjectionToken: PrismaService }),
    }),
  ],
});

@Injectable()
class ReservationConfirmer {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma>) {}

  @Transactional()
  async confirm(evt) {
    await this.txHost.tx.order.create({ data: {...} });  // 같은 tx
    await this.seatDomain.markSold(evt.seatId);           // 내부도 txHost.tx → 같은 tx 자동
  }
}
```

`txHost.tx`가 `@Transactional()` 안에선 트랜잭션 클라이언트, 밖에선 일반 client로 자동 전환된다 → 메서드마다 `db?` 인자 달 필요가 사라진다.

---

## 4. 사용 원칙

1. **평소엔 Prisma 그대로.** 조회/단건 쓰기는 그냥 client(`this.prisma` 또는 `txHost.tx`) 사용. 무거운 조회는 `$queryRaw`.
2. **전파가 필요할 때만 `@Transactional()`.** 여러 메서드를 한 tx로 묶고 싶은 진입점에만 붙인다.
3. **전파 대상 코드의 DB 접근은 `txHost.tx`로 통일.** 전파 경계 안에서 `this.prisma`를 직접 쓰면 tx 밖 별도 커넥션이라 전파가 안 된다.
4. **`@Transactional()` 경계는 오케스트레이터(유스케이스) 계층에.** 각 도메인 메서드는 자기 영역 DB 작업만 하고, 여러 도메인을 조합하는 상위 메서드가 tx를 연다. 트랜잭션 경계 선언은 비즈니스 흐름 레벨에서 1번.

---

## 5. ⚠️ MSA 경계 — "도메인 ≠ 서비스"

**tx 전파는 같은 프로세스 + 같은 DB 안에서만 동작한다.**
도메인 A·B가 *다른 마이크로서비스*(다른 DB/프로세스)면 DB 트랜잭션이 건너갈 수 없다 → **Kafka 이벤트 + saga/outbox(결과적 일관성)** 로 처리한다.

- 서비스 **내부** 도메인 조합 → ambient tx(`@Transactional()`) OK.
- 서비스 **경계** → 이벤트로 넘김. 절대 서비스 간 DI로 tx 묶지 않는다.

이 프로젝트 구조가 이미 그렇다: `reservation-service → Kafka(reservation.requested) → payment-service`. tx 전파는 한 서비스 안에서만 쓴다.

---

## 6. 이 프로젝트 적용

- **payment-service**: 결제 성공 시 `Order 생성 + Seat SOLD`를 **한 tx**로 묶음.
  - `Order.seatId @unique` = DB 레벨 오버셀 2차 방어선(유니크 위반 = 이미 팔림).
  - 동시성 1차 게이트는 Redis(Lua); DB는 진실의 원천 + 최종 정합성.
- 도메인을 잘게 쪼갤 규모는 아님(over-abstraction 주의). Order/Seat 영속화를 한 도메인 서비스로 두고 consumer가 호출 + `@Transactional()` 한 곳이면 충분.
- 묶을 곳이 얕으면 `nestjs-cls` 없이 단순 `$transaction(async tx => {...})` 블록으로 가도 무방. (전파 패턴을 명시적으로 보여주려면 cls 도입.)

---

## 7. 참고 — 전파가 더 네이티브한 ORM

- **MikroORM** — Unit of Work + `RequestContext`(ALS) + `@Transactional()`로 원래부터 전파 모델.
- **TypeORM** — `typeorm-transactional` 라이브러리(cls 기반)로 Spring식 전파 제공.
- **Prisma** — 네이티브 전파는 없고, 위 `nestjs-cls/transactional`로 보완.

> 우리는 동시성을 Redis에 두고 DB는 유니크 제약 위주라 고급 락(`FOR UPDATE SKIP LOCKED`)이 불필요 → Prisma의 약점이 우리 설계엔 안 걸린다. 그래서 Prisma 유지.
