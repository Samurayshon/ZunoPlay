# Zuno Stack migration ledger equivalence

The seven Zuno Stack helper migrations were validated under historical local version identifiers and are recorded in production under canonical version identifiers generated on 2026-08-31.

CI treats only the exact pairs in `scripts/zuno-stack-ledger-equivalences.json` as equivalent. Name changes, unknown retimestamps, duplicate historical/canonical files, missing production targets, and all unrelated migration drift remain fail-closed.

This equivalence is reconciliation metadata only. It does not apply, repair, delete, or rewrite production migrations.
