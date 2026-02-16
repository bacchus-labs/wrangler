/**
 * Tests for agent and prompt file loaders with schema validation.
 *
 * Uses REAL filesystem operations (temp directories) instead of mocks.
 *
 * Covers:
 * - loadAgentFile() - Agent markdown with frontmatter + systemPrompt body
 * - loadPromptFile() - Prompt markdown with frontmatter + body with template vars
 * - Schema validation for both file types
 * - Error handling for missing files and invalid frontmatter
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  loadAgentFile,
  loadPromptFile,
} from '../src/loaders.js';

// ============================================================================
// Test infrastructure: temp directory management
// ============================================================================

let tmpDir: string;

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wrangler-loaders-test-'));
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

/**
 * Helper: write a file inside the temp directory.
 */
async function writeTestFile(relativePath: string, content: string): Promise<string> {
  const fullPath = path.join(tmpDir, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, 'utf-8');
  return fullPath;
}

// ============================================================================
// loadAgentFile()
// ============================================================================

describe('loadAgentFile()', () => {
  it('should parse an agent file with all fields', async () => {
    const filePath = await writeTestFile('agents/reviewer.md', `---
name: reviewer
description: Code review specialist
tools:
  - Read
  - Glob
  - Grep
model: sonnet
---
You are a code review specialist.

Review all code changes carefully.
`);

    const agent = await loadAgentFile(filePath);

    expect(agent.name).toBe('reviewer');
    expect(agent.description).toBe('Code review specialist');
    expect(agent.tools).toEqual(['Read', 'Glob', 'Grep']);
    expect(agent.model).toBe('sonnet');
    expect(agent.systemPrompt).toBe('You are a code review specialist.\n\nReview all code changes carefully.');
  });

  it('should parse an agent file with minimal fields (just name)', async () => {
    const filePath = await writeTestFile('agents/minimal.md', `---
name: basic-agent
---
Do the thing.
`);

    const agent = await loadAgentFile(filePath);

    expect(agent.name).toBe('basic-agent');
    expect(agent.description).toBeUndefined();
    expect(agent.tools).toEqual([]);
    expect(agent.model).toBeUndefined();
    expect(agent.systemPrompt).toBe('Do the thing.');
  });

  it('should extract the markdown body as systemPrompt', async () => {
    const filePath = await writeTestFile('agents/with-body.md', `---
name: writer
---
# Instructions

You are a technical writer.

## Guidelines

- Be concise
- Use active voice
`);

    const agent = await loadAgentFile(filePath);

    expect(agent.systemPrompt).toContain('# Instructions');
    expect(agent.systemPrompt).toContain('You are a technical writer.');
    expect(agent.systemPrompt).toContain('- Be concise');
    expect(agent.systemPrompt).toContain('- Use active voice');
  });

  it('should throw a validation error when name is missing', async () => {
    const filePath = await writeTestFile('agents/no-name.md', `---
description: An agent without a name
tools:
  - Read
---
Some prompt.
`);

    await expect(loadAgentFile(filePath)).rejects.toThrow();
  });

  it('should throw a clear error for non-existent file', async () => {
    const fakePath = path.join(tmpDir, 'agents/does-not-exist.md');

    await expect(loadAgentFile(fakePath)).rejects.toThrow(/ENOENT|no such file/i);
  });
});

// ============================================================================
// loadPromptFile()
// ============================================================================

describe('loadPromptFile()', () => {
  it('should parse a prompt file correctly', async () => {
    const filePath = await writeTestFile('prompts/code-quality.md', `---
name: code-quality-review
description: Reviews code for quality
---
Review the following code for quality issues:

{{ code }}

Focus on:
- Naming conventions
- Error handling
`);

    const prompt = await loadPromptFile(filePath);

    expect(prompt.name).toBe('code-quality-review');
    expect(prompt.description).toBe('Reviews code for quality');
    expect(prompt.body).toContain('{{ code }}');
    expect(prompt.body).toContain('Review the following code for quality issues:');
  });

  it('should preserve Mustache variables in the body', async () => {
    const filePath = await writeTestFile('prompts/template.md', `---
name: task-prompt
---
Implement {{ task.title }}.

Requirements:
{{#each task.requirements}}
- {{this}}
{{/each}}

Output format: {{ outputFormat }}
`);

    const prompt = await loadPromptFile(filePath);

    expect(prompt.body).toContain('{{ task.title }}');
    expect(prompt.body).toContain('{{#each task.requirements}}');
    expect(prompt.body).toContain('{{this}}');
    expect(prompt.body).toContain('{{/each}}');
    expect(prompt.body).toContain('{{ outputFormat }}');
  });

  it('should parse a prompt with minimal fields (just name)', async () => {
    const filePath = await writeTestFile('prompts/minimal.md', `---
name: simple-prompt
---
Just do it.
`);

    const prompt = await loadPromptFile(filePath);

    expect(prompt.name).toBe('simple-prompt');
    expect(prompt.description).toBeUndefined();
    expect(prompt.body).toBe('Just do it.');
  });

  it('should throw a validation error when name is missing', async () => {
    const filePath = await writeTestFile('prompts/no-name.md', `---
description: A prompt without a name
---
Some instructions.
`);

    await expect(loadPromptFile(filePath)).rejects.toThrow();
  });

  it('should throw a clear error for non-existent file', async () => {
    const fakePath = path.join(tmpDir, 'prompts/does-not-exist.md');

    await expect(loadPromptFile(fakePath)).rejects.toThrow(/ENOENT|no such file/i);
  });
});
