---
description: Capture a new idea verbatim to .wrangler/ideas/
argument-hint: "<idea text>"
---

# Capture New Idea

## Parse Arguments

Extract the full text after `/idea`:
- Everything after `/idea ` is the idea content
- Preserve exact wording, punctuation, formatting
- Do NOT interpret, enhance, or rewrite

## Execute

Use the Task tool to dispatch a background agent:

```
Task tool with:
- subagent_type: "general-purpose"
- run_in_background: true
- description: "Capture new idea"
- prompt: |
    Use the wrangler:capturing-ideas skill to capture this idea verbatim:

    """
    $IDEA_TEXT
    """

    The skill will:
    - Use MCP issues_create tool with type='idea'
    - Preserve exact wording (no interpretation)
    - Save to .wrangler/ideas/ with proper frontmatter
    - Clean up any weird characters if needed
```

## Confirm

After dispatching the background agent, tell the user:

```
✓ Capturing idea in background...

Your idea will be saved to .wrangler/ideas/ with proper MCP frontmatter.
```

That's it. Let the background agent handle the rest.
