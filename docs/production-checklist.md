# Production Checklist - Web Search Feature

## Overview
This document outlines all tasks required to make the web search feature production-ready.

## Status Summary
- ✅ Completed: 3/15
- 🚧 In Progress: 0/15
- ⏳ Pending: 12/15

---

## 🔴 Critical Priority (Must Have Before Production)

### 1. Environment Variable Validation ⏳
**Impact:** HIGH | **Effort:** LOW | **ETA:** 1 hour

**Current State:** API key checked at runtime
**Target State:** Validation at application startup

**Implementation:**
```typescript
// Add to app/config/env.ts
export function validateEnv() {
  const required = ['PERPLEXITY_API_KEY', 'AI_GATEWAY_API_KEY', 'DATABASE_URL'];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}
```

**Files to modify:**
- Create `app/config/env.ts`
- Import in `app/layout.tsx` or main entry point

---

### 2. Rate Limiting ⏳
**Impact:** HIGH | **Effort:** MEDIUM | **ETA:** 4 hours

**Current State:** No rate limiting
**Target State:** 10 requests per minute per user

**Implementation:** ✅ Created `lib/ai/rate-limiter.ts`

**Next Steps:**
1. Integrate rate limiter in `lib/ai/web-search.ts`:
```typescript
import { searchRateLimiter, RateLimitError } from './rate-limiter';

export async function searchWeb(
  query: string,
  maxResults: number = 5,
  userId?: string, // Add user identification
): Promise<SearchResult[]> {
  // Check rate limit
  const identifier = userId || 'anonymous';
  const allowed = await searchRateLimiter.checkLimit(identifier);

  if (!allowed) {
    const retryAfter = searchRateLimiter.getResetTime(identifier);
    const remaining = searchRateLimiter.getRemainingRequests(identifier);
    throw new RateLimitError(retryAfter, remaining);
  }

  // ... rest of implementation
}
```

2. Handle rate limit errors in API route:
```typescript
// app/api/search/route.ts
try {
  const results = await searchWeb(query, 5, userId);
  return Response.json(results);
} catch (error) {
  if (error instanceof RateLimitError) {
    return new Response(error.message, {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil(error.retryAfter / 1000)),
        'X-RateLimit-Remaining': String(error.remaining),
      },
    });
  }
  // ... other error handling
}
```

**Files to modify:**
- `lib/ai/web-search.ts`
- API route that calls `searchWeb()`

**Metrics to track:**
- Number of rate-limited requests
- Rate limit hit rate by user

---

### 3. Search Results Caching ⏳
**Impact:** HIGH | **Effort:** MEDIUM | **ETA:** 4 hours

**Current State:** Every search hits Perplexity API
**Target State:** Cache results for 1 hour

**Cost Impact:**
- Without cache: $0.005 per search × 1000 searches/day = $5/day = $150/month
- With 70% cache hit rate: $1.50/day = $45/month
- **Savings: ~$105/month**

**Implementation Options:**

**Option A: Redis (Recommended for production)**
```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function searchWeb(query: string, maxResults: number = 5) {
  const cacheKey = `search:${sanitizeQuery(query)}:${maxResults}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('Cache hit for query:', query);
    return cached as SearchResult[];
  }

  // Cache miss - call API
  const results = await fetchFromPerplexity(query, maxResults);

  // Cache for 1 hour (3600 seconds)
  await redis.set(cacheKey, results, { ex: 3600 });

  return results;
}
```

**Option B: In-memory cache (for development/testing)**
```typescript
import { LRUCache } from 'lru-cache';

const cache = new LRUCache<string, SearchResult[]>({
  max: 100, // Store up to 100 searches
  ttl: 1000 * 60 * 60, // 1 hour
});
```

**Files to create:**
- `lib/cache/search-cache.ts`

**Files to modify:**
- `lib/ai/web-search.ts`
- `.env.example` (add Redis credentials)

---

### 4. Error Monitoring & Alerting ⏳
**Impact:** HIGH | **Effort:** MEDIUM | **ETA:** 3 hours

**Current State:** Errors only logged to console
**Target State:** Structured error tracking with alerts

**Implementation:**
```bash
npm install @sentry/nextjs
```

```typescript
// lib/monitoring/error-tracker.ts
import * as Sentry from '@sentry/nextjs';

export function trackSearchError(error: Error, context: {
  query: string;
  attempt: number;
  duration: number;
}) {
  Sentry.captureException(error, {
    tags: {
      feature: 'web-search',
      provider: 'perplexity',
    },
    extra: context,
  });
}
```

**Alerts to configure:**
- Search error rate > 10%
- Search latency P95 > 15 seconds
- Rate limit hit rate > 50%
- Daily API cost > $10

**Files to create:**
- `lib/monitoring/error-tracker.ts`
- `sentry.client.config.ts`
- `sentry.server.config.ts`

---

### 5. Circuit Breaker Pattern ⏳
**Impact:** MEDIUM | **Effort:** MEDIUM | **ETA:** 4 hours

**Current State:** Retries even when API is consistently down
**Target State:** Stop trying after threshold of failures

**Why:** If Perplexity API is down, we waste time retrying. Circuit breaker opens after N failures and prevents further calls for a cooldown period.

**Implementation:**
```typescript
// lib/ai/circuit-breaker.ts
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold = 5, // Open after 5 failures
    private timeout = 60000, // Stay open for 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      console.error('Circuit breaker opened after', this.failures, 'failures');
    }
  }
}
```

**Files to create:**
- `lib/ai/circuit-breaker.ts`

---

## 🟡 Medium Priority (Important for Quality)

### 6. Unit Tests ⏳
**Impact:** MEDIUM | **Effort:** MEDIUM | **ETA:** 6 hours

**Test Coverage Goals:**
- `sanitizeQuery()`: 100%
- `isValidPerplexityResponse()`: 100%
- `parsePerplexityResults()`: 100%
- `searchWeb()`: 80%

**Files to create:**
```
__tests__/
  lib/
    ai/
      web-search.test.ts
      rate-limiter.test.ts
      circuit-breaker.test.ts
```

**Example test:**
```typescript
import { describe, it, expect } from 'vitest';
import { sanitizeQuery } from '@/lib/ai/web-search';

describe('sanitizeQuery', () => {
  it('should remove HTML tags', () => {
    expect(sanitizeQuery('<script>alert("xss")</script>'))
      .toBe('scriptalert("xss")/script');
  });

  it('should limit query length to 500 chars', () => {
    const longQuery = 'a'.repeat(600);
    expect(sanitizeQuery(longQuery).length).toBe(500);
  });

  it('should preserve search operators', () => {
    expect(sanitizeQuery('site:example.com query'))
      .toBe('site:example.com query');
  });
});
```

---

### 7. Integration Tests ⏳
**Impact:** MEDIUM | **Effort:** HIGH | **ETA:** 8 hours

**Test Scenarios:**
1. Successful search with mock API response
2. Timeout handling
3. Retry logic
4. Rate limiting
5. Circuit breaker activation
6. Cache hit/miss

**Files to create:**
- `__tests__/integration/web-search.integration.test.ts`

---

### 8. Structured Logging ⏳
**Impact:** MEDIUM | **Effort:** LOW | **ETA:** 2 hours

**Current State:** `console.log` and `console.error`
**Target State:** Structured JSON logs with correlation IDs

**Implementation:**
```typescript
// lib/logging/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'web-search' },
  transports: [
    new winston.transports.Console(),
  ],
});

// Usage in web-search.ts
logger.info('search_started', {
  query: sanitizedQuery,
  maxResults,
  userId,
  timestamp: new Date().toISOString(),
});

logger.error('search_failed', {
  query: sanitizedQuery,
  error: error.message,
  attempt,
  duration: Date.now() - startTime,
});
```

---

### 9. Usage Tracking & Cost Monitoring ⏳
**Impact:** MEDIUM | **Effort:** MEDIUM | **ETA:** 4 hours

**Metrics to track:**
- Total searches per day/hour
- Estimated API cost per search
- Cache hit rate
- Average latency
- Error rate by type

**Implementation:**
```typescript
// lib/analytics/usage-tracker.ts
export async function trackSearchUsage(data: {
  query: string;
  results: number;
  cached: boolean;
  duration: number;
  cost: number;
}) {
  // Send to analytics platform
  await analytics.track('web_search_completed', data);

  // Update metrics
  await metrics.increment('search.total');
  await metrics.gauge('search.latency', data.duration);
  if (data.cached) {
    await metrics.increment('search.cache_hit');
  }
}
```

---

### 10. Request Deduplication ⏳
**Impact:** LOW | **Effort:** MEDIUM | **ETA:** 3 hours

**Problem:** Multiple users searching for the same thing simultaneously results in duplicate API calls.

**Solution:** Use a promise map to deduplicate in-flight requests.

```typescript
const inFlightRequests = new Map<string, Promise<SearchResult[]>>();

async function searchWeb(query: string, maxResults: number = 5) {
  const cacheKey = `${sanitizeQuery(query)}:${maxResults}`;

  // Check if request is already in flight
  if (inFlightRequests.has(cacheKey)) {
    console.log('Deduplicating request for:', query);
    return inFlightRequests.get(cacheKey)!;
  }

  // Create new request
  const requestPromise = performSearch(query, maxResults)
    .finally(() => {
      inFlightRequests.delete(cacheKey);
    });

  inFlightRequests.set(cacheKey, requestPromise);
  return requestPromise;
}
```

---

## 🟢 Low Priority (Nice to Have)

### 11. Performance Metrics Dashboard ⏳
**Impact:** LOW | **Effort:** HIGH | **ETA:** 8 hours

Create a dashboard showing:
- Searches per hour (graph)
- Cache hit rate (%)
- P50/P95/P99 latency
- Cost per day
- Error rate by type

Tools: Grafana, Datadog, or custom Next.js dashboard

---

### 12. E2E Tests ⏳
**Impact:** LOW | **Effort:** MEDIUM | **ETA:** 6 hours

**Test Flow:**
1. User enters search query
2. Loading state appears
3. Results are displayed
4. Clicking result opens URL

Use Playwright or Cypress.

---

### 13. Graceful Fallback ⏳
**Impact:** LOW | **Effort:** MEDIUM | **ETA:** 4 hours

When Perplexity fails, fall back to:
- DuckDuckGo HTML scraping (original implementation)
- Or just return empty results with helpful message

---

### 14. API Documentation ⏳
**Impact:** LOW | **Effort:** LOW | **ETA:** 2 hours

Create `docs/web-search-api.md` with:
- API endpoints
- Request/response formats
- Rate limits
- Error codes
- Best practices

---

### 15. HTTP Caching Headers ⏳
**Impact:** LOW | **Effort:** LOW | **ETA:** 1 hour

Add caching headers to API responses:
```typescript
return new Response(JSON.stringify(results), {
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
  },
});
```

---

## Recommended Implementation Order

**Week 1: Critical Security & Reliability**
1. Environment variable validation (1h)
2. Rate limiting (4h)
3. Caching (4h)
4. Error monitoring setup (3h)

**Week 2: Testing & Observability**
5. Unit tests (6h)
6. Integration tests (8h)
7. Structured logging (2h)
8. Circuit breaker (4h)

**Week 3: Optimization & Polish**
9. Usage tracking (4h)
10. Request deduplication (3h)
11. Documentation (2h)
12. E2E tests (6h)

---

## Cost-Benefit Analysis

| Task | Implementation Time | Monthly Savings | ROI |
|------|---------------------|-----------------|-----|
| Caching | 4h | $105 | ⭐⭐⭐⭐⭐ |
| Rate Limiting | 4h | $50 (prevent abuse) | ⭐⭐⭐⭐ |
| Circuit Breaker | 4h | $20 (failed retries) | ⭐⭐⭐ |
| Request Dedup | 3h | $15 | ⭐⭐⭐ |

**Total Potential Savings:** ~$190/month with ~15 hours of work

---

## Production Readiness Checklist

Before deploying to production, ensure:

- [ ] All HIGH priority items completed
- [ ] Unit test coverage > 80%
- [ ] Integration tests passing
- [ ] Load testing completed (100+ concurrent users)
- [ ] Error monitoring configured with alerts
- [ ] Rate limiting tested and configured
- [ ] Caching tested with Redis
- [ ] Documentation updated
- [ ] Cost monitoring dashboard created
- [ ] Rollback plan documented
- [ ] On-call rotation assigned

---

## Monitoring Checklist

Once in production, monitor:

- [ ] Error rate < 1%
- [ ] P95 latency < 12 seconds
- [ ] Cache hit rate > 60%
- [ ] Daily cost < $10
- [ ] Rate limit hit rate < 10%
- [ ] Search success rate > 95%

---

## Emergency Contacts

- **Perplexity Support:** support@perplexity.ai
- **API Status Page:** https://status.perplexity.ai (if exists)
- **Documentation:** https://docs.perplexity.ai/

---

## Change Log

- 2025-01-19: Initial production checklist created
- 2025-01-19: Added rate limiter implementation
- 2025-01-19: Added cost-benefit analysis
