---
id: SPEC-000049
title: >-
  init_workspace MCP tool - Idempotent .wrangler/ directory initialization and
  builtin asset provisioning
type: specification
status: open
priority: high
labels:
  - specification
  - mcp
  - workspace
  - init
createdAt: '2026-02-16T20:47:06.807Z'
updatedAt: '2026-02-16T20:58:36.925Z'
---
# Specification: init_workspace MCP Tool

## Executive Summary

**What:** An MCP tool (`init_workspace`) that initializes and maintains the `.wrangler/` directory structure in any project. It creates directories, provisions builtin assets (agents, prompts, workflows), generates config files, and manages `.gitignore` -- all idempotently, never overwriting existing content.

**Why:** Today's `session-start.sh` uses a brittle one-shot check (`if .wrangler/issues/ exists, skip everything`). This means:
- New directories added to `workspace-schema.json` are never created in existing projects
- Builtin agents/prompts/workflows are not available for project-level customization
- No config file is generated for the project
- No way to run initialization on-demand or in report-only mode

**Scope:**
- Included: Directory creation, builtin asset copying, config generation, .gitignore management, report-only mode, session-start.sh simplification
- Excluded: Governance file generation (constitution, roadmap -- that's the `initializing-governance` skill), issue/spec template creation, workflow engine configuration

**Extracted from:** SPEC-000048 Component 1 (workspace_sync), renamed and expanded to include builtin asset provisioning.

**Reference implementation:** archive-wingman's `InitCommand` + `DirectoryManager` at `/Users/sam/medb/projects/bacchus-labs/archive-wingman/wingman-main/src/cli/commands/init.ts`

## Goals and Non-Goals

### Goals

- Replace the fragile one-shot init in `session-start.sh` with an idempotent, schema-driven tool
- Make builtin agents, prompts, and workflow YAML files available in the project's `.wrangler/` for user customization
- Provide a report-only mode (`fix: false`) that shows what would be created without making changes
- Ensure new schema directories are created in existing projects on subsequent runs
- Generate a default wrangler config JSON in `.wrangler/config/`

### Non-Goals

- Generating governance files (CONSTITUTION.md, ROADMAP.md) -- that's the `initializing-governance` skill
- Overwriting any existing files or directories
- Deleting or renaming legacy paths (out of scope for v1)
- Providing a CLI command (this is an MCP tool; the session hook calls it)
- Managing the workflow engine's session state directories

## Background & Context

### Current State

`hooks/session-start.sh` line 125-126:
```bash
if [ -d "${GIT_ROOT}/.wrangler/issues" ]; then
    return 0  # Already initialized - skip
fi
```

This means:
1. If `.wrangler/issues/` exists, ALL initialization is skipped
2. Adding `sessions/` to the schema (as was done recently) has no effect on existing projects
3. Builtin agents/prompts/workflows live only in `workflows/agents/`, `workflows/prompts/` -- users cannot customize them per-project
4. No project-level config file exists

### Proposed State

An MCP tool that:
1. Reads `workspace-schema.json` from the **plugin directory** (single source of truth)
2. Creates any missing directories via `mkdir -p` (naturally idempotent)
3. Copies builtin assets (agents, prompts, workflow YAML) into `.wrangler/orchestration/` subdirectories only if the target file does not already exist
4. Generates `.wrangler/config/wrangler.json` with project defaults (only if it doesn't exist)
5. Manages `.wrangler/.gitignore` by appending missing patterns (never duplicating)
6. Returns a structured report of what was created vs. what already existed

### Builtin Assets to Provision

**From `workflows/agents/` (6 files):**
- `analyzer.md`, `fixer.md`, `implementer.md`, `publisher.md`, `reviewer.md`, `verifier.md`

**From `workflows/prompts/` (13 files):**
- `analyze-diff.md`, `analyze-spec.md`, `code-quality-review.md`, `consolidate-review.md`, `fix-issues.md`, `implement-task.md`, `publish-changes.md`, `review-code-quality.md`, `review-security.md`, `review-testing.md`, `run-verification.md`, `security-review.md`, `test-coverage-review.md`

**From `workflows/*.yaml` (2 files):**
- `spec-implementation.yaml`, `code-review.yaml`

**Target locations in project:**
- `.wrangler/orchestration/agents/` -- agent definitions
- `.wrangler/orchestration/prompts/` -- prompt templates
- `.wrangler/orchestration/workflows/` -- workflow YAML files

## Requirements

### Functional Requirements

- **FR-001:** Tool MUST read directory structure from `workspace-schema.json` located in the plugin directory (not the project directory)
- **FR-002:** Tool MUST create all directories defined in the schema using `mkdir -p` semantics (create parents, no-op if exists)
- **FR-003:** Tool MUST create `.gitkeep` files in empty git-tracked directories (per schema `gitTracked` field)
- **FR-004:** Tool MUST copy builtin agent markdown files from `{pluginRoot}/workflows/agents/` to `{projectRoot}/.wrangler/orchestration/agents/`, skipping any file that already exists at the destination
- **FR-005:** Tool MUST copy builtin prompt markdown files from `{pluginRoot}/workflows/prompts/` to `{projectRoot}/.wrangler/orchestration/prompts/`, skipping any file that already exists at the destination
- **FR-006:** Tool MUST copy builtin workflow YAML files from `{pluginRoot}/workflows/*.yaml` to `{projectRoot}/.wrangler/orchestration/workflows/`, skipping any file that already exists at the destination
- **FR-007:** Tool MUST generate `.wrangler/config/wrangler.json` with default project configuration if the file does not already exist
- **FR-008:** Tool MUST manage `.wrangler/.gitignore` by appending patterns from the schema's `gitignorePatterns` array without duplicating existing entries
- **FR-009:** When `fix: false` (default), tool MUST report what would be created/copied without making any changes
- **FR-010:** When `fix: true`, tool MUST apply all changes and return a report of what was done
- **FR-011:** Tool MUST copy `workspace-schema.json` from the plugin directory to `.wrangler/config/workspace-schema.json` if it does not already exist or if the plugin version is newer
- **FR-012:** Tool MUST never overwrite, modify, or delete any existing file content
- **FR-013:** Tool MUST work correctly whether called on a fresh project (no `.wrangler/` at all) or an existing project with partial structure

### Non-Functional Requirements

- **NFR-001:** Tool MUST complete in under 2 seconds for a typical project
- **NFR-002:** Tool MUST not require any external dependencies beyond Node.js fs operations
- **NFR-003:** Tool MUST handle the case where the plugin directory is read-only
- **NFR-004:** Tool MUST produce clear, structured output suitable for both human reading and programmatic consumption

## Architecture

### Component: init_workspace MCP Tool

**Location:** `mcp/tools/workspace/init.ts`

**Input Schema:**
```typescript
{
  fix?: boolean  // default: false (report-only mode)
}
```

**Output Schema:**
```typescript
{
  status: 'compliant' | 'initialized' | 'changes_needed',
  directories: {
    created: string[],    // dirs that were (or would be) created
    existing: string[],   // dirs that already existed
  },
  assets: {
    agents: { copied: string[], skipped: string[] },
    prompts: { copied: string[], skipped: string[] },
    workflows: { copied: string[], skipped: string[] },
  },
  config: {
    created: boolean,     // whether wrangler.json was (or would be) created
    schemaUpdated: boolean, // whether workspace-schema.json was (or would be) updated
  },
  gitignore: {
    patternsAdded: string[],  // new patterns added to .gitignore
    existing: string[],       // patterns that already existed
  }
}
```

**Key behaviors:**
1. Resolves `pluginRoot` from its own module location (same pattern as `cli.ts` line 86)
2. Resolves `projectRoot` from git root (`git rev-parse --show-toplevel`) or cwd
3. Reads schema from `{pluginRoot}/.wrangler/config/workspace-schema.json`
4. For each schema directory: check existence, create if missing (when `fix: true`)
5. For each builtin asset: check if destination file exists, copy if missing (when `fix: true`)
6. For config: generate default if missing (when `fix: true`)
7. For .gitignore: read existing, compute diff, append missing patterns (when `fix: true`)
8. Returns structured report regardless of `fix` value

### Default Config Template

`.wrangler/config/wrangler.json`:
```json
{
  "version": "1.0.0",
  "workspace": {
    "issuesDirectory": ".wrangler/issues",
    "specificationsDirectory": ".wrangler/specifications",
    "ideasDirectory": ".wrangler/ideas"
  }
}
```

### Integration: session-start.sh Changes

The `initialize_workspace()` function in `session-start.sh` (lines 117-207) should be replaced with a thin caller. The hook should:

1. Ensure the MCP server is built (existing logic, lines 12-23)
2. Call `init_workspace` with `fix: true` via the MCP server (or replicate minimal directory creation in bash as a bootstrap fallback)
3. Remove the "already initialized" early-return check (line 125-128)

**Bootstrap consideration:** The MCP server itself needs `.wrangler/issues/` to exist before it can function. The hook should retain minimal bash logic to create `.wrangler/` and `.wrangler/issues/` as a bootstrap, then delegate the rest to the MCP tool on first agent invocation.

### Registration

Register in `mcp/server.ts`:
- Tool name: `init_workspace`
- Add to `getAvailableTools()` list
- Add case in the tool dispatch switch

### Directory in workspace-schema.json

The schema needs a new `orchestration` directory entry with three subdirectories:
```json
"orchestration": {
  "path": ".wrangler/orchestration",
  "description": "Workflow engine assets -- agents, prompts, and workflow definitions",
  "gitTracked": true,
  "subdirectories": {
    "agents": {
      "path": ".wrangler/orchestration/agents",
      "description": "Agent definitions (project-level overrides + builtins)"
    },
    "prompts": {
      "path": ".wrangler/orchestration/prompts",
      "description": "Prompt templates (project-level overrides + builtins)"
    },
    "workflows": {
      "path": ".wrangler/orchestration/workflows",
      "description": "Workflow YAML definitions (project-level overrides + builtins)"
    }
  }
}
```

### Resolver Update

The workflow engine's `WorkflowResolver` 2-tier search must be updated to look in the new location:
1. `{projectRoot}/.wrangler/orchestration/{kind}/` (project-level, was `.wrangler/{kind}/`)
2. `{pluginRoot}/workflows/{kind}/` (builtin fallback, unchanged)

This affects `workflows/engine/src/resolver.ts` and `workflows/engine/src/cli.ts`.

## Testing Strategy

### Unit Tests

**Location:** `mcp/__tests__/tools/workspace/init.test.ts`

1. **Fresh workspace** -- no `.wrangler/` exists; verify all dirs, assets, config, gitignore created
2. **Existing workspace, fully compliant** -- everything exists; verify status is `compliant`, nothing created
3. **Existing workspace, missing new dirs** -- simulate schema update adding a new directory; verify only the new dir is created
4. **Existing workspace, customized assets** -- user modified `implementer.md`; verify it is NOT overwritten
5. **Existing workspace, missing some assets** -- some agent files deleted; verify only missing ones are copied
6. **Report-only mode (fix: false)** -- verify no filesystem changes, but report shows what would happen
7. **Apply mode (fix: true)** -- verify filesystem changes match the report
8. **Gitignore idempotency** -- run twice; verify no duplicate patterns
9. **Gitignore with custom entries** -- user added custom patterns; verify they are preserved and new schema patterns appended
10. **Config not overwritten** -- existing `wrangler.json` with custom content; verify not replaced
11. **Schema version check** -- plugin has newer schema; verify it updates the project copy
12. **No git repo** -- verify graceful handling when not in a git repository

### Integration Tests

- End-to-end: call via MCP protocol, verify response structure
- Verify tool appears in `getAvailableTools()` list

## Error Handling

- Missing plugin directory: return error with clear message about plugin installation
- Not in git repo: return success with empty report (graceful degradation)
- Read-only filesystem: return error identifying which operation failed
- Malformed schema: return error with schema path and parse error details
- File copy failures: report per-file errors without aborting entire operation

## Implementation Notes

### File Copy Strategy

Follow archive-wingman's pattern: copy individual files, not directories. Check each destination file independently:

```typescript
for (const file of builtinAgents) {
  const dest = path.join(projectRoot, '.wrangler/orchestration/agents', file);
  if (!await fs.pathExists(dest)) {
    await fs.copy(path.join(pluginRoot, 'workflows/agents', file), dest);
    report.assets.agents.copied.push(file);
  } else {
    report.assets.agents.skipped.push(file);
  }
}
```

This is more granular than wingman's `isDirectoryEmpty()` check -- it allows partial provisioning where some files are customized and others are freshly copied.

### Resolver Integration

The workflow engine's `WorkflowResolver` already implements 2-tier search:
1. `{projectRoot}/.wrangler/orchestration/{kind}/` (project-level)
2. `{pluginRoot}/workflows/{kind}/` (builtin fallback)

After `init_workspace` copies builtins into `.wrangler/orchestration/agents/` and `.wrangler/orchestration/prompts/`, the resolver's tier-1 search will find them there. Users can then modify those copies freely -- the resolver will use the project copy over the builtin.

## Success Criteria

- [ ] `init_workspace` MCP tool implemented and registered
- [ ] Report-only mode works correctly (no side effects)
- [ ] Apply mode creates all expected structure
- [ ] All 12+ unit test scenarios pass
- [ ] Existing files are never overwritten (verified by tests)
- [ ] `session-start.sh` simplified to use thin bootstrap + delegates to tool
- [ ] `workspace-schema.json` updated with orchestration directory and subdirectories
- [ ] `WorkflowResolver` updated to search `.wrangler/orchestration/{kind}/`
- [ ] Running tool twice produces identical results (idempotent)

## References

- SPEC-000048: Codify Procedural Skill Steps (parent spec, Component 1 extracted here)
- archive-wingman init command: `/Users/sam/medb/projects/bacchus-labs/archive-wingman/wingman-main/src/cli/commands/init.ts`
- archive-wingman DirectoryManager: `/Users/sam/medb/projects/bacchus-labs/archive-wingman/wingman-main/src/utils/directory.ts`
- Current session hook: `/Users/sam/medb/projects/wrangler/hooks/session-start.sh`
- Workspace schema: `/Users/sam/medb/projects/wrangler/.wrangler/config/workspace-schema.json`
- Workflow resolver: `/Users/sam/medb/projects/wrangler/workflows/engine/src/resolver.ts`
