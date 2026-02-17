---
description: Initialize or verify the .wrangler/ workspace directory structure.
argument-hint: "[--fix] [--project-root=path]"
---

# /wrangler:init-workspace

Initialize or verify the `.wrangler/` workspace directory structure using the `init_workspace` MCP tool. Idempotent -- safe to run repeatedly.

## Arguments

- `--fix` (optional) -- Apply changes. Without this flag, runs in report-only mode showing what would be created.
- `--project-root=<path>` (optional) -- Override project root directory. Defaults to git root or cwd.

## What This Tool Does

The `init_workspace` MCP tool is the schema-driven workspace initializer. It:

1. **Creates directories** defined in `workspace-schema.json` using mkdir -p semantics (idempotent)
2. **Provisions builtin assets** -- copies agent definitions, prompt templates, and workflow YAML files into `.wrangler/orchestration/` subdirectories, skipping any file that already exists at the destination (never overwrites user customizations)
3. **Generates config** -- creates `.wrangler/config/wrangler.json` with project defaults if it doesn't exist
4. **Manages .gitignore** -- appends missing patterns from the schema without duplicating existing entries
5. **Updates schema** -- copies `workspace-schema.json` to the project if the plugin has a newer version

## Modes

### Report-Only (default, fix: false)

Shows what would be created without making any changes. Use this to audit workspace state.

```
init_workspace {}
```

Returns status: `compliant` (everything exists) or `changes_needed` (with details of what's missing).

### Apply (fix: true)

Creates all missing directories, copies missing assets, generates config, updates gitignore.

```
init_workspace { "fix": true }
```

Returns status: `initialized` (changes were made) or `compliant` (nothing to do).

## Instructions

1. Call the `init_workspace` MCP tool with the appropriate parameters
2. Review the structured result showing directories, assets, config, and gitignore status
3. Report findings to the user

### Report-only mode (no --fix flag):

```typescript
init_workspace({})
// or with explicit project root:
init_workspace({ projectRoot: "/path/to/project" })
```

### Apply mode (--fix flag):

```typescript
init_workspace({ fix: true })
// or with explicit project root:
init_workspace({ fix: true, projectRoot: "/path/to/project" })
```

## Output Structure

The tool returns:

- **status**: `compliant` | `initialized` | `changes_needed`
- **directories**: which were created vs. already existed
- **assets**: agents, prompts, and workflows -- which were copied vs. skipped
- **config**: whether wrangler.json and workspace-schema.json were created/updated
- **gitignore**: which patterns were added vs. already present

## Asset Provisioning Details

Builtin assets are copied from the plugin directory into the project's `.wrangler/orchestration/`:

| Source (plugin) | Destination (project) | Files |
|---|---|---|
| `workflows/agents/*.md` | `.wrangler/orchestration/agents/` | Agent definitions (analyzer, implementer, reviewer, etc.) |
| `workflows/prompts/*.md` | `.wrangler/orchestration/prompts/` | Prompt templates (analyze-spec, implement-task, etc.) |
| `workflows/*.yaml` | `.wrangler/orchestration/workflows/` | Workflow definitions (spec-implementation, code-review) |

Users can customize any of these files in their project. The tool will never overwrite existing files -- it only copies missing ones.

## When to Use

- After installing or updating wrangler to pick up new directories or assets
- When setting up a new project
- To audit whether a workspace is fully configured
- After schema changes that add new directories

## See Also

- `/wrangler:help` -- Full documentation
- `initializing-governance` skill -- Creates CONSTITUTION.md, ROADMAP.md (governance files, not workspace structure)
