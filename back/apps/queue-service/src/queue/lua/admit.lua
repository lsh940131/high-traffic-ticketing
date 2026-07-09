-- 대기열 입장 펌프 (원자적): 만료 슬롯 회수 + 정원 여유만큼 앞에서 입장
-- KEYS[1] = waiting (ZSET, score=seq)
-- KEYS[2] = active  (ZSET, score=슬롯 만료 ms)
-- ARGV[1] = now(ms), ARGV[2] = capacity, ARGV[3] = slotTtlMs, ARGV[4] = batchLimit
-- 반환: 이번에 입장시킨 수
local now = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])
local batch = tonumber(ARGV[4])

-- 1) 만료된 활성 슬롯 회수
redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', now)

-- 2) 여유 정원 계산
local room = capacity - redis.call('ZCARD', KEYS[2])
if room <= 0 then return 0 end
if room > batch then room = batch end

-- 3) 대기열 앞(가장 낮은 seq)에서 room 만큼 꺼내 활성으로 이동
local popped = redis.call('ZPOPMIN', KEYS[1], room)
local expiry = now + ttl
local admitted = 0
for i = 1, #popped, 2 do
  redis.call('ZADD', KEYS[2], expiry, popped[i])
  admitted = admitted + 1
end
return admitted
