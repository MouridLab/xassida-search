---
name: testing-strategy
description: Build a minimal risk-based automated test safety net. Use when adding tests, selecting test levels, introducing a test runner, or protecting security and data workflows.
---

# Testing Strategy

Maximize risk covered per unit of test effort. Prioritize authorization, RLS, critical mutations, uploads, editorial workflow, RAG, then essential E2E paths.

Prefer integration tests for DB/RLS, API tests for auth and status codes, unit tests for pure logic, and limited E2E tests for critical journeys. Avoid snapshots without behavioral value, excessive mocking, and implementation-coupled tests. If no runner exists, add one minimal tool compatible with the repository.
