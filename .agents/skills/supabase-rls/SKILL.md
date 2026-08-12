---
name: supabase-rls
description: Review and harden Supabase PostgreSQL Row Level Security policies. Use for schema, role, policy, public-data, admin-data, or direct Supabase access changes.
---

# Supabase RLS

Treat RLS as an independent security boundary; application checks do not replace it.

For every sensitive table, map `operation → actor → policy → resources`. Inspect SELECT, INSERT, UPDATE, and DELETE separately. Test anonymous, normal authenticated, editor, validator, and admin actors. Reject `using (true)`, missing `with check`, user-modifiable authorization predicates, cross-resource access, and role escalation. Include a regression test with every RLS correction.
