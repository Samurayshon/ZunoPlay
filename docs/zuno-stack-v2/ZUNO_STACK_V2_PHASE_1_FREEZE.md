# Zuno Stack V2 — Phase 1 Core Freeze

Status: candidate freeze after Block 5 gates.

## Frozen public primitives
- contracts: createTile, createBoardState, createPlayerState, createGameState, createCommand, createDomainEvent, acceptedTransition, rejectedTransition, createModeRules, createRulesContext, assertSerializableValue
- deterministic PRNG
- pure dispatcher
- Board generation, blockers, validation and availability
- Tray capacity 7, insertion, validation and deterministic trio resolution
- PICK_TILE transition and canonical domain events
- deterministic Score, Combo and Pulse progression
- USE_PULSE and minimal ruleset-controlled power catalog / USE_POWER

## Frozen invariants
- Core is platform independent and has no DOM, storage, network, Supabase or realtime dependency.
- Same valid State + Command + RulesContext yields the same TransitionResult.
- Rejected commands do not mutate the prior state and emit no domain events.
- Board tile ids are unique; removed or blocked tiles cannot be picked.
- Stable Tray capacity is exactly 7 and cannot contain an unresolved mandatory trio.
- Trio resolution removes exactly three ids of one family in canonical insertion order.
- Score, Combo and Pulse are derived only from accepted Core transitions.
- Pulse cannot be negative or exceed ruleset maximum.
- Powers are ruleset definitions; client commands contain intent only.
- Power callbacks execute on isolated serializable copies and cannot mutate prior canonical state by aliasing.
- GameState and DomainEvents remain finite, plain, serializable data.
- Transport revision, rewards, ranking, Player Authority, Aura and presentation do not belong to Core.

## Deferred deliberately
Win/loss, Solo mode rules, Undo, Hint, Rescue, Match Server authority, Trio coop, PvP, ranking, Player Authority, Aura, rewards and UI remain future-phase work.

## Change policy
Any future incompatible change to these boundaries, determinism, serialization or authority requires explicit contract review plus schemaVersion/rulesetVersion handling as applicable.
