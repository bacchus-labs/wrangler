---
description: Generate a situational report showing what's new since your last sitrep
argument-hint: "[--full | --help]"
---

## Check for Help Flag

If `$ARGUMENTS` contains `--help` or `help`:

**Display help and exit** - do NOT invoke the skill. Output the help text below directly:

````
/wrangler:sitrep - Situational Awareness Report

USAGE:
    /wrangler:sitrep [OPTIONS]

DESCRIPTION:
    Generate a "what's new" report showing activity since your last sitrep.
    Surfaces new memos, recent commits, decisions, open questions, and
    roadmap status to keep you informed before evaluating priorities.

    On first run, shows the last 7 days of activity. Subsequent runs show
    only new activity since your last sitrep (incremental updates).

OPTIONS:
    --full     Ignore cursor, show full 7-day report (like first run)
    --help     Show this help message and exit

FILES READ:
    .wrangler/cache/{user}-sitrep.json    Your sitrep cursor state
    .wrangler/memos/*.md                  Memo files for surfacing
    .wrangler/ROADMAP_NEXT_STEPS.md       Roadmap completion status
    .wrangler/issues/*.md                 Issue status (via MCP)

FILES WRITTEN:
    .wrangler/cache/{user}-sitrep.json    Updated cursor after each run

STATE FILE FORMAT:
    {
      "cursor": { "commit": "abc123" },   # Last commit you saw
      "stats": { "runs": 5, ... }         # Cumulative stats
    }

WORKFLOW:
    1. Detect user from git config (email prefix)
    2. Load cursor from state file (or default to 7 days)
    3. Gather data in parallel:
       - Git commits since cursor
       - New memos with decisions/questions
       - Issue and roadmap status
    4. Generate report with:
       - NEW MEMOS (read first!)
       - Recent activity by author
       - Decisions made
       - Open questions
       - Roadmap status & high-priority issues
    5. Update cursor to latest commit

EXAMPLES:
    /wrangler:sitrep              # Incremental: what's new since last run
    /wrangler:sitrep --full       # Full overview: last 7 days
    /wrangler:sitrep --help       # Show this help

SEE ALSO:
    /wrangler:issues              # View issue/spec status
    /wrangler:help                # Full wrangler documentation
````

**After displaying help, stop.** Do not invoke the skill.

---

## Invoke Skill (Normal Execution)

If no help flag, use the Skill tool to load the sitrep skill:

```
Skill: sitrep
Args: $ARGUMENTS
```

The skill handles state management, data gathering, and report generation.
