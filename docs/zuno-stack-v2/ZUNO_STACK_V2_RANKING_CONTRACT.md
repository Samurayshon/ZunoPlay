# Zuno Stack V2 — Phase 8 Ranking Contract

Status: Phase 8 foundation contract. This document does not implement Player Authority, Aura, XP or rewards.

## Trust boundary

Ranking accepts only an immutable server-produced `VerifiedMatchResult` with `valid === true`. Client claims for rank, points, winner, score, season, eligibility or rewards are never accepted as ranking writes.

Pipeline:

`VerifiedMatchResult -> Ranking Eligibility -> Idempotent Ranking Processor -> Mode Leaderboard + Performance History`

Player Authority is a future downstream consumer and is explicitly outside Phase 8.

## Logical stores

Ranking has three independent logical ladders: `solo`, `trio`, and `pvp`. A ranking update key is `(seasonId, mode, matchId, formulaVersion)`. The same key can be consumed at most once. History stores the applied deterministic delta and verified facts needed to audit/rebuild standings.

## Formula version and seasons

Initial formula version: `ranking-r1`. Initial season is supplied by trusted server configuration, never by match client payload. Seasons are lightweight namespaces with `seasonId`, `startsAt`, `endsAt|null`, and `formulaVersion`. No automatic rollover complexity is required in the foundation.

## Deterministic scoring foundation

The first formula intentionally uses only facts available in the current VerifiedMatchResult contract.

### Solo

Eligible terminal verified result. Ranking delta = verified player score. Tie-break facts: fewer remaining tiles, then earlier authoritative finish time. No client duration or score claim is consumed.

### Trio

Eligible terminal verified result. Each authenticated team participant receives the same team ranking delta based on verified aggregate score. Tie-break facts: aggregate remaining tiles, then authoritative finish time. This is a cooperative leaderboard, not Player Authority.

### PvP

Eligible terminal verified result. Winner/loser outcome must be server-derived by the frozen PvP authority. Foundation points: win `+3`, loss `+0`; aborted/invalid results are ineligible. Tie-break/history may retain verified score and remaining tiles but cannot override outcome.

## Eligibility and anti-farm

Fail closed when the result is absent, not valid, has unsupported mode, duplicate/non-unique participants, invalid authoritative times, or integrity flags that policy marks blocking. Duplicate `(seasonId, mode, matchId, formulaVersion)` is an idempotent replay and produces no second delta.

Anti-farm signals are recorded separately from automatic punishment. Foundation signals include repeated same participants, suspiciously short authoritative duration when a server policy threshold exists, disconnect/abandon patterns, pre-existing `antiFarmFlags`, and repeated consumption attempts. A signal may mark review/ineligibility according to trusted policy; the client cannot clear signals.

## History

Every applied ranking result records: season, formula version, matchId, mode, participants, authoritative start/end, official result, verified score/performance projection, applied deltas, integrity/anti-farm flags and processing identity. History is append-once per processing key and supports deterministic rebuild/audit.

## Idempotency and correction

Processing is transactional in the persistence implementation. Retry of an already-applied processing key returns the existing receipt and never applies points twice. Administrative invalidation/correction is future server-only policy and must be auditable; no client endpoint may directly mutate rank position or points.

## Security invariants

- No ranking write from UI/localStorage/client score.
- No Player Authority/Aura/XP/reward write in Phase 8.
- XP/rewards remain fail-closed.
- Frozen Core, Solo, Match Server, Trio and PvP are read-only dependencies.
- Formula and season configuration are server-owned and versioned.
- Ranking position is derived from stored ranking facts; clients may read it but never submit it.

## Foundation acceptance

Before ranking persistence is considered complete: deterministic formula tests, invalid-result rejection, duplicate replay/idempotency tests, mode isolation, anti-farm policy tests, history audit tests, and full regression of Phases 0–7 must pass.
