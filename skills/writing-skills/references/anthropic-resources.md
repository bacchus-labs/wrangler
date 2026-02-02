# Anthropic Skill Authoring Resources

This document provides a curated guide to official Anthropic resources for skill authoring. These are LIVE resources maintained by Anthropic and represent the latest best practices.

## Primary Resources

### [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills)

**Purpose**: Complete reference for the Claude Code skills system

**What it covers**:
- Skills overview and concepts
- File structure and organization
- Progressive disclosure techniques
- Token efficiency strategies
- Discovery and invocation patterns

**When to use**: Your primary reference for understanding how skills work in Claude Code

### [Skill Authoring Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

**Purpose**: Practical authoring guidance and patterns

**What it covers**:
- Core principles (conciseness, structure, testing)
- Metadata optimization for discovery
- Progressive disclosure patterns
- Code examples and anti-patterns
- File organization strategies

**When to use**: When writing or refining skills, consult this for structural and content decisions

### [Anthropic Skills Repository](https://github.com/anthropics/skills)

**Purpose**: Official collection of skills with real-world examples

**What it covers**:
- Example skills across domains
- Skill templates and patterns
- Community contributions
- Integration examples

**When to use**: When looking for examples or patterns to follow

### [Skill Creator Skill](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)

**Purpose**: Meta-skill for creating new skills

**What it covers**:
- Step-by-step skill creation process
- Validation and testing approaches
- Common pitfalls
- Quality checklist

**When to use**: When creating a new skill from scratch

## Secondary Resources

### [Claude Skills Blog Post](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)

**Purpose**: High-level introduction to the skills concept

**What it covers**:
- Vision and motivation for skills
- How skills enhance agent capabilities
- Real-world use cases
- Design philosophy

**When to use**: For understanding the "why" behind skills

### [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)

**Purpose**: General best practices for working with Claude Code

**What it covers**:
- Effective prompting strategies
- Project organization
- Workflow patterns
- Skills integration

**When to use**: For broader context on working effectively with Claude Code

## Quick Reference Guide

| Task | Resource to Consult |
|------|---------------------|
| Understanding skill concepts | [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills) |
| Writing skill content | [Skill Authoring Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) |
| Finding examples | [Anthropic Skills Repository](https://github.com/anthropics/skills) |
| Creating first skill | [Skill Creator Skill](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) |
| Progressive disclosure | [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills) |
| Token optimization | [Skill Authoring Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) |
| Discovery optimization | [Skill Authoring Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) |

## Keeping Up to Date

These resources are actively maintained by Anthropic. Always consult the live versions rather than maintaining local copies:

- **Documentation**: Updated with new features and patterns
- **Repository**: New example skills added regularly
- **Blog posts**: New insights and case studies published periodically

**DO NOT** copy content from these resources into wrangler. Instead, link to them and summarize key points when necessary.

## Integration with Wrangler

Wrangler's `writing-skills` skill adapts Anthropic's guidance with:
- **TDD methodology**: Test skills with subagents before deploying
- **Rationalization resistance**: Bulletproof discipline-enforcing skills
- **Pressure testing**: Validate skills under realistic constraints

Anthropic's resources provide the FOUNDATION. Wrangler's writing-skills skill provides the METHODOLOGY for creating bulletproof skills that work under pressure.
