# Claude Code Configuration Reference

This directory contains Claude Code's system prompt and tools array.
Automatically extracted on session start.

## Files

- `system_prompt.md` - Complete system prompt sent to the model
- `tools.json` - Full tools array with all tool definitions
- `sdk-tools.d.ts` - TypeScript type definitions for tool inputs
- `metadata.json` - Extraction metadata

## Version

Claude Code: 2.0.54
Extracted: 2025-11-26 06:10:02 UTC

## Reference

Complete documentation: `/Users/juliushecht/medb/code/system_prompts/claude_code/2_0_47/`

## Usage

These files show exactly what Claude Code sends to the Anthropic API:
- The system prompt defines behavior and guidelines
- The tools array defines available capabilities
- Each tool has a name, description, and JSON Schema input_schema

This is useful for:
- Understanding how Claude Code works
- Building compatible tools or integrations
- Prompt engineering reference
- API integration
