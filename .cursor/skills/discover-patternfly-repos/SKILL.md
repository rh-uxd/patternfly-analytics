---
name: discover-patternfly-repos
description: This skill should be used when the user asks to "discover repos", "find patternfly repos", "what repos are missing", "search jira for patternfly", "untracked repos", "repos not in repos.json", "find new products using patternfly", or wants to identify codebases using PatternFly that are not yet tracked in this analytics project.
---

# Discover PatternFly Repos

Identify products and codebases using PatternFly that are not yet tracked in `repos.json`. Search Jira for PatternFly references to find product teams, then search GitHub for their public repositories, and cross-reference against currently tracked repos.

This is an MCP-driven workflow — use the Atlassian Jira MCP and GitHub MCP tools directly. No standalone script.

## Step 1: Load Currently Tracked Repos

Read `repos.json` from the project root. Extract all `git` URLs and build a lookup set of `org/repo` pairs (e.g. `RedHatInsights/ros-frontend`) for comparison. Count total tracked repos for the report.

## Step 2: Search Jira for PatternFly References

Use `mcp__mcp-atlassian__jira_search` with these JQL queries. Run them in parallel where possible. Paginate using `page_token` until no more results.

**Primary queries (run in parallel):**

```
summary ~ "patternfly" ORDER BY project ASC
labels in ("patternfly", "PatternFly", "pf5", "pf6", "patternfly-upgrade", "patternfly-migration") ORDER BY project ASC
text ~ "patternfly" ORDER BY project ASC
```

Use `limit: 50` and `fields: "summary,project,labels,status,issuetype"` for each query.

**Extract from each result:**
- `project.key` (e.g. "AAP")
- `project.name` (e.g. "Ansible Automation Platform")
- `project.category` (e.g. "Ansible Automation Platform")

Deduplicate projects across all queries by `project.key`.

## Step 3: Filter Jira Projects

Remove projects that are not product codebases. Skip projects matching these criteria:

**Skip categories:** `UIE-UXD` (UX design teams)

**Skip project names containing:** "UX Research", "UXD Research", "Feedback", "ADR", "Documentation", "Strategy"

**Skip project types:** Projects that are purely design, research, feedback trackers, or architecture decision records — they reference PatternFly but have no codebase to track.

For remaining projects, check if they map to repos already in `repos.json` (by matching project name/key to existing repo names). Separate into "already tracked" and "not tracked" lists.

## Step 4: Search GitHub for Untracked Projects

For projects not already tracked, search GitHub for their codebases.

**Approach A — Search by product name:**
Use `mcp__github__search_repositories` with product-relevant terms from the Jira project name.

**Approach B — Broad org code search (more thorough):**
Search for `@patternfly/react-core` in `package.json` across major Red Hat GitHub orgs. Run these in parallel:

```
@patternfly/react-core filename:package.json org:RedHatInsights
@patternfly/react-core filename:package.json org:openshift
@patternfly/react-core filename:package.json org:redhat-developer
@patternfly/react-core filename:package.json org:cockpit-project
@patternfly/react-core filename:package.json org:ansible
@patternfly/react-core filename:package.json org:kubevirt-ui
@patternfly/react-core filename:package.json org:red-hat-storage
```

Use `mcp__github__search_code` with `perPage: 30`.

Extract unique `full_name` (org/repo) from results. Compare against tracked repos set from Step 1.

**For each untracked repo found**, fetch metadata via `mcp__github__search_repositories` with query `repo:ORG/REPO` to get: `archived`, `language`, `pushed_at`, `updated_at`, `description`.

## Step 5: Classify Untracked Repos

Categorize each untracked repo into tiers based on metadata:

| Tier | Criteria |
|------|----------|
| **Tier 1** | Not archived, pushed within last 6 months, TypeScript or JavaScript language |
| **Tier 2** | Not archived, pushed 6-24 months ago, or non-JS language with PF usage |
| **Archived** | `archived: true` on GitHub |
| **Stale** | Not archived but no push in 2+ years |
| **Private/Internal** | Jira project references PatternFly but no public GitHub repo found |

Exclude repos that are clearly templates, test fixtures, starter apps, or documentation-only (check description and name for "template", "starter", "seed", "demo", "test", "docs", "guides").

## Step 6: Generate Report

Output a markdown report with this structure:

```markdown
## PatternFly Repo Discovery Report

**Date:** [today]
**Currently tracked:** [count] repos in repos.json
**Jira projects found:** [count] unique projects referencing PatternFly
**New repos discovered:** [count]

### Tier 1 — Active, public, confirmed PatternFly usage
| Repo | Description | Jira Project | Language | Last Push |
|------|------------|--------------|----------|-----------|

#### Ready to add to repos.json
\```json
{"git": "https://github.com/org/repo", "name": "Display-Name"},
\```

### Tier 2 — Less active or unconfirmed
| Repo | Description | Language | Last Push |
|------|------------|----------|-----------|

### Archived (skip)
| Repo | Description |
|------|------------|

### Stale (no activity 2+ years)
| Repo | Last Push |
|------|-----------|

### Private/Internal (Jira only, no public repo found)
| Jira Key | Project Name | Category | Signal |
|----------|-------------|----------|--------|

### Already tracked in repos.json
[Count] Jira projects map to repos already in repos.json: [list keys]
```

Generate `repos.json` entries for Tier 1 repos using the naming convention from existing entries (e.g. `RedHatInsights-` prefix, `Openshift-` prefix, hyphenated display names).

Do **not** modify `repos.json` unless the user explicitly asks to add entries.

## Additional Resources

- **`references/jira-queries.md`** — Full JQL reference, GitHub org list, skip-list details, and field mappings
