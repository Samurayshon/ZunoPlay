# Zuno Stack V2 — Phase 11 Release Candidate / Freeze Readiness

Status: RELEASE_CANDIDATE_PENDING_PHYSICAL_VALIDATION

Baseline entering Block 4: `b5af1502c6ca8887feecc3fd8fdc72a2e44f9099`
Baseline automated regression: 242/242 green.

## Frozen boundaries

Phase 11 does not authorize mutation of frozen Core, Solo, Match Server, Trio, PvP, Ranking, Player Authority or Aura. Tray capacity, rulesets, formulas, tiers and balance remain frozen. XP and rewards remain fail-closed.

## Automated gates

AUTOMATED_PASS when the dedicated Phase 11 Final Gates workflow is green:
- full frozen regression plus Phase 11 tests;
- frozen source mutation guard against `245940b14ddfb4e654e52b1a1a7619651c3a36a6`;
- deterministic/serializable snapshots, reconnect and desync;
- exactly-once Ranking and Player Authority processing;
- collision fail-closed;
- anti-farm fail-closed;
- Aura cosmetic-only standard/reduced-motion/low-end profiles;
- Solo/Trio/PvP semantic presentation harness;
- CI proxy local-action budget;
- serialization/projection benchmarks;
- deterministic soak and bounded Match Server receipts.

## DEVICE_VALIDATION_REQUIRED — P0

CI does not certify these. Run on at least one entry-level Android and one mid-tier Android using the actual WebView/runtime:
1. launch and enter Zuno Stack V2;
2. play Solo through representative normal, tray 6/7, tray 7/7, win and loss states;
3. record touch response p95 and require <=100 ms;
4. record common local action p95 and require <=50 ms;
5. verify no main-thread freeze >=200 ms;
6. record frame pacing/FPS during board interaction, tray updates and Aura;
7. inspect memory growth through repeated matches/re-entry;
8. inspect thermal behavior during an extended session;
9. disconnect/reconnect and confirm no visible freeze/destructive state jump;
10. validate low-end Aura profile;
11. validate reduced-motion behavior;
12. inspect rendered accessibility tree, focus order, labels/status announcements and actual touch-target geometry (target >=44 px).

Do not mark this gate PASS without physical evidence.

## EXTERNAL_ENVIRONMENT_REQUIRED — P0/P1

### Trio real network — P0
- exactly 3 real clients;
- exercise Relay and shared Pulse concurrently;
- disconnect/reconnect each slot;
- induce latency/jitter/churn;
- verify authoritative revision/reconciliation and no duplicated action;
- exercise Support Mode and Last Stack;
- record visible stalls/desyncs.

### PvP asymmetric latency — P0
- two real clients with asymmetric latency/jitter;
- ready/countdown/play/resolving/result;
- bounded Pressure behavior;
- disconnect/reconnect and timeout;
- verify actor binding, revision/actionId, authoritative winner and fairness symptoms;
- verify no client claim changes result/ranking/authority.

### Solo duration — P1
- collect representative completed human sessions;
- measure median and distribution against target 4–6 minutes;
- do not alter balance in this block; record evidence for a separately authorized balance decision if target misses.

## Accessibility checklist — P0
- critical state never conveyed by color/glow/Aura alone;
- tray risk/full has readable text/status;
- win/loss/resolving/status is announced appropriately;
- controls have accessible names and disabled semantics;
- logical focus order;
- no Aura focus/pointer capture;
- actual touch targets >=44 px;
- reduced motion removes nonessential pulse/motion without hiding information.

## Performance / state growth interpretation

Automated benchmarks are CI proxies, not device certification. Ranking and Player Authority histories are intentionally append-only and therefore linear in processed results; processed fingerprints are also linear for exactly-once/collision detection. Match Server receipts are explicitly bounded by `maxReceipts` (tested at 128). Any persistence compaction/retention change would be a separate architecture decision and is not introduced by Phase 11.

## Freeze decision

Current decision: **A — execute physical/manual validation**.

The code-level Release Candidate may advance when all automated gates remain green. Phase 11 MUST NOT be declared frozen while any P0 DEVICE_VALIDATION_REQUIRED or P0 EXTERNAL_ENVIRONMENT_REQUIRED gate lacks evidence or has failed.

No PR, merge, release/APK publication, balance change, frozen-contract mutation, XP enablement or rewards enablement is authorized by this document.
