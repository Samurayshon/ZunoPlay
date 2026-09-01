# Zuno Stack V2 — Phase 11 P0 Android Solo findings

Base: `1a5a5ce2be1c0a47a09033bec7577ce0a6ba4ab7`

## Physical evidence

The first Android Solo validation round confirmed loading, immediate touch response, tray updates, match-3, score, combo, Pulse increment, Hint, Undo, Rescue, 6/7 risk, 7/7 capacity and post-terminal pick blocking.

## P0 findings

### Initial Pulse — presentation fix
`createPlayerState` permits an empty Pulse object at session creation. `projectSoloView` therefore exposes `pulse: undefined` until progression initializes `pulse.value`. The Android validation UI interpolated that value directly. The integration now renders the absent initial value as numeric zero (`0/10`) without changing Core state or progression.

### Win presentation — presentation fix
The official Solo terminal status is uppercase `WON`. The integration compared against lowercase `won`, so a correctly terminal session was presented as still playing. The UI now consumes the official uppercase status and presents `Vitória — tabuleiro limpo.`

### Loss presentation — presentation fix
The official Solo terminal status is uppercase `LOST`. The integration compared against lowercase `lost`, so a correctly terminal 7/7 session was presented only as a capacity warning. The UI now presents `Derrota — bandeja cheia.` and disables interactive controls in terminal states.

### Shift — controlled P0 frozen-Solo wiring exception
Physical Android evidence showed an enabled Shift returning `UNKNOWN_COMMAND`. Re-investigation confirmed the full official chain: `soloUsePower()` sends `USE_POWER`; `dispatch()` resolves commands from the mode transition table; `createSoloRules()` previously supplied only `createCoreTransitions()`; that table contains only `PICK_TILE`; and the already-existing official `usePowerTransition` therefore could not be reached.

The authorized correction is deliberately limited to `src/zuno-stack-v2/solo/solo-rules.mjs`: import the existing `USE_POWER` and `usePowerTransition`, compose `{...createCoreTransitions(), [USE_POWER]: usePowerTransition}`, and pass that transition table to the unchanged Solo rules. No power logic is recreated.

The existing Shift definition remains unchanged: id `shift`, cost `3`, two initial `powerShift` charges, requires a non-empty tray and a remaining charge, restores only the newest tray tile, consumes exactly one charge, and uses the official power transition to consume exactly 3 Pulse. Invalid insufficient-Pulse use is rejected before application and leaves state/charges unchanged.

## Controlled mutation guard

Phase 11 CI keeps Core, Match Server, Trio, PvP, Ranking, Player Authority and Aura under the original frozen-source guard. Inside frozen Solo, the guard permits exactly one changed source file (`solo-rules.mjs`) and verifies the exact four added wiring lines plus the one replaced `createModeRules` line. Any additional frozen-source mutation fails the gate.

## Scope

Outside the explicitly authorized Solo wiring exception, no frozen gameplay behavior is changed. Tray capacity, ruleset version, progression formula, Shift cost/charges/behavior, Ranking formulas, Player Authority tiers, Aura and multiplayer rules remain unchanged. XP/rewards remain disabled/fail-closed. No PR, merge, publication, APK or Release is part of this correction.
