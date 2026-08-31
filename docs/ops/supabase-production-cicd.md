# Supabase production CI/CD

This pipeline keeps routine migration validation automatic while keeping production writes explicitly gated.

## Credentials

GitHub repository secrets:

- `SUPABASE_ACCESS_TOKEN`: one long-lived, project-scoped Supabase automation token. Prefer a read-only project preset/capability set broad enough for `supabase link` so routine CLI reads do not require token recreation.
- `SUPABASE_DB_PASSWORD`: production database password used by the Supabase CLI database connection.

Secrets must never be committed to the repository or printed by workflows.

## Automatic PR dry-run

`.github/workflows/supabase-production-dry-run.yml` runs when a pull request to `main` changes migrations, the approval manifest, or either production workflow.

The workflow:

1. pins Supabase CLI `2.116.0`;
2. validates `supabase/approved-production-migrations.txt`;
3. fails closed if a changed migration is not in the approval manifest;
4. skips production connectivity when the manifest is empty;
5. when a release is listed, links to the production project and runs only `supabase db push --dry-run`;
6. requires the dry-run pending versions to match the approved manifest exactly;
7. uploads dry-run evidence.

## Production apply

`.github/workflows/supabase-production-apply.yml` is manual only (`workflow_dispatch`). It is additionally restricted to:

- branch `main`;
- actor `Samurayshon`;
- exact phrase `APPLY APPROVED MIGRATIONS`;
- exact approved `main` commit SHA;
- GitHub environment `production`;
- non-empty, valid, ordered approval manifest;
- mandatory pre-apply dry-run whose pending migration set matches the manifest exactly.

Only after all gates pass does the workflow run `supabase db push`. It then runs another dry-run and fails if any migration version remains pending.

## Approval manifest

`supabase/approved-production-migrations.txt` contains one exact migration filename per line, in ascending timestamp order.

Keep the file comments-only when no production migration release is approved. This makes the PR workflow validate policy without contacting production.

A migration release is not authorization to write to production by itself. The production workflow still requires an explicit manual dispatch, authorization phrase, actor restriction, exact SHA and all pre-apply checks.

## GitHub environment

Use a GitHub environment named `production`. If the repository plan supports deployment protection rules, configure required reviewers there as an additional server-side approval gate. The workflow does not rely on that feature alone: its manual dispatch, actor, phrase and SHA checks remain mandatory.

## Rotation

Rotate the Supabase access token only on compromise, planned expiry, or scope changes. Normal CI runs should not require recreating it.
