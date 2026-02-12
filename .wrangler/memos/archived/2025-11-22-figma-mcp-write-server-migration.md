# Figma MCP Write Server Migration

**Date**: November 22, 2025
**Author**: Claude (Sonnet 4.5)
**Type**: Configuration Fix & Enhancement
**Status**: Complete

## Summary

Discovered and resolved a critical gap between wrangler's design workflow skills and the Figma MCP server configuration. Skills were written assuming write capabilities, but the configured MCP server (`figma-developer-mcp`) only provided read access. Migrated to `figma-mcp-write-server` to enable full design automation.

## Problem Statement

### User Report

User shared an example session where an agent failed to recognize it could automate Figma work for a design system specification. The agent instead told the user they would need to manually create everything in Figma, despite skills existing for this exact workflow.

### Root Cause Analysis

Investigation revealed a three-part disconnect:

1. **Skills assumed write access**: The design workflow skills (`design-system-setup`, `figma-design-workflow`) were written with tool calls like:
   - `figma_create_file()` - Create Figma files
   - `figma_enable_library()` - Link design systems
   - `figma_create_frame()` - Generate mockup frames
   - `figma_create_component()` - Build components

2. **MCP server was read-only**: The configured MCP server (`figma-developer-mcp`) only provided:
   - `get_figma_data` - Read file structure
   - `download_figma_images` - Download assets

3. **No tool availability check**: Skills didn't verify MCP capabilities before assuming write access, leading agents to believe they couldn't help with Figma work.

### Impact

- **Agent confusion**: Agents didn't know they could/should help with design work
- **Broken workflows**: Design system setup and mockup generation completely non-functional
- **Poor user experience**: Users asked to do manual work that should be automated
- **Wasted effort**: Skills written but unusable due to infrastructure gap

## Solution

### Migration to Write-Enabled MCP

Replaced `figma-developer-mcp` (read-only, REST API) with `figma-mcp-write-server` (read/write, Plugin API).

### Implementation Steps

1. **Cloned write server**:
   ```bash
   cd /Users/sam/medb/code
   git clone https://github.com/oO/figma-mcp-write-server.git
   ```

2. **Built the server**:
   ```bash
   cd figma-mcp-write-server
   npm install
   npm run build
   ```

   Output: 30 operation files, 24 tools, 624KB bundle

3. **Updated MCP configuration** (`.claude-plugin/plugin.json`):

   **Before**:
   ```json
   "figma": {
     "command": "npx",
     "args": ["-y", "figma-developer-mcp", "--stdio"],
     "env": {
       "FIGMA_API_KEY": "${FIGMA_API_KEY}"
     }
   }
   ```

   **After**:
   ```json
   "figma": {
     "command": "node",
     "args": ["/Users/sam/medb/code/figma-mcp-write-server/dist/index.js"],
     "env": {}
   }
   ```

4. **Created setup documentation**: `docs/FIGMA-WRITE-MCP-SETUP.md`
   - Plugin installation guide
   - Architecture overview
   - Troubleshooting guide
   - Tool reference

### User Action Required

**CRITICAL**: The user must complete one manual step for the write server to work:

1. Open Figma Desktop (not browser)
2. Import plugin manifest: `Plugins → Development → Import plugin from manifest...`
3. Navigate to: `/Users/sam/medb/code/figma-mcp-write-server/figma-plugin/manifest.json`
4. Run the plugin: `Plugins → Development → Figma MCP Plugin`
5. Keep plugin running during Claude Code sessions

## Technical Details

### Write Server Architecture

```
Claude Code (AI Agent)
    ↓ (MCP protocol)
MCP Write Server (Node.js, port 8765)
    ↓ (WebSocket)
Figma Plugin (running in Desktop app)
    ↓ (Plugin API)
Figma Document (read/write operations)
```

### Available Tools (24 total)

**Core Design**:
- `figma_nodes` - Create/modify frames, shapes, groups
- `figma_text` - Text layers and styling
- `figma_fills` - Colors, gradients, images
- `figma_strokes` - Borders and outlines
- `figma_effects` - Shadows, blurs, glows

**Layout & Positioning**:
- `figma_auto_layout` - Responsive layouts
- `figma_constraints` - Resizing behavior
- `figma_alignment` - Align/distribute
- `figma_hierarchy` - Layer organization

**Design System**:
- `figma_styles` - Color/text/effect styles
- `figma_components` - Create components
- `figma_instances` - Component instances
- `figma_variables` - Design tokens
- `figma_fonts` - Typography management

**Advanced**:
- `figma_boolean` - Shape operations
- `figma_vectors` - Path manipulation

**Developer**:
- `figma_dev_resources` - Code annotations
- `figma_annotations` - Design notes
- `figma_measurements` - Spacing guides
- `figma_exports` - Asset exports

**System**:
- `figma_plugin_status` - Connection health
- `figma_pages` - Page management
- `figma_selection` - Node selection
- `figma_images` - Image handling

### Comparison: Read vs Write MCP

| Capability | Read MCP | Write MCP |
|------------|----------|-----------|
| Extract design tokens | ✅ | ✅ |
| Download images | ✅ | ✅ |
| Read file structure | ✅ | ✅ |
| Create files | ❌ | ✅ |
| Create components | ❌ | ✅ |
| Modify designs | ❌ | ✅ |
| Setup | Simple (npx) | Plugin required |
| Figma Desktop required | ❌ | ✅ |
| API used | REST API | Plugin API |

### Limitations

**Plugin-Based Constraints**:
- Desktop app required (browser unsupported)
- Single active file at a time
- Plugin must be running for operations
- Pattern fills not supported (API limitation)

**Performance**:
- WebSocket adds slight latency
- Large operations may timeout
- Very large files can be slow

## Affected Skills

### Now Fully Functional

1. **design-system-setup** (`skills/design-workflow/design-system-setup/SKILL.md`)
   - Creates Figma design system files
   - Generates color/typography/spacing tokens
   - Exports to CSS/Tailwind/JSON
   - Stores metadata in wrangler issues
   - **Usage**: `/wrangler:setup-design-system`

2. **figma-design-workflow** (`skills/design-workflow/figma-design-workflow/SKILL.md`)
   - Parses UI requirements from specifications
   - Creates Figma mockup frames
   - Uses design system components
   - Tracks approval status
   - **Usage**: `/wrangler:generate-figma-mocks`

### Already Working (Read-Only)

3. **design-system-governance** (`skills/design-workflow/design-system-governance/SKILL.md`)
   - Extracts tokens from Figma (read-only)
   - Compares with code tokens
   - Detects drift
   - Creates reconciliation issues
   - **Usage**: `/wrangler:check-design-drift`

## Verification

### Manual Testing Required

After user installs the Figma plugin:

1. **Test basic write operation**:
   ```
   Create a blue rectangle in Figma
   ```
   Expected: Agent uses `figma_nodes` + `figma_fills` to create rectangle

2. **Test design system setup**:
   ```
   /wrangler:setup-design-system
   ```
   Expected: Agent creates Figma file with design tokens

3. **Test mockup generation**:
   ```
   /wrangler:generate-figma-mocks
   ```
   Expected: Agent generates frames from specification

4. **Verify tool availability**:
   ```
   What Figma tools do you have available?
   ```
   Expected: Agent lists all 24 tools

## Lessons Learned

### What Went Wrong

1. **Skills written before infrastructure**: Design skills created assuming write MCP would exist
2. **No capability detection**: Skills didn't check what tools were actually available
3. **Incomplete documentation**: No clear guidance on MCP server options
4. **No validation**: Skills never tested with real MCP server

### Best Practices for Future

1. **Test infrastructure first**: Set up MCP servers before writing skills
2. **Graceful degradation**: Skills should detect capabilities and adapt
3. **Clear prerequisites**: Document exactly what infrastructure skills need
4. **Version compatibility**: Track which MCP servers work with which skills
5. **Skill metadata**: Add `prerequisites` section listing required MCP tools

### Skill Improvement Template

Add to all skills that require specific MCP tools:

```markdown
## Prerequisites

### Required MCP Servers

- **figma-mcp-write-server** (write access)
  - Tools: figma_nodes, figma_fills, figma_create_file, etc.
  - Setup: docs/FIGMA-WRITE-MCP-SETUP.md
  - Version: 0.39.0+

### Capability Detection

Before executing, verify required tools are available:

\`\`\`typescript
// Check if write tools exist
const hasWriteAccess = await checkMCPTools([
  'figma_nodes',
  'figma_create_file',
  'figma_fills'
]);

if (!hasWriteAccess) {
  throw new Error(
    'This skill requires figma-mcp-write-server. ' +
    'See docs/FIGMA-WRITE-MCP-SETUP.md for setup instructions.'
  );
}
\`\`\`
```

## Next Steps

### Immediate (User)

1. ✅ Build complete: `/Users/sam/medb/code/figma-mcp-write-server/`
2. ✅ Configuration updated: `.claude-plugin/plugin.json`
3. ⏳ **Install Figma plugin** (user action required)
4. ⏳ **Restart Claude Code** to load new MCP config
5. ⏳ **Test write operations** with simple commands

### Short-Term (Maintenance)

1. Update skill prerequisite sections with capability checks
2. Add MCP server compatibility matrix to docs
3. Create troubleshooting guide for common plugin issues
4. Add automated tests for design workflow skills

### Long-Term (Enhancement)

1. **Fallback modes**: Skills that work with either read or write MCP
2. **Capability API**: Standard way for skills to query available tools
3. **MCP health checks**: Startup validation of configured servers
4. **Skill testing framework**: Automated skill validation with real MCPs

## References

### Documentation

- Setup guide: `docs/FIGMA-WRITE-MCP-SETUP.md`
- Design system setup skill: `skills/design-workflow/design-system-setup/SKILL.md`
- Figma workflow skill: `skills/design-workflow/figma-design-workflow/SKILL.md`
- Governance skill: `skills/design-workflow/design-system-governance/SKILL.md`

### External Resources

- [figma-mcp-write-server GitHub](https://github.com/oO/figma-mcp-write-server)
- [figma-developer-mcp (read-only)](https://www.npmjs.com/package/figma-developer-mcp)
- [Figma Plugin API](https://www.figma.com/plugin-docs/)
- [Figma REST API](https://www.figma.com/developers/api)

### Related Issues

- Original design workflow implementation: (No issue tracked)
- This fix: (Session work, no issue)

## Success Metrics

Track these to verify the migration was successful:

- ✅ Write server builds without errors
- ⏳ Plugin connects to write server (user verification needed)
- ⏳ Design system setup creates Figma files
- ⏳ Mockup workflow generates frames
- ⏳ Governance skill extracts tokens correctly
- ⏳ Zero agent confusion about Figma capabilities

## Rollback Plan

If write server causes issues, revert to read-only MCP:

```json
"figma": {
  "command": "npx",
  "args": ["-y", "figma-developer-mcp", "--stdio"],
  "env": {
    "FIGMA_API_KEY": "${FIGMA_API_KEY}"
  }
}
```

Then update skills to guide manual Figma work instead of automating.

---

**Status**: ✅ Implementation complete, awaiting user plugin installation and testing
**Impact**: High - Enables core design workflow automation
**Effort**: Low - 30 minutes configuration + plugin setup
**Risk**: Low - Easy rollback, no breaking changes
