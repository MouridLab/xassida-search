---
name: nextjs-api
description: Design and harden Next.js Route Handlers. Use for API validation, authentication, authorization, status codes, payload limits, streaming, timeouts, or external integrations.
---

# Next.js API

Check validation, authentication, authorization, status codes, payload size, timeouts, external calls, streaming, and runtime constraints.

Use `400` invalid input, `401` unauthenticated, `403` forbidden, `404` missing, `409` conflict, `429` rate limit, and `500` internal failure. Never expose stack traces, SQL/MinIO/OpenAI internals, access tokens, or secrets. Add correlation identifiers when operational diagnosis needs them.
