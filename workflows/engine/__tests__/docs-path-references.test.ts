import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(__dirname, '..', 'docs');

describe('builtin-agents-prompts.md documentation paths', () => {
  let content: string;

  beforeAll(() => {
    const docPath = path.join(docsDir, 'builtin-agents-prompts.md');
    content = fs.readFileSync(docPath, 'utf-8');
  });

  it('should reference .wrangler/orchestration/agents/ for project-level agent resolution', () => {
    expect(content).toContain('.wrangler/orchestration/agents/');
  });

  it('should reference .wrangler/orchestration/prompts/ for project-level prompt resolution', () => {
    expect(content).toContain('.wrangler/orchestration/prompts/');
  });

  it('should NOT reference old .wrangler/agents/ path (without orchestration)', () => {
    // Match .wrangler/agents/ but NOT .wrangler/orchestration/agents/
    const lines = content.split('\n');
    const oldPathLines = lines.filter(line => {
      // Match lines containing .wrangler/agents/ but not .wrangler/orchestration/agents/
      return line.includes('.wrangler/agents/') && !line.includes('.wrangler/orchestration/agents/');
    });
    expect(oldPathLines).toEqual([]);
  });

  it('should NOT reference old .wrangler/prompts/ path (without orchestration)', () => {
    const lines = content.split('\n');
    const oldPathLines = lines.filter(line => {
      return line.includes('.wrangler/prompts/') && !line.includes('.wrangler/orchestration/prompts/');
    });
    expect(oldPathLines).toEqual([]);
  });

  it('should show orchestration/ in the override directory tree example', () => {
    // The override example should show the orchestration subdirectory
    expect(content).toContain('orchestration/');
    // The directory tree should show agents and prompts under orchestration
    expect(content).toMatch(/orchestration\/\s*\n\s*agents\//s);
  });

  it('should reference .wrangler/orchestration/ in the override instructions', () => {
    expect(content).toContain(".wrangler/orchestration/");
  });
});
