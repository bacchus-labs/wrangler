/**
 * Comprehensive tests for the workflow engine loader module.
 *
 * Uses REAL filesystem operations (temp directories) instead of mocks.
 *
 * Covers:
 * - loadWorkflowYaml() - YAML parsing and validation
 * - loadAgentMarkdown() - Markdown frontmatter + body parsing
 * - renderTemplate() - Template interpolation, each blocks, if blocks
 * - resolveExpression() - Dot notation resolution
 * - resolveSchemaReference() - Schema reference resolution
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  loadWorkflowYaml,
  loadAgentMarkdown,
  renderTemplate,
  resolveExpression,
  resolveSchemaReference,
} from '../src/loader.js';

// ============================================================================
// Test infrastructure: temp directory management
// ============================================================================

let tmpDir: string;

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wrangler-loader-test-'));
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
// loadWorkflowYaml()
// ============================================================================

describe('loadWorkflowYaml()', () => {
  it('should load and validate a minimal valid YAML workflow', async () => {
    const filePath = await writeTestFile('workflows/minimal.yaml', `
name: minimal-workflow
version: 1
phases:
  - name: analyze
    agent: analyzer
    output: analysis
`);

    const result = await loadWorkflowYaml(filePath);
    expect(result.name).toBe('minimal-workflow');
    expect(result.version).toBe(1);
    expect(result.phases).toHaveLength(1);
    expect(result.phases[0].name).toBe('analyze');
    expect('agent' in result.phases[0] && result.phases[0].agent).toBe('analyzer');
  });

  it('should load a complex workflow with all step types', async () => {
    const filePath = await writeTestFile('workflows/complex.yaml', `
name: spec-implementation
version: 2
defaults:
  model: opus
  permissionMode: bypassPermissions
  settingSources:
    - project
phases:
  - name: analyze
    agent: analyzer
    output: analysis

  - name: implement-all
    type: per-task
    source: analysis.tasks
    steps:
      - name: implement
        agent: implementer
        output: implementation

  - name: review
    type: parallel
    output: reviewResult
    steps:
      - name: code-review
        agent: reviewer
        prompt: code-quality-review
      - name: test-review
        agent: reviewer
        prompt: test-coverage-review

  - name: fix-loop
    type: loop
    condition: reviewResult.hasActionableIssues
    maxRetries: 3
    onExhausted: escalate
    steps:
      - name: fix
        agent: fixer
      - name: re-review
        type: parallel
        steps:
          - name: code-review
            agent: reviewer
            prompt: code-quality-review

  - name: run-tests
    type: code
    handler: handlers/run-tests.ts
    output: testOutput

  - name: publish
    agent: publisher
    output: publishResult
`);

    const result = await loadWorkflowYaml(filePath);
    expect(result.name).toBe('spec-implementation');
    expect(result.version).toBe(2);
    expect(result.defaults?.model).toBe('opus');
    expect(result.defaults?.permissionMode).toBe('bypassPermissions');
    expect(result.defaults?.settingSources).toEqual(['project']);
    expect(result.phases).toHaveLength(6);

    // Check per-task step
    const perTask = result.phases[1];
    expect('type' in perTask && perTask.type).toBe('per-task');
    expect('source' in perTask && perTask.source).toBe('analysis.tasks');
    expect('steps' in perTask && perTask.steps).toHaveLength(1);

    // Check parallel step (replaces gate-group)
    expect('type' in result.phases[2] && result.phases[2].type).toBe('parallel');

    // Check loop step
    const loop = result.phases[3];
    expect('type' in loop && loop.type).toBe('loop');
    expect('condition' in loop && loop.condition).toBe('reviewResult.hasActionableIssues');
    expect('maxRetries' in loop && loop.maxRetries).toBe(3);
    expect('onExhausted' in loop && loop.onExhausted).toBe('escalate');
    expect('steps' in loop && loop.steps).toHaveLength(2);

    // Check code step
    expect('type' in result.phases[4] && result.phases[4].type).toBe('code');
    expect('handler' in result.phases[4] && result.phases[4].handler).toBe('handlers/run-tests.ts');
  });

  it('should apply defaults schema values when defaults section is empty', async () => {
    const filePath = await writeTestFile('workflows/defaults.yaml', `
name: with-defaults
version: 1
defaults: {}
phases:
  - name: step1
    agent: agent1
`);

    const result = await loadWorkflowYaml(filePath);
    expect(result.defaults?.model).toBe('opus');
    expect(result.defaults?.permissionMode).toBe('bypassPermissions');
    expect(result.defaults?.settingSources).toEqual(['project']);
  });

  it('should throw on invalid YAML syntax', async () => {
    const filePath = await writeTestFile('workflows/invalid-syntax.yaml', `
name: bad
version: 1
phases:
  - name: step
    agent: [unmatched bracket
`);

    await expect(loadWorkflowYaml(filePath)).rejects.toThrow();
  });

  it('should throw on YAML that fails schema validation (empty name)', async () => {
    const filePath = await writeTestFile('workflows/invalid-schema.yaml', `
name: ""
version: 1
phases:
  - name: step
    agent: agent1
`);

    await expect(loadWorkflowYaml(filePath)).rejects.toThrow();
  });

  it('should throw on YAML with empty phases', async () => {
    const filePath = await writeTestFile('workflows/no-phases.yaml', `
name: empty
version: 1
phases: []
`);

    await expect(loadWorkflowYaml(filePath)).rejects.toThrow();
  });

  it('should throw on YAML missing required fields', async () => {
    const filePath = await writeTestFile('workflows/missing-fields.yaml', `
version: 1
phases:
  - name: step
    agent: agent1
`);

    await expect(loadWorkflowYaml(filePath)).rejects.toThrow();
  });

  it('should throw on non-existent file', async () => {
    await expect(
      loadWorkflowYaml(path.join(tmpDir, 'does-not-exist.yaml'))
    ).rejects.toThrow();
  });

  it('should throw when a phase step has unknown type', async () => {
    const filePath = await writeTestFile('workflows/unknown-type.yaml', `
name: bad-type
version: 1
phases:
  - name: step
    type: parallel
    agent: agent1
`);

    await expect(loadWorkflowYaml(filePath)).rejects.toThrow();
  });

  it('should throw when a nested step within per-task is invalid', async () => {
    const filePath = await writeTestFile('workflows/invalid-nested.yaml', `
name: bad-nested
version: 1
phases:
  - name: per-task
    type: per-task
    source: tasks
    steps:
      - name: ""
        agent: agent1
`);

    await expect(loadWorkflowYaml(filePath)).rejects.toThrow();
  });
});

// ============================================================================
// loadAgentMarkdown()
// ============================================================================

describe('loadAgentMarkdown()', () => {
  it('should parse agent markdown with frontmatter and body', async () => {
    const filePath = await writeTestFile('agents/analyzer.md', `---
name: analyzer
description: Analyzes specifications and produces task lists
tools:
  - Read
  - Grep
  - Glob
model: opus
outputSchema: schemas/analysis.ts#AnalysisResultSchema
---

You are an expert specification analyzer.

## Instructions

Analyze the provided specification and produce a structured task list.
`);

    const result = await loadAgentMarkdown(filePath);
    expect(result.name).toBe('analyzer');
    expect(result.description).toBe('Analyzes specifications and produces task lists');
    expect(result.tools).toEqual(['Read', 'Grep', 'Glob']);
    expect(result.model).toBe('opus');
    expect(result.outputSchema).toBe('schemas/analysis.ts#AnalysisResultSchema');
    expect(result.prompt).toContain('You are an expert specification analyzer.');
    expect(result.prompt).toContain('## Instructions');
    expect(result.filePath).toBe(filePath);
  });

  it('should parse agent markdown without optional fields', async () => {
    const filePath = await writeTestFile('agents/simple.md', `---
name: simple-agent
description: A simple agent
tools: []
---

Do the thing.
`);

    const result = await loadAgentMarkdown(filePath);
    expect(result.name).toBe('simple-agent');
    expect(result.tools).toEqual([]);
    expect(result.model).toBeUndefined();
    expect(result.outputSchema).toBeUndefined();
    expect(result.prompt).toBe('Do the thing.');
    expect(result.filePath).toBe(filePath);
  });

  it('should trim the body content', async () => {
    const filePath = await writeTestFile('agents/whitespace.md', `---
name: ws-agent
description: Agent with whitespace
tools: []
---


Content with surrounding whitespace.

`);

    const result = await loadAgentMarkdown(filePath);
    expect(result.prompt).toBe('Content with surrounding whitespace.');
  });

  it('should handle empty body', async () => {
    const filePath = await writeTestFile('agents/empty-body.md', `---
name: empty-body
description: No prompt body
tools: []
---
`);

    const result = await loadAgentMarkdown(filePath);
    expect(result.prompt).toBe('');
  });

  it('should throw on invalid frontmatter (missing description)', async () => {
    const filePath = await writeTestFile('agents/invalid.md', `---
name: bad-agent
tools: []
---

Body text.
`);

    await expect(loadAgentMarkdown(filePath)).rejects.toThrow();
  });

  it('should throw on invalid frontmatter (missing tools)', async () => {
    const filePath = await writeTestFile('agents/no-tools.md', `---
name: agent
description: desc
---

Body text.
`);

    await expect(loadAgentMarkdown(filePath)).rejects.toThrow();
  });

  it('should throw on non-existent file', async () => {
    await expect(
      loadAgentMarkdown(path.join(tmpDir, 'agents/nonexistent.md'))
    ).rejects.toThrow();
  });

  it('should preserve multiline prompt content', async () => {
    const filePath = await writeTestFile('agents/multiline.md', `---
name: multi
description: Multi-line prompt
tools:
  - Read
---

Line 1.

Line 2.

- Bullet 1
- Bullet 2

\`\`\`typescript
const x = 1;
\`\`\`
`);

    const result = await loadAgentMarkdown(filePath);
    expect(result.prompt).toContain('Line 1.');
    expect(result.prompt).toContain('Line 2.');
    expect(result.prompt).toContain('- Bullet 1');
    expect(result.prompt).toContain('const x = 1;');
  });
});

// ============================================================================
// renderTemplate()
// ============================================================================

describe('renderTemplate()', () => {

  describe('simple interpolation', () => {
    it('should replace simple variable references', () => {
      const result = renderTemplate('Hello {{name}}!', { name: 'World' });
      expect(result).toBe('Hello World!');
    });

    it('should replace multiple occurrences', () => {
      const result = renderTemplate('{{x}} + {{x}} = {{y}}', { x: '1', y: '2' });
      expect(result).toBe('1 + 1 = 2');
    });

    it('should replace with empty string when variable is undefined', () => {
      const result = renderTemplate('Hello {{name}}!', {});
      expect(result).toBe('Hello !');
    });

    it('should replace with empty string when variable is null', () => {
      const result = renderTemplate('Hello {{name}}!', { name: null });
      expect(result).toBe('Hello !');
    });

    it('should convert numbers to strings', () => {
      const result = renderTemplate('Count: {{count}}', { count: 42 });
      expect(result).toBe('Count: 42');
    });

    it('should convert booleans to strings', () => {
      const result = renderTemplate('Active: {{active}}', { active: true });
      expect(result).toBe('Active: true');
    });

    it('should JSON-stringify objects', () => {
      const result = renderTemplate('Data: {{data}}', { data: { key: 'value' } });
      expect(result).toBe('Data: {"key":"value"}');
    });

    it('should JSON-stringify arrays', () => {
      const result = renderTemplate('Items: {{items}}', { items: [1, 2, 3] });
      expect(result).toBe('Items: [1,2,3]');
    });

    it('should handle template with no variables', () => {
      const result = renderTemplate('No variables here.', { x: 1 });
      expect(result).toBe('No variables here.');
    });

    it('should handle empty template', () => {
      const result = renderTemplate('', { x: 1 });
      expect(result).toBe('');
    });
  });

  describe('dot notation', () => {
    it('should resolve nested object properties', () => {
      const result = renderTemplate('Task: {{task.title}}', {
        task: { title: 'Implement auth' },
      });
      expect(result).toBe('Task: Implement auth');
    });

    it('should resolve deeply nested properties', () => {
      const result = renderTemplate('Value: {{a.b.c.d}}', {
        a: { b: { c: { d: 'deep' } } },
      });
      expect(result).toBe('Value: deep');
    });

    it('should return empty string for undefined nested path', () => {
      const result = renderTemplate('Value: {{a.b.c}}', {
        a: { b: {} },
      });
      expect(result).toBe('Value: ');
    });

    it('should return empty string when intermediate is not an object', () => {
      const result = renderTemplate('Value: {{a.b.c}}', {
        a: { b: 'string' },
      });
      expect(result).toBe('Value: ');
    });
  });

  describe('{{#each}} blocks', () => {
    it('should iterate over simple arrays with {{this}}', () => {
      const result = renderTemplate(
        'Items: {{#each items}}- {{this}}\n{{/each}}',
        { items: ['apple', 'banana', 'cherry'] }
      );
      expect(result).toBe('Items: - apple\n- banana\n- cherry\n');
    });

    it('should iterate over object arrays with {{this.prop}}', () => {
      const result = renderTemplate(
        '{{#each tasks}}Task: {{this.title}} ({{this.status}})\n{{/each}}',
        {
          tasks: [
            { title: 'Task 1', status: 'done' },
            { title: 'Task 2', status: 'pending' },
          ],
        }
      );
      expect(result).toBe('Task: Task 1 (done)\nTask: Task 2 (pending)\n');
    });

    it('should support {{@index}} in each blocks', () => {
      const result = renderTemplate(
        '{{#each items}}{{@index}}: {{this}}\n{{/each}}',
        { items: ['a', 'b', 'c'] }
      );
      expect(result).toBe('0: a\n1: b\n2: c\n');
    });

    it('should handle empty arrays', () => {
      const result = renderTemplate(
        'Before{{#each items}}item{{/each}}After',
        { items: [] }
      );
      expect(result).toBe('BeforeAfter');
    });

    it('should return empty string when each target is not an array', () => {
      const result = renderTemplate(
        'Before{{#each items}}item{{/each}}After',
        { items: 'not-an-array' }
      );
      expect(result).toBe('BeforeAfter');
    });

    it('should return empty string when each target is undefined', () => {
      const result = renderTemplate(
        'Before{{#each missing}}item{{/each}}After',
        {}
      );
      expect(result).toBe('BeforeAfter');
    });

    it('should support dot notation in each expression', () => {
      const result = renderTemplate(
        '{{#each task.requirements}}Req: {{this}}\n{{/each}}',
        {
          task: {
            requirements: ['REQ-1', 'REQ-2'],
          },
        }
      );
      expect(result).toBe('Req: REQ-1\nReq: REQ-2\n');
    });

    it('should handle nested object properties in each', () => {
      const result = renderTemplate(
        '{{#each people}}{{this.name.first}} {{this.name.last}}\n{{/each}}',
        {
          people: [
            { name: { first: 'John', last: 'Doe' } },
            { name: { first: 'Jane', last: 'Smith' } },
          ],
        }
      );
      expect(result).toBe('John Doe\nJane Smith\n');
    });

    it('should return empty string for undefined this.prop in object items', () => {
      const result = renderTemplate(
        '{{#each items}}{{this.missing}}|{{/each}}',
        { items: [{ name: 'a' }, { name: 'b' }] }
      );
      expect(result).toBe('||');
    });

    it('should handle multiple each blocks in same template', () => {
      const result = renderTemplate(
        'A:{{#each a}}{{this}}{{/each}} B:{{#each b}}{{this}}{{/each}}',
        { a: ['1', '2'], b: ['3', '4'] }
      );
      expect(result).toBe('A:12 B:34');
    });
  });

  describe('{{#if}} blocks', () => {
    it('should render body when condition is truthy', () => {
      const result = renderTemplate(
        '{{#if showDetails}}Details: {{details}}{{/if}}',
        { showDetails: true, details: 'here' }
      );
      expect(result).toBe('Details: here');
    });

    it('should not render body when condition is falsy (false)', () => {
      const result = renderTemplate(
        '{{#if showDetails}}Details here{{/if}}',
        { showDetails: false }
      );
      expect(result).toBe('');
    });

    it('should not render body when condition is falsy (undefined)', () => {
      const result = renderTemplate(
        '{{#if missing}}Content{{/if}}',
        {}
      );
      expect(result).toBe('');
    });

    it('should not render body when condition is falsy (null)', () => {
      const result = renderTemplate(
        '{{#if nothing}}Content{{/if}}',
        { nothing: null }
      );
      expect(result).toBe('');
    });

    it('should not render body when condition is falsy (empty string)', () => {
      const result = renderTemplate(
        '{{#if empty}}Content{{/if}}',
        { empty: '' }
      );
      expect(result).toBe('');
    });

    it('should not render body when condition is falsy (zero)', () => {
      const result = renderTemplate(
        '{{#if zero}}Content{{/if}}',
        { zero: 0 }
      );
      expect(result).toBe('');
    });

    it('should render body when condition is truthy string', () => {
      const result = renderTemplate(
        '{{#if name}}Hello {{name}}{{/if}}',
        { name: 'World' }
      );
      expect(result).toBe('Hello World');
    });

    it('should render body when condition is truthy number', () => {
      const result = renderTemplate(
        '{{#if count}}Count: {{count}}{{/if}}',
        { count: 5 }
      );
      expect(result).toBe('Count: 5');
    });

    it('should render body when condition is non-empty array', () => {
      const result = renderTemplate(
        '{{#if items}}Has items{{/if}}',
        { items: [1, 2, 3] }
      );
      expect(result).toBe('Has items');
    });

    it('should support dot notation in if condition', () => {
      const result = renderTemplate(
        '{{#if task.done}}Completed{{/if}}',
        { task: { done: true } }
      );
      expect(result).toBe('Completed');
    });

    it('should handle multiple if blocks', () => {
      const result = renderTemplate(
        '{{#if a}}A{{/if}} {{#if b}}B{{/if}} {{#if c}}C{{/if}}',
        { a: true, b: false, c: true }
      );
      expect(result).toBe('A  C');
    });
  });

  describe('mixed template features', () => {
    it('should handle interpolation, each, and if together', () => {
      const result = renderTemplate(
        'Project: {{name}}\n{{#if hasTasks}}Tasks:\n{{#each tasks}}- {{this}}\n{{/each}}{{/if}}',
        {
          name: 'MyProject',
          hasTasks: true,
          tasks: ['Build', 'Test', 'Deploy'],
        }
      );
      expect(result).toBe('Project: MyProject\nTasks:\n- Build\n- Test\n- Deploy\n');
    });

    it('should handle if block hiding an each block', () => {
      const result = renderTemplate(
        '{{#if showList}}{{#each items}}{{this}}{{/each}}{{/if}}',
        { showList: false, items: ['a', 'b'] }
      );
      // The if block is evaluated first; its body is removed, so each never runs
      expect(result).toBe('');
    });
  });

  describe('template injection prevention', () => {
    it('should escape template syntax in resolved values to prevent injection', () => {
      const result = renderTemplate('Hello {{name}}', { name: '{{malicious}}' });
      // The resolved value should have {{ escaped, NOT resolve further
      expect(result).toBe('Hello \\{\\{malicious}}');
      expect(result).not.toContain('{{malicious}}');
    });

    it('should escape template syntax in numeric-like injection attempts', () => {
      const result = renderTemplate('Value: {{data}}', { data: '{{__proto__}}' });
      expect(result).toBe('Value: \\{\\{__proto__}}');
    });

    it('should escape template syntax in JSON-stringified objects', () => {
      const result = renderTemplate('Data: {{obj}}', {
        obj: { key: '{{injected}}' },
      });
      // JSON.stringify will produce {"key":"{{injected}}"} which should have {{ escaped
      expect(result).not.toContain('{{injected}}');
      expect(result).toContain('\\{\\{injected}}');
    });

    it('should not affect normal values without template syntax', () => {
      const result = renderTemplate('Hello {{name}}', { name: 'World' });
      expect(result).toBe('Hello World');
    });

    it('should handle values with single braces (not template syntax)', () => {
      const result = renderTemplate('Code: {{code}}', { code: 'if (x) { y }' });
      expect(result).toBe('Code: if (x) { y }');
    });

    it('should not recursively expand when variable value contains other variable references', () => {
      // If a variable's value contains {{otherVar}}, it should NOT resolve otherVar
      const result = renderTemplate('Output: {{data}}', {
        data: '{{secret}}',
        secret: 'should-not-appear',
      });
      // data resolves to "{{secret}}", which gets escaped, NOT recursively resolved
      expect(result).not.toContain('should-not-appear');
      expect(result).toContain('\\{\\{secret}}');
    });

    it('should not recursively expand deeply nested template references', () => {
      const result = renderTemplate('A: {{a}}', {
        a: '{{b}}',
        b: '{{c}}',
        c: 'deep-value',
      });
      // Only one level of resolution happens: a -> "{{b}}" (escaped)
      expect(result).not.toContain('deep-value');
      expect(result).not.toContain('{{c}}');
      expect(result).toContain('\\{\\{b}}');
    });

    it('should handle template syntax in each block items', () => {
      const result = renderTemplate(
        '{{#each items}}Item: {{this}}\n{{/each}}',
        { items: ['safe', '{{injected}}', 'also-safe'] }
      );
      expect(result).toContain('Item: safe');
      expect(result).toContain('Item: also-safe');
      // The {{this}} replacement injects '{{injected}}' into the template,
      // which is then caught by the final simple interpolation pass.
      // Since 'injected' is not in vars, it resolves to empty string.
      // This documents the current behavior: each block items with template
      // syntax get processed by the subsequent interpolation pass.
      expect(result).toContain('Item: \n');
      expect(result).not.toContain('{{injected}}');
    });
  });
});

// ============================================================================
// resolveExpression()
// ============================================================================

describe('resolveExpression()', () => {
  it('should resolve top-level property', () => {
    expect(resolveExpression('name', { name: 'test' })).toBe('test');
  });

  it('should resolve nested property with dot notation', () => {
    expect(resolveExpression('task.title', {
      task: { title: 'Task 1' },
    })).toBe('Task 1');
  });

  it('should resolve deeply nested property', () => {
    expect(resolveExpression('a.b.c.d', {
      a: { b: { c: { d: 42 } } },
    })).toBe(42);
  });

  it('should return undefined for non-existent top-level property', () => {
    expect(resolveExpression('missing', {})).toBeUndefined();
  });

  it('should return undefined for non-existent nested property', () => {
    expect(resolveExpression('a.b.c', { a: { b: {} } })).toBeUndefined();
  });

  it('should return undefined when intermediate is null', () => {
    expect(resolveExpression('a.b', { a: null })).toBeUndefined();
  });

  it('should return undefined when intermediate is undefined', () => {
    expect(resolveExpression('a.b', { a: undefined })).toBeUndefined();
  });

  it('should return undefined when intermediate is a primitive', () => {
    expect(resolveExpression('a.b', { a: 'string' })).toBeUndefined();
    expect(resolveExpression('a.b', { a: 42 })).toBeUndefined();
    expect(resolveExpression('a.b', { a: true })).toBeUndefined();
  });

  it('should return the object itself when expression is a single part matching an object', () => {
    const obj = { key: 'value' };
    expect(resolveExpression('data', { data: obj })).toBe(obj);
  });

  it('should return arrays as-is', () => {
    const arr = [1, 2, 3];
    expect(resolveExpression('items', { items: arr })).toBe(arr);
  });

  it('should return boolean values', () => {
    expect(resolveExpression('flag', { flag: false })).toBe(false);
    expect(resolveExpression('flag', { flag: true })).toBe(true);
  });

  it('should return numeric zero', () => {
    expect(resolveExpression('count', { count: 0 })).toBe(0);
  });

  it('should return empty string', () => {
    expect(resolveExpression('text', { text: '' })).toBe('');
  });

  it('should handle single-segment expression', () => {
    expect(resolveExpression('x', { x: 'hello' })).toBe('hello');
  });

  it('should resolve array elements via numeric keys', () => {
    // Since resolveExpression splits on '.', numeric keys on objects work
    const vars = { items: { '0': 'first', '1': 'second' } };
    expect(resolveExpression('items.0', vars)).toBe('first');
  });

  describe('prototype pollution prevention', () => {
    it('should return undefined for __proto__ access', () => {
      const vars = { foo: 'bar' };
      expect(resolveExpression('__proto__', vars)).toBeUndefined();
    });

    it('should return undefined for constructor.prototype access', () => {
      const vars = { foo: 'bar' };
      expect(resolveExpression('constructor.prototype', vars)).toBeUndefined();
    });

    it('should return undefined for nested __proto__ access', () => {
      const vars = { foo: { bar: 'baz' } };
      expect(resolveExpression('foo.__proto__', vars)).toBeUndefined();
    });

    it('should return undefined for constructor access', () => {
      const vars = { foo: 'bar' };
      expect(resolveExpression('constructor', vars)).toBeUndefined();
    });

    it('should return undefined for prototype access', () => {
      const vars = { foo: 'bar' };
      expect(resolveExpression('prototype', vars)).toBeUndefined();
    });

    it('should return undefined for deeply nested prototype pollution paths', () => {
      const vars = { a: { b: { c: 'safe' } } };
      expect(resolveExpression('a.__proto__.polluted', vars)).toBeUndefined();
      expect(resolveExpression('a.constructor.prototype', vars)).toBeUndefined();
    });

    it('should still resolve normal properties that exist', () => {
      const vars = { a: { b: 'value' } };
      expect(resolveExpression('a.b', vars)).toBe('value');
    });
  });
});

// ============================================================================
// resolveSchemaReference()
// ============================================================================

describe('resolveSchemaReference()', () => {
  it('should return undefined for undefined input', async () => {
    const result = await resolveSchemaReference(undefined);
    expect(result).toBeUndefined();
  });

  it('should return undefined for empty string input', async () => {
    const result = await resolveSchemaReference('');
    expect(result).toBeUndefined();
  });

  it('should return undefined when ref has no hash (#) separator', async () => {
    const result = await resolveSchemaReference('schemas/analysis.ts');
    expect(result).toBeUndefined();
  });

  it('should resolve a known schema name (AnalysisResultSchema)', async () => {
    const result = await resolveSchemaReference('schemas/analysis.ts#AnalysisResultSchema');
    expect(result).toBeDefined();
    // Verify it is actually a Zod schema by checking it has a parse method
    expect(typeof (result as { parse: unknown }).parse).toBe('function');
  });

  it('should resolve another known schema (ReviewResultSchema)', async () => {
    const result = await resolveSchemaReference('schemas/review.ts#ReviewResultSchema');
    expect(result).toBeDefined();
    expect(typeof (result as { parse: unknown }).parse).toBe('function');
  });

  it('should resolve ImplementResultSchema', async () => {
    const result = await resolveSchemaReference('schemas/implementation.ts#ImplementResultSchema');
    expect(result).toBeDefined();
    expect(typeof (result as { parse: unknown }).parse).toBe('function');
  });

  it('should resolve PublishResultSchema', async () => {
    const result = await resolveSchemaReference('schemas/publish.ts#PublishResultSchema');
    expect(result).toBeDefined();
    expect(typeof (result as { parse: unknown }).parse).toBe('function');
  });

  it('should return undefined for unknown schema name', async () => {
    const result = await resolveSchemaReference('schemas/analysis.ts#NonExistentSchema');
    expect(result).toBeUndefined();
  });

  it('should handle ref with hash at the beginning', async () => {
    const result = await resolveSchemaReference('#AnalysisResultSchema');
    expect(result).toBeDefined();
  });

  it('should handle ref with empty schema name after hash', async () => {
    const result = await resolveSchemaReference('schemas/analysis.ts#');
    expect(result).toBeUndefined();
  });
});
