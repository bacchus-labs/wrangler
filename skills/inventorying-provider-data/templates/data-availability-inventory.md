# {Provider Name} Data Inventory

> **Status**: Draft | In Review | Complete
> **Researched by**: {agent/person}
> **Date**: {YYYY-MM-DD}
> **Last verified**: {YYYY-MM-DD}

## Provider Overview

| Detail | Value |
|--------|-------|
| **Provider** | {Provider Name} |
| **Category** | {e.g. Music, Fitness, Social, Finance, Health, Productivity} |
| **Has public API?** | Yes / No / Partial |
| **API documentation** | {URL or "N/A"} |
| **API auth method** | {OAuth 2.0 / API Key / Bearer Token / N/A} |
| **Has GDPR/CCPA export?** | Yes / No / Unknown |
| **Has in-app export?** | {e.g. "Settings > Export" or "N/A"} |
| **MeDB connector status** | Not started / Manifest only / Partial / Complete |

---

## Data Access Methods

### Performance Comparison

| Detail | API | In-App Export | GDPR/CCPA Data Request |
|--------|-----|---------------|------------------------|
| **History depth** | {e.g. 🔴 Last 50 / 🟡 1 year / 🟢 Full} | {if applicable} | {🟢 Full / 🟡 Partial / ❌ N/A} |
| **Rate limits** | {e.g. 🟡 100 req/15min / 🟢 None} | {🟢 None} | {🟢 None} |
| **Latency** | {🟢 Real-time / 🟡 Minutes} | {🟢 Instant / 🟡 Minutes} | {🔴 Days-weeks / 🟡 Hours} |
| **Automation** | {🟢 Full / 🟡 Partial} | {🟡 Manual / 🔴 Manual} | {🔴 Manual or 🟡 Email-based} |
| **Legal risk** | {🔴 ToS risk / 🟢 None} | {🟢 None} | {🟢 Guaranteed by law} |
| **Data completeness** | {🟡 Partial / 🟢 Full for scope} | {varies} | {🟢 Full} |

---

## Data Inventory by Category

<!--
  Instructions for researchers:
  - For each data type, mark availability per access method
  - ✅ = Available  |  ❌ = Not available  |  ❓ = Unknown/untested
  - Add notes for quirks (e.g. "max 50 items", "requires premium", "beta endpoint")
  - Group by logical category
-->

### User Profile

| Data Type | API | In-App Export | GDPR/CCPA Export | Notes |
|-----------|-----|---------------|------------------|-------|
| Display name | | | | |
| Email | | | | |
| Account creation date | | | | |
| Country/region | | | | |
| Subscription/plan level | | | | |
| Profile picture | | | | |
| {add rows as discovered} | | | | |

### Activity / History

| Data Type | API | In-App Export | GDPR/CCPA Export | Notes |
|-----------|-----|---------------|------------------|-------|
| {Primary activity type} | | | | {e.g. "API limited to 50 most recent"} |
| {Secondary activity} | | | | |
| Search history | | | | |
| {add rows as discovered} | | | | |

### Saved / Library Content

| Data Type | API | In-App Export | GDPR/CCPA Export | Notes |
|-----------|-----|---------------|------------------|-------|
| {Saved items type 1} | | | | |
| {Saved items type 2} | | | | |
| {add rows as discovered} | | | | |

### Social / Connections

| Data Type | API | In-App Export | GDPR/CCPA Export | Notes |
|-----------|-----|---------------|------------------|-------|
| Followers/following | | | | |
| Messages/DMs | | | | |
| {add rows as discovered} | | | | |

### Inferences / Analytics

| Data Type | API | In-App Export | GDPR/CCPA Export | Notes |
|-----------|-----|---------------|------------------|-------|
| {e.g. Top items, recommendations} | | | | |
| {e.g. Ad targeting segments} | | | | |
| {add rows as discovered} | | | | |

### Financial / Billing

| Data Type | API | In-App Export | GDPR/CCPA Export | Notes |
|-----------|-----|---------------|------------------|-------|
| Payment history | | | | |
| Subscription history | | | | |
| {add rows as discovered} | | | | |

---

## API Details

<!--
  Only fill this section if the provider has a public API.
  Delete this section entirely if API-only providers.
-->

### Authentication

| Detail | Value |
|--------|-------|
| **Auth type** | {OAuth 2.0 / API Key / etc.} |
| **Auth documentation** | {URL} |
| **Required scopes** | {comma-separated list} |
| **Token refresh?** | {Yes, automatic / Yes, manual / No} |
| **Partner program required?** | {Yes / No / For production scale} |
| **Partner application URL** | {URL or "N/A"} |

### User-Specific Endpoints

<!--
  List every endpoint that returns data specific to the authenticated user.
  Catalog/search endpoints (not user-specific) should be excluded.
-->

| Endpoint | Scope | Pagination | Key Fields | Gotchas |
|----------|-------|------------|------------|---------|
| `{METHOD} {path}` | {scope} | {offset/cursor/none} | {notable fields} | {e.g. "50 item hard limit", "beta endpoint"} |
| | | | | |

### Rate Limits

| Tier | Limit | Notes |
|------|-------|-------|
| {e.g. Default} | {e.g. 100 req/15min} | |
| {e.g. Partner} | {e.g. 1000 req/15min} | |

### Required OAuth Scopes Summary

| Scope | Grants access to |
|-------|-----------------|
| {scope name} | {what endpoints/data it unlocks} |
| | |

---

## GDPR/CCPA Data Request

<!--
  Only fill this section if the provider supports data requests.
  Delete entirely if not applicable.
-->

### How to Request

| Detail | Value |
|--------|-------|
| **Request URL** | {URL to privacy/data request page} |
| **Email alternative** | {e.g. privacy@provider.com or "N/A"} |
| **Authentication required?** | {Must be logged in / Email verification / ID required} |
| **Request options** | {e.g. "Basic" vs "Extended" checkboxes} |
| **Confirmation step** | {e.g. "Email confirmation link" / "None"} |

### Processing Time

| Bundle Type | Estimated Time | Notes |
|-------------|---------------|-------|
| {e.g. Basic/Standard} | {e.g. "< 1 day"} | |
| {e.g. Extended/Full} | {e.g. "Up to 30 days"} | |

### Delivery Format

| Detail | Value |
|--------|-------|
| **File format** | {ZIP / JSON / CSV / mixed} |
| **Delivery method** | {Download link in-app / Email with link / Email attachment} |
| **Link expiry** | {e.g. "Available for 30 days"} |

### Bundle Contents

| File / Section | Description | Format | Key fields |
|----------------|-------------|--------|------------|
| {filename or section} | {what data it contains} | {JSON/CSV/PDF} | {notable fields} |
| | | | |

---

## In-App Export

<!--
  Only fill if the provider has a built-in export feature (not GDPR).
  e.g. Goodreads CSV export, Google Takeout, etc.
-->

| Detail | Value |
|--------|-------|
| **Export location** | {e.g. "Settings > Your Data > Download"} |
| **Export URL** | {direct URL if available} |
| **Format** | {CSV / JSON / ZIP} |
| **Contents** | {what's included} |
| **Limitations** | {what's excluded vs GDPR bundle} |

---

## Connector Implementation Notes

### Recommended Approach

{1-2 paragraphs on the best strategy for MeDB: API-first with GDPR supplement? GDPR-only? In-app export? Hybrid?}

### Incremental Sync Strategy

| Stream | Strategy | Key |
|--------|----------|-----|
| {data stream 1} | {e.g. cursor-based / added_at cutoff / full re-fetch} | {e.g. "store after cursor"} |
| {data stream 2} | | |

### MeDB Manifest Fields

```json
{
  "connectivity": {
    "type": "{api_polling | file_import | hybrid}",
    "requiresInternet": {true | false},
    "dataFrequency": "{periodic | on_demand}",
    "dataProcessing": "local_only"
  },
  "oauth": {
    "provider": "{provider_id}",
    "scopes": ["{scope1}", "{scope2}"]
  },
  "import": {
    "fileTypes": ["{zip | csv | json}"],
    "expectedStructure": "{description of expected file structure}"
  }
}
```

### Open Questions

- {Question 1 that needs further investigation}
- {Question 2}

---

## Useful Links

| Resource | URL |
|----------|-----|
| API Documentation | {URL} |
| Developer Portal | {URL} |
| Privacy/Data Request Page | {URL} |
| Terms of Service | {URL} |
| Developer Terms | {URL} |
| Rate Limit Docs | {URL} |
| Partner Application | {URL} |
| Community/Forum | {URL} |
| {Other relevant resource} | {URL} |
