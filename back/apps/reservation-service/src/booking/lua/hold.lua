-- 좌석 원자 선점(전부 성공 or 전부 실패). 유효 점유가 남의 것이면 실패.
-- KEYS[1] = holds:{concertId} (ZSET member=seatId score=만료ms)
-- KEYS[2] = holds:{concertId}:owner (HASH seatId->userId)
-- ARGV[1]=now(ms), ARGV[2]=expiry(ms), ARGV[3]=userId, ARGV[4..]=seatIds
local now = tonumber(ARGV[1])
local expiry = tonumber(ARGV[2])
local uid = ARGV[3]
for i = 4, #ARGV do
  local sc = redis.call('ZSCORE', KEYS[1], ARGV[i])
  if sc and tonumber(sc) > now then
    if redis.call('HGET', KEYS[2], ARGV[i]) ~= uid then return 0 end
  end
end
for i = 4, #ARGV do
  redis.call('ZADD', KEYS[1], expiry, ARGV[i])
  redis.call('HSET', KEYS[2], ARGV[i], uid)
end
return 1
