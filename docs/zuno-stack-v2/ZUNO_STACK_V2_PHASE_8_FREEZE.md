# Zuno Stack V2 — Phase 8 Ranking Freeze

Status: FROZEN
Formula: `ranking-r1`

## Scope frozen

Phase 8 accepts only server-verified `MATCH_RESULT` inputs and maintains independent Solo, Trio and PvP standings by season. Processing is logically exactly-once through `seasonId + mode + matchId + formulaVersion`, with idempotent exact replay and fail-closed collision on changed processed payloads.

The Ranking layer includes server-side processing, deterministic tie-breaks, append-once history, transactional repository abstraction, serialized concurrent consumption, deterministic rebuild from history, standings audit, season/mode isolation and server-derived anti-farm signals.

## Security invariants

- Client-provided unverified result shapes are ineligible.
- Blocking anti-farm policy fails closed.
- Server anti-farm signals are unioned with verified signals and cannot be cleared by the caller.
- No Ranking code grants XP or rewards.
- No Player Authority or Aura is implemented in Phase 8.
- Frozen Core, Solo, Match Server, Trio and PvP remain unchanged by the Phase 8 hardening block.

## Validation gate

Final pre-freeze hardening gate: 162/162 tests passed, 0 failures.
Ranking benchmark observed in CI: 500 transactional ranking results in ~1.50s and rebuild of 500 history entries in ~6.75ms on the hosted runner.

Phase 8 is frozen only after the final documentation commit also passes the dedicated Ranking workflow and full regression gate.
