# Zuno Stack V2 — Phase 11 Device Validation Gate

Status: **DEVICE_VALIDATION_REQUIRED**

CI benchmarks are proxy regression gates only. They do not certify physical-device FPS, touch latency, memory pressure, thermal behavior or frame pacing.

## Required Android matrix

Before Phase 11 can freeze, collect evidence on at least:

1. entry Android profile;
2. mid-tier Android profile.

For each profile validate:

- touch response p95 <= 100 ms;
- common local action p95 <= 50 ms;
- no main-thread freeze >= 200 ms during normal gameplay;
- frame pacing appropriate to target: ~60 FPS mid-tier, responsive ~30 FPS weaker device;
- memory remains bounded through Solo plus multiplayer soak;
- reconnect/desync does not produce a visible interaction freeze;
- Aura `low-end` profile remains readable and non-blocking;
- `reduced-motion` removes unnecessary pulse/scale motion;
- no gameplay-critical information depends only on Aura, color, glow or animation.

## Accessibility release checks

The integrated presentation must expose text/icon/semantic state for:

- win;
- loss;
- resolving;
- tray risk at 6/7;
- tray full/loss at 7/7;
- disabled/unavailable Undo, Hint, Rescue and powers;
- reconnect/desync/AFK where relevant.

Controls must have accessible names and adequate touch targets. Aura must retain `pointerEvents: none` and must never own focus or input.

## Freeze rule

Until physical-device evidence is attached to the Phase 11 release candidate, Android performance/accessibility P0 remains open. Do not replace this gate with CI timing claims.
