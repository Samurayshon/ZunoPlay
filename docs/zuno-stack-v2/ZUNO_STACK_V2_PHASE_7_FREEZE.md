# Zuno Stack V2 — Phase 7 Freeze: PvP 1x1

Phase 7 is frozen after the PvP 1x1 authority, lifecycle and hardening gates passed.

## Frozen scope

- Exactly two unique players with stable slots.
- Independent, competitively equivalent Boards with ownerId-bound tile namespaces.
- Lifecycle: `forming -> preparing -> ready_check -> countdown -> playing -> resolving -> finished`.
- Bilateral authoritative ready-check and server-controlled countdown.
- Authenticated actor binding; external actors and spoofing fail closed.
- Match Server revision/actionId/idempotency, stale/future revision rejection, replay protection and actionId collision protection.
- Controlled server-authoritative PvP pressure with explicit cost, opponent target, deterministic queue, cap and cooldown anti-chain protection; no arbitrary opponent Board/tile control.
- Compact remote projection during normal gameplay; full authoritative snapshots reserved for bootstrap/reconnect/desync paths.
- Disconnect blocks gameplay while preserving slot; reconnect restores the canonical slot/state/revision and receipt history.
- Server-owned logical ticks drive AFK warning and reconnect expiry; client time cannot declare timeout.
- Timeout derives `opponent_timeout`, winner and resolving state server-side.
- Terminal resolution preserves `resolving` before `finished`; VerifiedMatchResult is derived only after valid authoritative finish.
- Client-declared winner, final result, score, XP and rewards remain rejected/fail-closed.
- Determinism, serialization, fuzz/adversarial inputs and bounded reconnect benchmark are covered by PvP tests.

## Final gate

Final Phase 7 regression gate: **138/138 tests passing** across Frozen Core, Solo, Match Server, Trio and PvP on head `d1fc59e6be0a698ccc76e250831d9665620bb388` before this freeze-document commit.

The dedicated PvP workflow and Solo workflow both completed successfully on that validated head.

## Freeze rule

Do not modify Phase 7 behavior when implementing Phase 8 Ranking unless a proven integration defect requires a narrowly scoped correction that preserves all frozen contracts and passes the complete regression gate.

XP/rewards remain disabled. Ranking, Player Authority and Aura are outside this freeze.
