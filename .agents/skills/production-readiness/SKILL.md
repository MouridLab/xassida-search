---
name: production-readiness
description: Assess operational consequences of code changes. Use when a fix may require migrations, secrets, environment variables, CORS, infrastructure, monitoring, deployment, or rollback work.
---

# Production Readiness

Before declaring a fix complete, identify required migrations, variables, secrets, Supabase settings, MinIO/CORS settings, infrastructure, CI, monitoring, and rollback steps. Distinguish repository changes from external configuration. Mark unverified external controls explicitly; never claim they are fixed from code alone.
