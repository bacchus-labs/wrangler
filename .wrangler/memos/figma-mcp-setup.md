# Figma Write MCP Server Setup Guide

This guide walks you through setting up the write-enabled Figma MCP server for wrangler, enabling AI agents to create and modify Figma designs programmatically.

## Overview

The `figma-mcp-write-server` provides full read/write access to Figma through the Plugin API, enabling AI agents to:
- Create design system files and components
- Generate mockups from specifications
- Modify existing designs
- Set up auto-layout, styles, and variables
- Export design assets

## Prerequisites

- **Figma Desktop App** (not browser version)
- **Node.js** (any recent version, though package requests 22.x)
- **Git** for cloning the repository
- **wrangler** project already set up

## Installation Steps

### 1. Clone and Build the Write Server

The write server has been installed at:
```
/Users/sam/medb/code/figma-mcp-write-server/
```

Already completed:
```bash
cd /Users/sam/medb/code
git clone https://github.com/oO/figma-mcp-write-server.git
cd figma-mcp-write-server
npm install
npm run build
```

### 2. MCP Server Configuration

The `.claude-plugin/plugin.json` has been updated to use the write server:

```json
{
  "mcpServers": {
    "figma": {
      "command": "node",
      "args": ["/Users/sam/medb/code/figma-mcp-write-server/dist/index.js"],
      "env": {}
    }
  }
}
```

### 3. Install the Figma Plugin

**IMPORTANT**: You must install the plugin in Figma Desktop for the write server to work.

#### Steps:

1. **Open Figma Desktop App** (not the browser)

2. **Create or Open a File** where you want to use the write capabilities

3. **Import the Plugin Manifest**:
   - Go to **Plugins → Development → Import plugin from manifest...**
   - Navigate to: `/Users/sam/medb/code/figma-mcp-write-server/figma-plugin/`
   - Select: `manifest.json`
   - Click **Open**

4. **Run the Plugin**:
   - Go to **Plugins → Development → Figma MCP Plugin**
   - The plugin UI will appear in Figma
   - Leave this running while using Claude Code

5. **Verify Connection**:
   - The plugin UI should show "Connected" status
   - The WebSocket connection runs on port 8765 by default

## How It Works

### Architecture

```
Claude Code (AI Agent)
    ↓
MCP Write Server (Node.js process)
    ↓ (WebSocket on port 8765)
Figma Plugin (running in Figma Desktop)
    ↓
Figma Plugin API (write operations)
```

### Workflow

1. **Agent makes a request** via MCP tool (e.g., `figma_create_node`)
2. **Write server receives request** and validates it
3. **Server sends command** to Figma plugin via WebSocket
4. **Plugin executes** the operation using Figma Plugin API
5. **Plugin returns result** back through WebSocket
6. **Server returns result** to agent

### Session Requirements

- **Figma Desktop must be running** with a file open
- **Plugin must be active** in the current file
- **One file at a time**: Operations apply to the currently active file

## Available Tools

The write server provides 24 tools across these categories:

### Core Design
- `figma_nodes` - Create/modify nodes (frames, rectangles, etc.)
- `figma_text` - Create and style text layers
- `figma_fills` - Apply solid, gradient, or image fills
- `figma_strokes` - Add borders and strokes
- `figma_effects` - Apply shadows, blurs, etc.

### Layout & Positioning
- `figma_auto_layout` - Set up responsive auto-layout
- `figma_constraints` - Define resizing behavior
- `figma_alignment` - Align and distribute nodes
- `figma_hierarchy` - Organize layer structure

### Design System
- `figma_styles` - Create/apply color, text, and effect styles
- `figma_components` - Create reusable components
- `figma_instances` - Create component instances
- `figma_variables` - Create design tokens/variables
- `figma_fonts` - Manage typography

### Advanced Operations
- `figma_boolean` - Union, subtract, intersect shapes
- `figma_vectors` - Manipulate vector paths

### Developer Tools
- `figma_dev_resources` - Add developer annotations
- `figma_annotations` - Add design notes
- `figma_measurements` - Add spacing guides
- `figma_exports` - Export assets

### System
- `figma_plugin_status` - Check plugin connection
- `figma_pages` - Create/navigate pages
- `figma_selection` - Select nodes
- `figma_images` - Add images

## Testing the Setup

### Quick Test

1. **Restart Claude Code** to load the new MCP configuration

2. **Open Figma Desktop** with any file

3. **Run the plugin**: Plugins → Development → Figma MCP Plugin

4. **In Claude Code**, ask:
   ```
   Create a simple rectangle in Figma with a blue fill
   ```

5. **Expected behavior**:
   - Agent uses `figma_nodes` tool to create rectangle
   - Agent uses `figma_fills` tool to apply blue color
   - Rectangle appears in your Figma file

### Verify Available Tools

After restarting Claude Code, the agent should have access to all 24 Figma write tools. You can verify by asking:
```
What Figma tools do you have available?
```

## Design Workflow Skills

With the write server configured, these wrangler skills now work as designed:

### 1. design-system-setup
Creates design systems automatically:
- Generates Figma file with color, typography, spacing tokens
- Creates component library
- Exports tokens to code (CSS, Tailwind, JSON)
- Stores metadata in wrangler issues

**Usage**: `/wrangler:setup-design-system`

### 2. figma-design-workflow
Generates mockups from specifications:
- Reads wrangler specifications
- Creates Figma frames for pages/components
- Uses design system components
- Tracks approval status in metadata

**Usage**: `/wrangler:generate-figma-mocks`

### 3. design-system-governance
Detects token drift (read-only, already worked):
- Extracts tokens from Figma
- Compares with code tokens
- Creates wrangler issues for drift

**Usage**: `/wrangler:check-design-drift`

## Troubleshooting

### Plugin Shows "Disconnected"

**Cause**: WebSocket connection failed

**Fix**:
- Check that MCP server is running (Claude Code started)
- Verify port 8765 is not blocked by firewall
- Check logs in `/Users/sam/medb/code/figma-mcp-write-server/logs/`

### "Plugin not found" Error

**Cause**: Plugin not installed or Figma Desktop not running

**Fix**:
- Ensure using Figma Desktop (not browser)
- Re-import plugin manifest
- Restart Figma Desktop

### Operations Fail Silently

**Cause**: No file open or plugin not running

**Fix**:
- Open a Figma file
- Run the plugin (Plugins → Development → Figma MCP Plugin)
- Ensure plugin UI shows "Connected"

### Port 8765 Already in Use

**Cause**: Another process using the port

**Fix**:
```bash
# Find process using port 8765
lsof -ti:8765

# Kill the process
lsof -ti:8765 | xargs kill
```

Or configure a different port in `figma-mcp-write-server/config.json`

### Build Errors After Updates

**Cause**: Dependencies or TypeScript issues

**Fix**:
```bash
cd /Users/sam/medb/code/figma-mcp-write-server
npm run clean
npm install
npm run build
```

## Configuration Options

### Custom Port

Create `/Users/sam/medb/code/figma-mcp-write-server/config.json`:

```json
{
  "port": 9000
}
```

Then rebuild:
```bash
npm run build
```

### Logging

Enable debug logging by setting environment variable:

```json
{
  "mcpServers": {
    "figma": {
      "command": "node",
      "args": ["/Users/sam/medb/code/figma-mcp-write-server/dist/index.js"],
      "env": {
        "DEBUG": "figma-mcp:*"
      }
    }
  }
}
```

## Limitations

### Plugin-Based Constraints

- **Desktop only**: Browser version has limited plugin access
- **Single file**: Operations apply to currently active file only
- **Session-based**: Plugin must be running for operations to work
- **Pattern fills**: Not supported by Plugin API

### Performance

- **Large operations**: Creating many nodes may be slow
- **WebSocket overhead**: Slight latency compared to direct API
- **File size**: Very large files may cause timeouts

## Comparison: Read vs Write MCP

| Feature | Read MCP (`figma-developer-mcp`) | Write MCP (`figma-mcp-write-server`) |
|---------|----------------------------------|--------------------------------------|
| **Create files** | ❌ | ✅ |
| **Modify designs** | ❌ | ✅ |
| **Read designs** | ✅ | ✅ |
| **Extract tokens** | ✅ | ✅ |
| **Download images** | ✅ | ✅ |
| **Setup** | Simple (npx) | Complex (plugin) |
| **Requires Figma Desktop** | ❌ | ✅ |
| **Requires plugin** | ❌ | ✅ |
| **API used** | REST API | Plugin API |

## Next Steps

1. **Restart Claude Code** to activate the new MCP configuration
2. **Open Figma Desktop** and run the plugin
3. **Test with design-system-setup**: `/wrangler:setup-design-system`
4. **Create specifications** and generate mockups
5. **Monitor plugin status** in Figma UI

## Resources

- [figma-mcp-write-server GitHub](https://github.com/oO/figma-mcp-write-server)
- [Figma Plugin API Docs](https://www.figma.com/plugin-docs/)
- [Wrangler Design Workflow Skills](../skills/design-workflow/)

## Support

If you encounter issues:

1. **Check plugin status** in Figma UI
2. **Review logs** in write server directory
3. **Verify configuration** in `.claude-plugin/plugin.json`
4. **Test with simple operations** first (create rectangle)
5. **File an issue** on the write server GitHub repo

---

**Setup completed**: November 22, 2025
**Write server version**: 0.39.0
**Location**: `/Users/sam/medb/code/figma-mcp-write-server/`
