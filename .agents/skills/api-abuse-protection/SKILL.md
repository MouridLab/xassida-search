---
name: api-abuse-protection
description: Protect public or costly APIs, especially OpenAI-backed endpoints, with validation, rate limits, quotas, timeouts, concurrency controls, caching, and safe upstream errors.
---

# API Abuse Protection

Trace every costly stage: request, embedding, retrieval, generation, response.

- Bound payload size and validate strictly.
- Add rate limits and appropriate quotas.
- Bound time and concurrency for external calls.
- Cache only when invalidation and privacy are clear.
- Return `429` for limits and safe errors for upstream failures.
- Prefer existing infrastructure; do not add Redis by default.
- Document infrastructure and proxy assumptions that cannot be verified in the repository.
