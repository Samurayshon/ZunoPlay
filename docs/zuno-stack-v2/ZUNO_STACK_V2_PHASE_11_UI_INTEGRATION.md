# Phase 11 — Zuno Stack V2 UI validation integration

## Root cause
The production Games catalog only routed `Zuno Stack` to legacy `zuno-stack.html`. The V2 existed as frozen engine/mode/server/projection modules and Phase 11 harnesses, but had no user-facing route. Therefore Android physical validation could only reach the legacy game.

## Integration
A separate validation route `zuno-stack-v2-solo.html` now consumes the official frozen Solo session API and `projectSoloView`. `jogos.html` exposes it explicitly as `V2 · Release Candidate · Validação`, while the existing legacy `zuno-stack.html` route remains available as `Versão atual`.

The presentation does not implement game transitions or scoring rules. User intent is forwarded to `soloPickTile`, `soloUndo`, `soloHint`, `soloRescue` and `soloUsePower`; rendering consumes `projectSoloView`.

## Mobile/accessibility
The validation surface is mobile-first, respects safe-area insets, uses >=44px navigation control and >=48px action controls, semantic labels/live status, explicit tray risk text, disabled control semantics, touch-action manipulation and `prefers-reduced-motion`.

## Boundaries
No frozen V2 source file is modified. No tray/ruleset/formula/tier/balance change. Aura authority is untouched. XP/rewards remain fail-closed and are not integrated into this validation surface. Legacy Stack is not removed or replaced.

## Physical validation
This integration makes Solo V2 reachable in the Games catalog, but physical Android evidence remains `DEVICE_VALIDATION_REQUIRED`. No release/APK publication is implied by this branch-only integration.