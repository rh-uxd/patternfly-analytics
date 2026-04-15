# Jira & GitHub Query Reference

## JQL Queries

### Primary queries (run in parallel, paginate all)

```sql
-- Issues with "patternfly" in summary
summary ~ "patternfly" ORDER BY project ASC

-- Issues labeled with PatternFly-related labels
labels in ("patternfly", "PatternFly", "pf5", "pf6", "patternfly-upgrade", "patternfly-migration", "PF6-Adoption", "patternfly6") ORDER BY project ASC

-- Full-text search (broadest, catches description/comments)
text ~ "patternfly" ORDER BY project ASC
```

### MCP tool parameters

```json
{
  "jql": "summary ~ \"patternfly\" ORDER BY project ASC",
  "fields": "summary,project,labels,status,issuetype",
  "limit": 50
}
```

Paginate using `page_token` from previous response. Continue until response has no `next_page_token`.

### Key fields to extract

| Field | Path | Example |
|-------|------|---------|
| Project key | `issue.project.key` | `AAP` |
| Project name | `issue.project.name` | `Ansible Automation Platform` |
| Project category | `issue.project.category` | `Ansible Automation Platform` |

## Projects to Skip

### By category
- `UIE-UXD` — UX design teams, not product codebases

### By project name patterns
Skip projects whose name contains:
- "UX Research", "UXD Research"
- "Feedback"
- "ADR" (architecture decision records)
- "Documentation"
- "Strategy"
- "Applied AI UX"

### Known non-product project keys
| Key | Name | Why skip |
|-----|------|----------|
| AUX | Applied AI UX | UXD design project |
| CPUX | Core Platforms UX | UXD design project |
| HPUX | Hybrid Platforms User Experience | UXD design project |
| UXDR | UXD Research | Research project |
| CRCFEEDBK | Clouddot Feedback | Feedback tracker |
| ADR | ConsoleDot ADR | Architecture records |
| BXMSDOC | BxMS Documentation | Documentation |
| CONTENT | Content Testing | Content testing |
| ANSTRAT | Ansible Strategy | Strategy, covered by AAP |
| OCPBUGS | OpenShift Bugs | Bug tracker, covered by openshift/console |

## GitHub Organizations to Search

Search `@patternfly/react-core filename:package.json` in these orgs:

| Org | Products covered |
|-----|-----------------|
| `RedHatInsights` | ConsoleDot / Hybrid Cloud Console apps |
| `openshift` | OpenShift console + plugins |
| `redhat-developer` | Developer Hub, GitOps, Helm plugins |
| `cockpit-project` | Cockpit and related plugins |
| `ansible` | Ansible tooling UIs |
| `ansible-automation-platform` | AAP UI |
| `kubevirt-ui` | KubeVirt plugin |
| `red-hat-storage` | ODF console |
| `konveyor` | Migration toolkits |
| `opendatahub-io` | ODH dashboard |
| `red-hat-data-services` | RH Data Services |
| `stackrox` | ACS / StackRox |
| `hawtio` | Hawtio consoles |
| `kiali` | Kiali / Service Mesh |
| `openshift-pipelines` | Pipelines console plugin |
| `openshift-assisted` | Assisted installer |
| `skupperproject` | Skupper console |
| `netobserv` | Network observability |
| `artemiscloud` | AMQ Broker console |
| `EnMasseProject` | AMQ messaging |
| `Kuadrant` | Kuadrant console plugin |
| `freeipa` | FreeIPA Web UI |
| `cryostatio` | Cryostat Web |
| `infinispan` | Infinispan console |
| `patternfly` | PF seed/templates |
| `quay` | Quay |
| `Apicurio` | Apicurio Registry |
| `lightspeed-core` | Lightspeed Reference UI |
| `redhat-composer-ai` | Composer AI chatbot |
| `rh-aiservices-bu` | RH AI Services |
| `rh-ai-kickstart` | RH AI Kickstart |
| `RedHat-UX` | RedHat UX |

## Repo Name Convention

When generating `repos.json` entries, follow existing naming patterns:

| Org | Name prefix | Example |
|-----|------------|---------|
| `RedHatInsights/*` | `RedHatInsights-` | `RedHatInsights-ros-frontend` |
| `openshift/*` | `Openshift-` | `Openshift-mirror-gui` |
| `redhat-developer/*` | `Redhat-developer-` | `Redhat-developer-gitops-console-plugin` |
| `cockpit-project/*` | `Cockpit-` | `Cockpit-machines` |
| Other | Product name, hyphenated | `Kiali`, `Quay`, `Infinispan` |

## Exclusion Patterns for Repos

Skip repos whose name or description match:
- `*-template`, `*-seed`, `*-starter*`, `*-demo`
- `*-test`, `*-common-test`
- `*-guides`, `*-docs`
- `frontend-assets`, `frontend-common-test`
- `logger-demo`
- `ci-tools`
- `*-backend` (unless it has a frontend subfolder)

## Tiering Criteria

| Tier | Archived? | Last push | Language | PF confirmed? |
|------|-----------|-----------|----------|---------------|
| Tier 1 | No | < 6 months | TS/JS | Yes (package.json) |
| Tier 2 | No | 6-24 months | Any | Yes or likely |
| Archived | Yes | Any | Any | Any |
| Stale | No | > 24 months | Any | Any |
| Private | N/A | N/A | N/A | Jira refs only |
