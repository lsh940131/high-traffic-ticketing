-- 원자적 재고 차감 + 좌석 점유. 반환: 1=성공, 0=재고없음, -1=이미 점유/판매
local seatState = redis.call('HGET', KEYS[2], ARGV[1])
if seatState == 'SOLD' or seatState == 'HELD' then return -1 end
local stock = tonumber(redis.call('GET', KEYS[1]) or '0')
if stock <= 0 then return 0 end
redis.call('DECR', KEYS[1])
redis.call('HSET', KEYS[2], ARGV[1], 'HELD')
redis.call('SET', KEYS[2] .. ':hold:' .. ARGV[1], ARGV[2], 'EX', tonumber(ARGV[3]))
return 1
