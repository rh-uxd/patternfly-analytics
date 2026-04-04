---
name: repos-json-health-review
description: Flags archived or stale Git repositories listed in repos.json (PatternFly Analytics) so they can be removed from tracking. Checks GitHub and GitLab for archive status and last activity older than 2 years. Use when reviewing repos.json, pruning the analytics repo list, auditing tracked codebases, or when the user asks about outdated, archived, or inactive repositories.
---

# repos.json health review

Helps UX developers and managers ensure PatternFly Analytics does not track dead codebases: repositories that are **archived** or have had **no git activity for 2+ years** (configurable).

## Input

- Primary file: `repos.json` at the project root — array under `repos`, each entry has `git` (clone URL) and `name` (display label).

## What to flag

| Flag | Meaning |
|------|---------|
| **archived** | Host marks the project as archived/read-only |
| **stale** | Last meaningful code activity is older than the threshold (default **730 days**) |

Use **last push to the default branch** as the activity date when available (`pushed_at` on GitHub). It reflects real commits better than `updated_at`, which can change from issues/wiki/settings without code changes.

## GitHub

**Preferred:** GitHub CLI (works with existing `gh auth` and rate limits).

1. Parse `owner` and `repo` from HTTPS or SSH URLs, e.g. `https://github.com/org/repo` → `org`, `repo` (strip `.git` if present).
2. Fetch metadata:
   ```bash
   gh api "repos/OWNER/REPO" --jq '{archived, pushed_at, updated_at, html_url}'
   ```
3. Treat as **archived** if `archived` is `true`.
4. Treat as **stale** if `pushed_at` is null or older than the cutoff (compare ISO 8601 dates to today).

**Alternative:** GitHub MCP `search_repositories` with `minimal_output: false` and query `repo:OWNER/REPO` — confirm the result matches the intended repository (search can return edge cases). Prefer `gh` for deterministic per-repo lookups.

**Unauthenticated / rate limits:** Anonymous REST is limited; use `gh auth login` or `GITHUB_TOKEN`.

## GitLab

GitLab exposes project fields including **`archived`** and **`last_activity_at`** (and often **`last_repository_update`** for push activity).

1. Parse namespace and project path from the URL (e.g. `https://gitlab.example.com/group/subgroup/project` → path `group/subgroup/project`).
2. API (v4), path URL-encoded with `/` → `%2F`:
   ```bash
   # PATH_ENCODED = url-encoded "group/subgroup/project"
   curl --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
     "https://gitlab.example.com/api/v4/projects/PATH_ENCODED"
   ```
3. **Private instances** (e.g. `gitlab.cee.redhat.com`): require a **personal/group access token** with `read_api` (or read_repository as needed). Without auth, the API returns 401/404 — **do not mark as stale** solely due to auth failure; report **unknown / needs manual check**.

**GitLab.com** public projects can sometimes be queried without a token; private repos always need a token.

## Optional script (repeatable)

From the repo root:

```bash
npm run review-repos-health
# or (from repository root)
node .cursor/skills/repos-json-health-review/scripts/repos-json-health-review.js repos.json
node .cursor/skills/repos-json-health-review/scripts/repos-json-health-review.js --days 730 repos.json
node .cursor/skills/repos-json-health-review/scripts/repos-json-health-review.js --json repos.json   # machine-readable summary + per-repo rows
```

- **GitHub:** Uses `gh api` when available; if that fails, uses `GITHUB_TOKEN` with the REST API.
- **GitLab:** Set `GITLAB_TOKEN` (or `PRIVATE_TOKEN`) for private instances.
- Prints Markdown to stdout (default) or JSON with `--json`. Does not modify `repos.json`.

## Batch workflow

1. Extract all `git` URLs from `repos.json` (JSON array).
2. Group by host (`github.com`, `gitlab.*`, etc.).
3. For each URL, run the appropriate check; record `name`, URL, `archived`, activity timestamp, and reason.
4. Output a short report (see template below). Do **not** auto-edit `repos.json` unless the user explicitly asks to remove entries.

## Edge cases

- **Wrong host / moved repos:** 404 → note as broken or relocated; suggest verifying URL or removal.
- **Renamed repos:** GitHub often redirects API; still verify `full_name` matches expectation.
- **Forks / mirrors:** Same rules apply; stale upstream mirrors may still be unhelpful for analytics.
- **GitLab auth failure:** Separate section **“Could not verify (token/network)”** instead of counting as stale.

## Report template

```markdown
## repos.json health review

**Threshold:** no activity for 730+ days (adjust if user specified otherwise)
**Date:** [run date]

### Archived (remove from analytics)
| name | git | notes |
|------|-----|------|

### Stale — last activity before [cutoff date]
| name | git | last activity (field) |
|------|-----|------------------------|

### Could not verify
| name | git | reason |
|------|-----|--------|

### Clean / active
[Brief count or “none in sample”]
```

## Additional resources

- GitLab request patterns and fields: [reference.md](reference.md)
