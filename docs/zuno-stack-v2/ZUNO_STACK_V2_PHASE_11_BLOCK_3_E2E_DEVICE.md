# Zuno Stack V2 — Phase 11 Block 3 E2E + Device Validation

Status: **IN PROGRESS — DEVICE_VALIDATION_REQUIRED**

Starting HEAD: `46792441ee76895da082c835d60c9f7f31c6b7ba`.
Starting automated baseline: **235/235 pass**.
Frozen source baseline remains Phase 10 main `245940b14ddfb4e654e52b1a1a7619651c3a36a6`.

## Scope

Block 3 adds presentation-level E2E harness coverage and documentation only. It does not change Frozen Core, Solo, Match Server, Trio, PvP, Ranking, Player Authority or Aura. It does not change tray capacity, rulesets, formulas, tiers or balance. XP/rewards remain fail-closed.

## Automated integrated presentation evidence

The repository currently exposes engine/session projections rather than a dedicated Zuno Stack V2 DOM renderer. Therefore this block validates the strongest integrated presentation boundary available without pretending a browser/device renderer exists.

Automated gates cover:
- Solo semantic status, score/combo/Pulse text, tray 6/7 warning, tray 7/7 critical state, accessible action names/disabled semantics, Hint, pick, Undo, unavailable Rescue and Shift;
- Trio Relay/shared Pulse text, exactly-three projection, reconnect/desync, Support Mode, Last Stack and deterministic reconnect timeout semantics;
- PvP ready/countdown, Pressure projection, reconnect/desync, AFK/timeout lifecycle and resolving/winner semantics;
- Aura standard/reduced-motion/low-end remains pointer transparent, layout independent and transform/opacity-only;
- critical gameplay status is represented outside Aura and does not depend on glow/color/animation.

This is production-like module/presentation-adapter E2E, not proof of a rendered WebView accessibility tree or physical touch behavior.

## Android maximum technically available without physical device

CI can verify deterministic engine/projection behavior, serialization, synchronous performance proxies, presentation semantics, Aura profiles, reconnect/desync behavior and source mutation guards. It cannot honestly measure physical Android input latency, frame pacing, thermal behavior or real device memory pressure.

`DEVICE_VALIDATION_REQUIRED` remains mandatory for:
1. entry Android profile;
2. mid-tier Android profile;
3. touch response p95 <=100 ms;
4. common local action p95 <=50 ms;
5. no main-thread freeze >=200 ms during normal gameplay;
6. representative frame pacing (~60 FPS mid-tier, responsive ~30 FPS weaker device);
7. bounded memory during Solo and multiplayer soak;
8. thermal behavior;
9. visible reconnect/desync freeze behavior;
10. rendered accessibility tree, focus semantics and real touch-target geometry;
11. integrated low-end Aura readability;
12. integrated reduced-motion behavior.

No CI number may be substituted for those physical measurements.

## P0/P1 status after automated Block 3 gates

P0 closed by automated evidence when CI is green:
- presentation-boundary semantic coverage for Solo/Trio/PvP;
- module-to-presentation reconnect/desync/terminal state coverage;
- non-color/non-Aura critical-state contract in the harness;
- frozen source mutation guard remains active.

P0 still open:
- representative physical Android performance evidence;
- rendered WebView accessibility/focus/touch-target evidence on device;
- deployed production transport isolation/E2E if not represented by the repository harness.

P1 still open:
- measured real Solo play-session duration/difficulty distribution against 4–6 minutes;
- real-network Trio latency/churn/fairness soak;
- real-network PvP asymmetric-latency/fairness soak;
- integrated renderer profiling on representative Android devices.

## Freeze rule

Block 3 must not declare Phase 11 complete. No PR, merge, release or APK is authorized. No balance changes are authorized. XP/rewards remain fail-closed. Phase 11 freeze requires the remaining physical/device and measured play/network evidence or an explicit release decision that preserves those blockers.
