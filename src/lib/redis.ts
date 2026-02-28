import Redis from "ioredis"

const client = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
})

// Shim that matches the @upstash/redis interface used throughout the app.
// ioredis stores raw strings, so we JSON-encode on write and decode on read.
export const redis = {
  async get<T>(key: string): Promise<T | null> {
    const val = await client.get(key)
    if (!val) return null
    try {
      return JSON.parse(val) as T
    } catch {
      return null
    }
  },
  async set(key: string, value: unknown): Promise<void> {
    await client.set(key, JSON.stringify(value))
  },
}
