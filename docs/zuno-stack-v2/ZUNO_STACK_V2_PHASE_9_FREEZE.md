# Zuno Stack V2 — Phase 9 Freeze: Player Authority

Status: FROZEN after green Phase 9 gate.

## Scope
Phase 9 introduces Player Authority only. Frozen Core, Solo, Match Server, Trio, PvP and Ranking remain unchanged. Aura is not implemented. XP and rewards remain fail-closed.

## Frozen contracts
- Formula version: `player-authority-r1`.
- Anti-farm policy version: `player-authority-antifarm-r1`.
- Accepted source: server-verified `MATCH_RESULT` / VerifiedMatchResult-shaped result only.
- Supported modes: Solo, Trio and PvP.
- Player Authority is distinct from MatchAuthority/ServerAuthority and from Ranking.

## Formula
- Solo participant: +1 Authority.
- Trio participant: +2 Authority.
- PvP participant: +2 Authority.
- PvP server-declared winner: additional +1 Authority.
- Client-declared Authority, points, rank/position, XP, rewards or Aura fields fail closed.

## Progression tiers
Derived exclusively from server-side Authority points:
- level 1 `origin`: 0+
- level 2 `signal`: 25+
- level 3 `pulse`: 75+
- level 4 `vector`: 175+
- level 5 `nexus`: 350+

Public progress is derived from materialized Authority; the client cannot declare level, tier or progress.

## Persistence and exactly-once
Persistence is represented by a server-side repository abstraction with versioned compare-and-swap commits. Processing occurs on a cloned snapshot and commits atomically. A stale version returns `PLAYER_AUTHORITY_CONFLICT` without partial mutation. `processed`, `players` and append-only `history` move together.

The processing key is mode + matchId + formula version. Exact replay returns the prior receipt without a second grant. Reuse of the key with altered payload returns `PLAYER_AUTHORITY_RESULT_COLLISION`.

## History, rebuild and audit
Every applied result appends one immutable logical history entry. Player materialized state can be deterministically rebuilt from history. Audit checks materialized players against rebuilt players and hardening checks duplicate/missing processed receipts, invalid keys/formula/participants/deltas and receipt/history mismatches. Removal, duplication and corruption are detected. Pure history reordering is intentionally order-insensitive for additive Authority and requires an external append log/sequence if chronological tamper evidence is required by a future persistence adapter.

## Anti-farm
Server policy can derive and audit:
- excessively short match signal;
- repeated participant-composition signal;
- abandonment/disconnect-expiry signal.

Server-derived flags are merged with existing verified flags and cannot be removed by client omission. Configured blocking flags fail closed. Phase 9 defines no automatic punishment beyond configured blocking eligibility.

## Public projection
The safe projection exposes only playerId, Authority, matches, per-mode totals, derived level/tier/progress and next threshold. It does not expose processed receipts, history, fingerprints or internal persistence state. It is a data contract suitable for a future Aura phase but contains no Aura implementation or visual effects.

## Security and determinism
Phase 9 freezes deterministic serialization, mode-isolated accounting, replay/collision protection, compare-and-swap conflict handling, malicious authority-field rejection, anti-farm fail-closed behavior, long-sequence determinism, fuzz coverage and bounded CI benchmarks.

## Freeze gate
Final pre-freeze gate on head `09d3437275494886831cf2328ba89fcb3161dc13`: 194/194 tests passed, 0 failed. Player Authority workflow and Solo regression workflow succeeded. Freeze documentation itself must receive the same green workflow gates before publication/merge is considered.
