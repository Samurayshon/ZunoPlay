# Zuno Stack V2 — Phase 10 Aura Freeze

Status: **FROZEN after green pre-freeze gate**.

## Frozen boundary

Phase 10 is presentation-only. Frozen Core, Solo, Match Server, Trio, PvP, Ranking and Player Authority are unchanged. Aura does not own gameplay, competitive, economic, ranking or progression authority.

## Contracts

- Aura contract: `aura-r1`.
- Exclusive authority source: public validated projection of `player-authority-r1`.
- Aura never writes Player Authority and never derives authority from client Aura declarations.
- XP and rewards remain fail-closed.

## Tiers and deterministic presets

Authority thresholds remain: `origin` 0, `signal` 25, `pulse` 75, `vector` 175, `nexus` 350. Each tier maps deterministically to a bounded visual preset. Visual progression uses controlled glow, particles, pulse and depth; effects are presentation-only and may not obscure gameplay or capture pointer interaction.

## Performance profiles

- `standard`: full bounded preset.
- `reduced-motion`: removes unnecessary pulse/scale motion.
- `low-end`: disables pulse, reduces particles, layers, depth offset and glow cost.

Presentation declares `pointerEvents: none`, `layoutAffecting: false`, and composition properties limited to `transform` and `opacity`. Aura modules contain no independent `requestAnimationFrame`, `setInterval`, or `MutationObserver` loop. Consumers must integrate updates into the game's controlled render/presentation flow.

Deterministic ceilings currently freeze at at most 6 particles and 2 depth layers in standard, and at most 2 particles and 1 depth layer in low-end.

## Architecture and safe adapter

`createAuraPresentation(publicPlayerAuthorityProjection, {profile})` is the integration boundary for future Profile/HUD/game presentation consumers. Consumers must pass the validated public Player Authority projection and render only the adapter output. They must not calculate a local tier/level from client claims, read Player Authority storage/processor/history/receipts/fingerprints, or use Aura output to mutate match state, Ranking, Player Authority, XP or rewards.

Aura production modules import only Aura-local modules. The adapter projects validated Authority through `projectPublicAura`, applies the deterministic visual preset, deep-freezes its output and exposes explicit cosmetic/fail-closed flags.

## Security and determinism

Validation fails closed for invalid Authority, spoofed tier/level, client-declared Aura state, economic fields, competitive fields and mismatched public projections. Tests cover nested tampering, extreme values, boundary spoofing, malicious fuzz, long deterministic sequences, stable serialization and deep immutability.

## Benchmarks and mobile budget

Pre-freeze CI on commit `9691d7379c9cd0c804669a4e1205e416802a3aad` recorded:

- Aura projection 20,000: ~104.43 ms.
- Aura preset lookup/projection 50,000: ~38.89 ms.
- Aura presentation adapter 20,000: ~114.48 ms.
- Aura final adapter 30,000 across all profiles: ~161.06 ms.

These are CI regression ceilings rather than device FPS guarantees. Aura remains designed to be scheduled by the controlled game render loop, with reduced-motion and low-end degradation available before sacrificing basic interaction fluidity.

## Tests and workflow

Dedicated workflow: `.github/workflows/zuno-stack-v2-aura.yml`.

Pre-freeze run: `33523901195`, job `99909723989`, success.

Full regression command covers Core, Solo, Match Server, Trio, PvP, Ranking, Player Authority and Aura. Pre-freeze result: **221/221 pass, 0 fail, 0 skipped, 0 cancelled**.

## Frozen integration rule

Future Profile, HUD and gameplay-presentation work may consume only the safe adapter output. No future consumer may turn Aura into a source of gameplay authority, competitive advantage, Player Authority, Ranking, XP or rewards without a separately versioned, reviewed contract outside this freeze.

Phase 11 is not part of this freeze and is not started by this document.
