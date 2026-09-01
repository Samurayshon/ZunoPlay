# Zuno Stack V2 — Phase 11 P0 Android Solo findings

Base: `1a5a5ce2be1c0a47a09033bec7577ce0a6ba4ab7`

## Physical evidence

The first Android Solo validation round confirmed loading, immediate touch response, tray updates, match-3, score, combo, Pulse increment, Hint, Undo, Rescue, 6/7 risk, 7/7 capacity and post-terminal pick blocking.

## P0 findings

### Initial Pulse — presentation fix
`createPlayerState` permits an empty Pulse object at session creation. `projectSoloView` therefore exposes `pulse: undefined` until progression initializes `pulse.value`. The Android validation UI interpolated that value directly. The integration now renders the absent initial value as numeric zero (`0/10`) without changing frozen Core/Solo state or progression.

### Win presentation — presentation fix
The official Solo terminal status is uppercase `WON`. The integration compared against lowercase `won`, so a correctly terminal session was presented as still playing. The UI now consumes the official uppercase status and presents `Vitória — tabuleiro limpo.`

### Loss presentation — presentation fix
The official Solo terminal status is uppercase `LOST`. The integration compared against lowercase `lost`, so a correctly terminal 7/7 session was presented only as a capacity warning. The UI now presents `Derrota — bandeja cheia.` and disables interactive controls in terminal states.

### Shift — BLOCKER, frozen Solo wiring
Physical Android evidence showed an enabled Shift returning `UNKNOWN_COMMAND`. Investigation confirms this is not an integration argument typo: `soloUsePower()` sends the official `USE_POWER` command, while `createSoloRules()` builds transitions only from `createCoreTransitions()`, and the frozen `createCoreTransitions()` currently registers only `PICK_TILE`. Correcting Shift therefore requires changing frozen Solo/Core transition wiring. Per Phase 11 instructions, no such change is made in this branch. A regression/characterization test locks the observed blocker for explicit review.

## Scope
Only the Phase 11 validation UI plus Phase 11 test/documentation are changed. No Frozen Core, Solo, Match Server, Trio, PvP, Ranking, Player Authority or Aura source is modified. Tray capacity, rulesets, formulas, tiers and balance remain unchanged. XP/rewards remain disabled/fail-closed.
