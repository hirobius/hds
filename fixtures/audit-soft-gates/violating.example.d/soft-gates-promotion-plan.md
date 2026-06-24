# Soft-Gate Promotion Plan

> Generated 2026-06-24T07:10:57.191Z

## Summary

**Total soft gates audited:** 1 (of 1 registered)

| Recommendation        | Count |
| --------------------- | ----- |
| promote-to-pre-commit | 0     |
| promote-to-pre-push   | 0     |
| promote-to-ci-pr      | 0     |
| baseline-then-promote | 0     |
| investigate-broken    | 1     |
| stay-soft             | 0     |

## Promotable now (clean + fast)

These gates exited 0 on the current tree and are fast enough to promote without a baseline.

_None._

## Promotable after baseline

These gates found violations on the current tree. Record a baseline, burn down the violations, then promote.

_None._

## Investigate

These gates crashed, timed out, or returned an unexpected exit code. Fix before considering promotion.

| id                    | current channel | severity | exit code | error |
| --------------------- | --------------- | -------- | --------- | ----- |
| fake-soft-gate-broken | manual          | warn     | 1         |       |

## Stay soft

These gates are slow (>5s), info-severity, or are artifact-generators — appropriate as manual / ci-scheduled only.

_None._

## Estimated A4 score lift

Current A4 (Strict Gating): **34/100** (25/74 strict).
If Adrian accepts all 0 "Promotable now" recommendations, strict count rises to **25/74** → A4 score **34/100** (+0 points).

> This plan is advisory only. No firingChannel values have been changed.
> Run `pnpm audit:soft-gates` again after any promotions to verify the updated baseline.
