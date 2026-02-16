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

// ============================================================================
// Template rendering edge cases
// ============================================================================

describe('template rendering edge cases', () => {
  it('should handle invalid Mustache syntax (unclosed tag) without crashing', async () => {
    const filePath = await writeTestFile('prompts/invalid-mustache.md', `---
name: invalid-mustache
---
This has {{unclosed and no closing braces.
`);

    const prompt = await loadPromptFile(filePath);

    // The loader should not crash -- it preserves the body as-is for later rendering
    expect(prompt.name).toBe('invalid-mustache');
    expect(prompt.body).toContain('{{unclosed');
  });

  it('should handle empty template variable {{}} without crashing', async () => {
    const filePath = await writeTestFile('prompts/empty-var.md', `---
name: empty-var
---
This has an empty {{}} variable.
`);

    const prompt = await loadPromptFile(filePath);

    expect(prompt.name).toBe('empty-var');
    expect(prompt.body).toContain('{{}}');
  });

  it('should preserve nested/complex Mustache sections for later rendering', async () => {
    const filePath = await writeTestFile('prompts/complex-mustache.md', `---
name: complex-mustache
---
Items:
{{#items}}{{name}} - {{description}}{{/items}}

Inverted:
{{^empty}}Not empty{{/empty}}
`);

    const prompt = await loadPromptFile(filePath);

    expect(prompt.name).toBe('complex-mustache');
    expect(prompt.body).toContain('{{#items}}');
    expect(prompt.body).toContain('{{name}}');
    expect(prompt.body).toContain('{{/items}}');
    expect(prompt.body).toContain('{{^empty}}');
    expect(prompt.body).toContain('{{/empty}}');
  });
});

// ============================================================================
// Filesystem error handling
// ============================================================================

describe('filesystem error handling', () => {
  it('should give a clear error when loading from a non-existent directory', async () => {
    const badPath = path.join(tmpDir, 'no', 'such', 'dir', 'agent.md');

    await expect(loadAgentFile(badPath)).rejects.toThrow(/ENOENT|no such file/i);
  });

  it('should handle an empty agent file gracefully', async () => {
    const filePath = await writeTestFile('agents/empty.md', '');

    // gray-matter parses empty content as empty data + empty body
    // The Zod schema requires name, so this should throw a validation error
    await expect(loadAgentFile(filePath)).rejects.toThrow();
  });

  it('should handle an empty prompt file gracefully', async () => {
    const filePath = await writeTestFile('prompts/empty.md', '');

    // Same as above -- missing required name field
    await expect(loadPromptFile(filePath)).rejects.toThrow();
  });

  it('should accept an agent file with frontmatter but no body (empty prompt)', async () => {
    const filePath = await writeTestFile('agents/no-body.md', `---
name: no-body-agent
---
`);

    const agent = await loadAgentFile(filePath);

    expect(agent.name).toBe('no-body-agent');
    // Body is trimmed, so empty body becomes empty string
    expect(agent.systemPrompt).toBe('');
  });

  it('should accept a prompt file with frontmatter but no body', async () => {
    const filePath = await writeTestFile('prompts/no-body.md', `---
name: no-body-prompt
---
`);

    const prompt = await loadPromptFile(filePath);

    expect(prompt.name).toBe('no-body-prompt');
    expect(prompt.body).toBe('');
  });
});
