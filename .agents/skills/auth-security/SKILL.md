---
name: auth-security
description: Secure Supabase authentication, profiles, roles, invitations, promotions, admin access, and protected APIs. Use when changing identity, authorization, privileged roles, or staff workflows.
---

# Auth Security

Separate authentication from authorization. Verify `identity → role → permission → resource` server-side.

- Treat `editor`, `validator`, and `admin` as privileged.
- Give new users a non-privileged role such as `pending`.
- Inspect profile defaults, triggers, constraints, RLS, API guards, invitations, and promotions before editing.
- Never trust a client-provided role.
- Preserve legitimate existing staff during migrations.
- Test anonymous `401`, non-staff `403`, and expected editor/validator/admin access.
- Test direct Supabase access so RLS remains the final boundary.
