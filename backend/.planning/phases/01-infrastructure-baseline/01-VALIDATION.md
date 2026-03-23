---
phase: 1
slug: infrastructure-baseline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (to be installed — Wave 0) |
| **Config file** | vitest.config.ts — Wave 0 installs |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | INFRA-01 | integration | `npx vitest run src/tests/infra/connection-pool.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | INFRA-02 | integration | `npx vitest run src/tests/infra/compression.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | INFRA-03 | integration | `npx vitest run src/tests/infra/timeout.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 1 | INFRA-04 | integration | `npx vitest run src/tests/infra/slow-query-logging.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/tests/infra/connection-pool.test.ts` — stubs for INFRA-01
- [ ] `src/tests/infra/compression.test.ts` — stubs for INFRA-02
- [ ] `src/tests/infra/timeout.test.ts` — stubs for INFRA-03
- [ ] `src/tests/infra/slow-query-logging.test.ts` — stubs for INFRA-04
- [ ] `src/tests/helpers/app.ts` — shared Express app test helper
- [ ] `vitest` + `supertest` — install if not present

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Connection pool under real concurrent load | INFRA-01 | Requires live DB + load tool | Run `npx autocannon -c 50 http://localhost:3000/api/health` and verify no "too many clients" errors in logs |
| gzip visible in browser DevTools | INFRA-02 | Visual confirmation in Network tab | Open any API endpoint in browser DevTools → Network → check `Content-Encoding: gzip` header |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
