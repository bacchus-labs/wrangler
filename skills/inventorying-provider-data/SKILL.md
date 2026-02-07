---
name: inventorying-provider-data
description: Conducts thorough data availability research for a single data provider (e.g. Spotify, Strava, Instagram). Use when investigating what user data a provider makes available via API, GDPR/CCPA export, or in-app export — produces a structured inventory document covering every data type, access method, endpoint, and request flow. Outputs to docs/providers/{provider}/.
---

# Inventorying Provider Data

## Overview

Systematically research and document ALL user data available from a single provider across every access method (API, GDPR/CCPA bundle, in-app export). Produce a complete inventory that enables connector implementation decisions.

**Output**: A completed `data-availability-inventory.md` in `docs/providers/{provider}/`.

## When to Use

- Starting work on a new provider connector
- Auditing an existing connector for missing data streams
- User asks "what data can we get from {provider}?"
- Planning which access methods to implement (API vs import vs both)

## Process

### Phase 1: Reconnaissance (Web Research)

Research the provider using web sources. Gather information on ALL three access channels:

**1. API**
- Find official API documentation
- Identify all user-specific endpoints (not catalog/search)
- Document auth method, scopes, rate limits
- Note any partner program or approval gates
- Look for known limitations (e.g. Spotify's 50-track recently-played buffer)

**2. GDPR/CCPA Data Request**
- Find the provider's privacy/data request page
- Document the request flow (URL, steps, confirmation)
- Research processing time (check reddit, forums for real reports)
- Find what data is included in the bundle (official docs + user reports)
- Note any options (e.g. "basic" vs "extended" export)

**3. In-App Export**
- Check if provider offers a non-GDPR export (e.g. Goodreads CSV, Google Takeout)
- Document location, format, and what's included
- Note limitations vs the GDPR bundle

**Research tips:**
- Search `site:reddit.com "{provider} data export"` for real user experiences
- Search `"{provider}" GDPR request days` for processing time reports
- Check `{provider} API changelog` for recently added/deprecated endpoints
- Look for community client libraries — they often document undocumented behavior

### Phase 2: API Exploration (If Applicable)

If the provider has an API and we have credentials:

1. **Test every user-specific endpoint** — don't trust docs alone
2. **Document actual response shapes** — note fields docs don't mention
3. **Test pagination behavior** — cursor vs offset, hard limits, sort order
4. **Test incremental patterns** — does the endpoint support `since` or cursor-based polling?
5. **Count actual data** — record real item counts for the user
6. **Note quirks** — null IDs, deleted content, beta endpoints, undocumented fields

### Phase 3: Fill the Template

Use the template at `templates/data-availability-inventory.md`. Key rules:

- **Every row must be filled** — use ❓ for genuinely unknown, never leave blank
- **Delete inapplicable sections** — if no API, delete "API Details"; if no GDPR, delete that section
- **Add categories as discovered** — the template categories are starting points, not exhaustive
- **Include gotchas prominently** — hard limits, beta status, deprecated endpoints
- **Links must be real** — verify every URL loads

### Phase 4: Cross-Validate

Compare data availability across methods:

| Question | Why it matters |
|----------|---------------|
| What does GDPR give that API doesn't? | Identifies data only available via import |
| What does API give that GDPR doesn't? | Identifies real-time-only data |
| Are there data types in neither? | Identifies gaps or undiscovered endpoints |
| Do counts match across methods? | Validates completeness |

### Phase 5: Implementation Recommendations

Based on the inventory, recommend:

1. **Primary access method** — API-first? Import-only? Hybrid?
2. **Which scopes/permissions to request** — only what's needed
3. **Incremental sync strategy per stream** — cursor, timestamp, snapshot, or full
4. **Sync frequency** — based on data velocity and API limits
5. **MeDB manifest fields** — connectivity type, oauth config, import config

## Output Location

```
docs/providers/{provider}/
├── data-availability-inventory.md   # The completed template
└── {topic-specific-notes}.md        # Optional: deep dives (e.g. recently-played.md)
```

## Quality Checklist

Before marking complete:

- [ ] Every data type the provider holds is listed (check their privacy policy for hints)
- [ ] Every user-specific API endpoint is documented (not just the ones we use)
- [ ] GDPR/CCPA request flow is documented step-by-step with real URLs
- [ ] Processing time estimates have sources (not guesses)
- [ ] All links verified working
- [ ] Performance comparison table filled (history depth, rate limits, latency, risk)
- [ ] Implementation recommendations included
- [ ] Manifest JSON snippet ready for connector work
- [ ] Open questions listed (not hidden)

## Providers Without APIs

Many providers (Instagram, LinkedIn, Netflix, Amazon) have no useful public API for user data export. For these:

- **Skip the API sections entirely** — delete them from the template
- **Focus on GDPR/CCPA bundle analysis** — this is the primary/only access method
- **Document the in-app export if available** — e.g. Instagram's "Download Your Information"
- **Research the bundle format thoroughly** — what files, what fields, what format (JSON/CSV/HTML)
- **Note the request flow precisely** — users will need step-by-step instructions
- **Research processing times from real users** — search forums for actual experiences

## Common Provider Patterns

| Pattern | Examples | MeDB Approach |
|---------|----------|---------------|
| Rich API + GDPR | Spotify, GitHub, Strava | API for real-time, GDPR for historical backfill |
| Limited API + GDPR | Spotify recently-played | API for incremental, GDPR for full history |
| No API, has GDPR | Instagram, LinkedIn, Netflix | Import-only connector with file upload |
| No API, has in-app export | Goodreads, some fitness apps | Import-only, document export steps |
| API with partner gate | Spotify (at scale), Twitter | Document gate; build for individual use first |

## Related Skills

- `researching-web-sources` — for Phase 1 web research
- `implementing-issue` — for building the connector after inventory
- `writing-specifications` — if the connector needs a spec before implementation
