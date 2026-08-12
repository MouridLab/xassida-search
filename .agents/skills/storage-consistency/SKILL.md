---
name: storage-consistency
description: Make workflows spanning PostgreSQL, Supabase, and MinIO resilient. Use for uploads, replacements, editions, imports, retries, cleanup, and reconciliation.
---

# Storage Consistency

Treat MinIO plus PostgreSQL as a distributed workflow, never as one fictional transaction.

1. Enumerate states and every failure point.
2. Keep related SQL mutations transactional.
3. Upload before metadata activation, but compensate MinIO if SQL fails.
4. Never remove or deactivate the old primary before replacement is guaranteed.
5. Make retries and compensation safe to repeat.
6. Account for unique constraints and concurrent requests.
7. Provide reconciliation for orphaned objects.

Test success, SQL failure after upload, duplicates, replacement, relevant concurrency, and compensation failure.
