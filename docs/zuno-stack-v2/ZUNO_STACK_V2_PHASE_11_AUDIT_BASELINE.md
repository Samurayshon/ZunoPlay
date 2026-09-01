# Zuno Stack V2 — Phase 11 Global Audit Baseline

Status: **BLOCK 1 AUDIT COMPLETE — NOT RELEASE READY**

Baseline main: `245940b14ddfb4e654e52b1a1a7619651c3a36a6`.

## Scope and frozen boundaries

Phases 0–10 are treated as frozen. This audit does not authorize contract changes. Frozen Core, Solo, Match Server, Trio, PvP, Ranking, Player Authority and Aura remain unchanged by Block 1. XP and rewards remain fail-closed.

Architecture remains: Core -> Mode Rules -> Match Server -> Presentation. Core is deterministic/pure; Match Server owns command envelope, actor/match/mode binding, revision/actionId/idempotency and VerifiedMatchResult; Ranking and Player Authority consume verified server results; Aura consumes only validated public Player Authority projection and is cosmetic.

## Regression baseline

Minimum frozen regression: **221/221 pass, 0 fail, 0 skipped, 0 cancelled**, established by the final Phase 10 Aura gate. Phase 11 may not regress below this baseline.

## Mode audit

### Solo

Frozen rules expose tray capacity 7, deterministic 54-tile board `[24,15,9,6]`, score/trio 100, combo, Pulse max 10, Undo 3, Hint 3, Rescue 1 and Shift 2. The projection exposes status, score, combo, Pulse, tray risk inputs, resource availability and tile availability. Mechanical baseline is coherent; perceived difficulty, 4–6 minute duration and UX clarity still require device/play-session validation before release.

### Trio

Exactly 3 player slots; deterministic 12-layer board; Relay capacity 3; shared Pulse; Support Pulse; terminal team evaluation. Frozen server/session work covers stable slots, reconnect/desync and logical lifecycle. Balance and real-device multiplayer fluency remain release-validation work, not a frozen-contract change.

### PvP

Exactly 2 slots, `pvp-1x1-r2`, controlled Pressure interference, cooldown/revision limits, ready/countdown/resolving lifecycle and server-authoritative result. Fairness under latency and real-device concurrency requires final soak validation.

### Ranking

Separate season+mode ladders, verified-result validation, processing key, exactly-once/idempotent replay, collision rejection, append history and deterministic standings. Final release must retain mode/season isolation and anti-farm gates.

### Player Authority

`player-authority-r1` remains server-derived from verified results with deterministic canonical fingerprinting, exactly-once processing, collision fail-closed, history/rebuild, progression and anti-farm boundary. No client Authority claim is authoritative.

### Aura

`aura-r1`, cosmetic only. Source is validated public `player-authority-r1` projection. Presets are bounded with standard/reduced-motion/low-end profiles; pointer events disabled, no layout ownership, transform/opacity composition only, no independent rAF/setInterval/MutationObserver loop, XP/rewards false.

## Security and determinism

No P0 contract-authority leak was identified in the audited frozen modules. Match commands reject invalid envelope, match/mode/actor mismatch, terminal mutation, stale/future revision and actionId collision. Verified results are server-produced. Ranking/Authority reject changed replay fingerprints. Aura rejects authority ownership and economic/competitive effects by contract.

Remaining security release gate: adversarial end-to-end transport/session tests against the production integration, because unit/server-module coverage alone is not proof of deployed transport isolation.

## Performance baseline and hotspots

Frozen Aura CI benchmark evidence records projection 20k ~104.43 ms, preset lookup/projection 50k ~38.89 ms, presentation adapter 20k ~114.48 ms and final adapter 30k ~161.06 ms. These are regression ceilings, not device FPS guarantees.

Potential hotspots for final validation:
- repeated JSON clone/stringify in authoritative match snapshots/receipts;
- JSON-based diffing in Solo view;
- board scans (`find`, `filter`, `some`) across frequent actions;
- full-state snapshots on reconnect/desync;
- multiplayer serialization under burst/reconnect;
- visual Aura cost on low-end Android when integrated with the actual renderer.

No frozen evidence justifies claiming production-device 60 FPS or touch p95 yet. Those are Phase 11 measurement gates.

## Mobile, accessibility and UX

The model exposes enough state to build clear risk/action feedback, but repository-level engine projections do not by themselves prove final rendered accessibility. Before release the integrated UI must demonstrate:
- touch p95 <=100 ms and common local action p95 <=50 ms on representative devices;
- no >=200 ms main-thread freeze in normal gameplay;
- stable ~60 FPS target on mid-tier and responsive ~30 FPS on weaker devices;
- tray 6/7 risk is visually and accessibly announced;
- win/loss/resolving/disabled actions have visible and non-color-only states;
- controls have accessible names, focus semantics and adequate touch targets;
- reduced-motion is respected;
- no gameplay-critical information depends only on glow/animation/color.

## Findings by priority

### P0 — blocks release

1. **Performance / validation:** no final representative-device evidence yet for touch latency, frame pacing, long tasks, memory and reconnect under load.
2. **UX/accessibility / validation:** engine state exists, but final integrated gameplay presentation has not yet demonstrated accessibility and clear win/loss/risk/disabled-action behavior end-to-end.
3. **Integration / validation:** final production presentation/transport integration and end-to-end Solo/Trio/PvP flows require release-candidate validation; frozen module tests alone cannot certify launch.

These are release-validation blockers, not authorization to change frozen contracts.

### P1 — required before release

1. Measure Solo duration/difficulty distribution against the 4–6 minute target.
2. Soak Trio reconnect/AFK/Relay/Pulse under latency and churn.
3. Soak PvP fairness, Pressure, timeout and reconnect under asymmetric latency.
4. Profile JSON serialization/cloning and view diff costs with representative match states.
5. Validate low-end/reduced-motion Aura in the integrated renderer.
6. Add final end-to-end release gate covering server-authoritative result -> Ranking -> Player Authority -> Aura projection while XP/rewards remain fail-closed.

### P2 — recommended polish

1. Tune presentation feedback, timing and hierarchy only after measurements.
2. Optimize projection/diff implementation if profiling proves material cost.
3. Add broader device matrix and longer multiplayer soak durations.

### P3 — future

1. Additional cosmetic richness outside `aura-r1` only through a separately reviewed/versioned contract.
2. XP/reward enablement remains a separate future authorization and must not be coupled to launch polish.

## Allowed Phase 11 changes without breaking freezes

Allowed: tests, benchmarks, instrumentation, E2E harnesses, presentation integration consuming existing projections/adapters, accessibility semantics, render scheduling, non-contract performance optimizations proven behavior-equivalent, documentation, release gates and measured balance proposals before application.

BLOCKER / explicit review required: changing Core transitions, tray capacity, ruleset/formula/contract versions, authoritative result semantics, Ranking/Authority formulas or tiers, Aura authority source, multiplayer slot counts, security/fail-closed behavior, or enabling XP/rewards.

## Objective final gates

Phase 11 cannot freeze until all are true:
1. regression >=221/221 and every new Phase 11 test green;
2. zero unresolved P0/P1;
3. deterministic replay/serialization and authority boundaries unchanged;
4. production-like E2E Solo/Trio/PvP passes including reconnect/desync/terminal result;
5. Ranking -> Player Authority -> Aura verified chain passes exactly-once/collision/anti-farm tests;
6. XP/rewards remain fail-closed unless separately authorized outside this freeze;
7. representative Android performance meets touch/freeze/frame budgets;
8. memory/state/serialization soak has no unbounded growth;
9. accessibility and reduced-motion gates pass;
10. Solo 4–6 minute target and multiplayer balance have measured evidence;
11. release candidate receives final regression, security and launch checklist approval.

## Block 1 conclusion

No balance or cosmetic changes were applied. No frozen contract was modified. No PR, merge, release or APK is authorized by this document. Phase 11 remains in progress and the project is **not release ready** until the P0/P1 validation gates above are closed.
