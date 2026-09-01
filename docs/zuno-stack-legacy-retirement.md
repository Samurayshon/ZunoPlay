# Zuno Stack legacy runtime retirement

The official `zuno-stack.html` entry no longer loads the legacy Stack CSS/JS chain. It now boots the validated Solo session/view architecture directly.

Legacy implementation files remain in the repository for rollback/audit history during the final physical gate, but they are no longer loaded by the official Games entry. The former V2 validation URL is compatibility-only and redirects to `zuno-stack.html`.

This avoids a risky bulk deletion before the final Android gate while removing the legacy runtime from the user-facing path.