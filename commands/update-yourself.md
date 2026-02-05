---
description: Update wrangler plugin to latest version by clearing all caching layers
---

# /wrangler:updating-wrangler

Update the wrangler plugin to the latest version from GitHub.

## Invoke Skill

Use the Skill tool to load the update-yourself skill:

```
Skill: update-yourself
```

The skill contains full instructions for clearing all caching layers and forcing a fresh install.

## Quick Summary

This command clears three caching layers that can get out of sync:
1. Marketplace clone (local git repo)
2. Installed plugin cache
3. installed_plugins.json entry

After running, user must restart Claude Code.
