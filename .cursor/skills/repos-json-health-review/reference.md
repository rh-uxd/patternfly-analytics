# Reference: APIs and fields

## GitHub REST — `GET /repos/{owner}/{repo}`

| Field | Use |
|-------|-----|
| `archived` | `true` → archived |
| `pushed_at` | Last push to any branch (preferred for “code activity”) |
| `updated_at` | Last change to repo metadata; noisier than `pushed_at` |
| `disabled` | Rare; repo disabled by policy |

`gh api repos/OWNER/REPO` returns the same JSON as the REST API.

## GitLab REST — `GET /api/v4/projects/:id`

`:id` can be numeric ID or **URL-encoded path** (`namespace%2Fproject`).

Common fields:

| Field | Use |
|-------|-----|
| `archived` | `true` → archived |
| `last_activity_at` | Broad activity (issues, MRs, pushes) |
| `last_repository_update` | Often closest to “last git activity” when present |

If both exist, prefer `last_repository_update` for parity with GitHub `pushed_at`; otherwise use `last_activity_at`.

## Encoding GitLab project path

Example: `group/my-project` → `group%2Fmy-project`

```bash
python3 -c "import urllib.parse; print(urllib.parse.quote('group/my-project', safe=''))"
```

## Private GitLab blockers

- **401/403:** Missing or insufficient token — flag as manual review, not stale.
- **404:** Private project without access, renamed path, or deleted — verify manually.
