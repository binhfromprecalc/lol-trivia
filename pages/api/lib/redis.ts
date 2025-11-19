import { createClient } from "redis";

const redis = createClient({
  url: process.env.REDIS_URL,
});

redis.on("error", (err) => console.error("Redis error:", err));

if (!redis.isOpen) {
  redis.connect();
}

export default redis;
