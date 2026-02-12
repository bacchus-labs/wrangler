/**
 * Loader for YAML workflow definitions and markdown agent/gate definitions.
 * Handles parsing, frontmatter extraction, and template rendering.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';
import matter from 'gray-matter';
import fg from 'fast-glob';
import {
  validateWorkflowDefinition,
  AgentDefinitionSchema,
  GateDefinitionSchema,
  type WorkflowDefinition,
  type AgentDefinition,
  type GateDefinition,
} from './schemas/index.js';

/**
 * Load and validate a YAML workflow definition file.
 */
export async function loadWorkflowYaml(filePath: string): Promise<WorkflowDefinition> {
  const content = await fs.readFile(filePath, 'utf-8');
  const raw = parseYaml(content);
  return validateWorkflowDefinition(raw);
}

/**
 * Load and validate a markdown agent definition file.
 */
export async function loadAgentMarkdown(filePath: string): Promise<AgentDefinition> {
  const content = await fs.readFile(filePath, 'utf-8');
  const { data, content: body } = matter(content);

  const frontmatter = AgentDefinitionSchema.parse(data);

  return {
    ...frontmatter,
    prompt: body.trim(),
    filePath,
  };
}

/**
 * Load and validate a markdown gate definition file.
 */
export async function loadGateMarkdown(filePath: string): Promise<GateDefinition> {
  const content = await fs.readFile(filePath, 'utf-8');
  const { data, content: body } = matter(content);

  const frontmatter = GateDefinitionSchema.parse(data);

  return {
    ...frontmatter,
    prompt: body.trim(),
    filePath,
  };
}

/**
 * Discover all gate definition files in a directory.
 * Returns sorted list of .md file paths (excluding .disabled files).
 */
export async function discoverGates(gatesDir: string): Promise<string[]> {
  const pattern = path.join(gatesDir, '*.md');
  const files = await fg(pattern, { absolute: true });
  return files.sort();
}

/**
 * Render a template string by replacing {{expression}} placeholders
 * with values from the provided variables.
 *
 * Supports:
 * - Simple interpolation: {{varName}}
 * - Dot notation: {{task.title}}
 * - Each blocks: {{#each items}}...{{this}}...{{/each}}
 * - Each with dot access: {{#each task.requirements}}...{{/each}}
 */
export function renderTemplate(
  template: string,
  vars: Record<string, unknown>
): string {
  let result = template;

  // Process {{#each expr}}...{{/each}} blocks
  result = result.replace(
    /\{\{#each\s+([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_match, expr: string, body: string) => {
      const items = resolveExpression(expr, vars);
      if (!Array.isArray(items)) return '';

      return items
        .map((item, index) => {
          let rendered = body;
          // Replace {{this}} with the item value
          rendered = rendered.replace(/\{\{this\}\}/g, String(item));
          // Replace {{this.prop}} for object items
          if (typeof item === 'object' && item !== null) {
            rendered = rendered.replace(
              /\{\{this\.([\w.]+)\}\}/g,
              (_m: string, prop: string) => String(resolveExpression(prop, item as Record<string, unknown>) ?? '')
            );
          }
          // Replace {{@index}}
          rendered = rendered.replace(/\{\{@index\}\}/g, String(index));
          return rendered;
        })
        .join('');
    }
  );

  // Process {{#if expr}}...{{/if}} blocks
  result = result.replace(
    /\{\{#if\s+([\w.]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, expr: string, body: string) => {
      const value = resolveExpression(expr, vars);
      return value ? body : '';
    }
  );

  // Process simple {{expression}} interpolation
  result = result.replace(
    /\{\{([\w.]+)\}\}/g,
    (_match, expr: string) => {
      const value = resolveExpression(expr, vars);
      if (value === undefined || value === null) return '';
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      // Escape template syntax in resolved values to prevent injection
      return stringValue.replace(/\{\{/g, '\\{\\{');
    }
  );

  return result;
}

/**
 * Set of property names that must never be traversed to prevent
 * prototype pollution attacks via dot-notation expressions.
 */
const DISALLOWED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Resolve a dot-notation expression against a variables object.
 * e.g., "task.title" resolves vars.task.title
 */
export function resolveExpression(
  expr: string,
  vars: Record<string, unknown>
): unknown {
  const parts = expr.split('.');
  let current: unknown = vars;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    if (DISALLOWED_KEYS.has(part)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Resolve an output schema reference like "schemas/analysis.ts#AnalysisResultSchema"
 * into an actual Zod schema object.
 *
 * For now, returns a map of known schema names to their Zod schemas.
 * In the future, this could dynamically import schema files.
 */
export async function resolveSchemaReference(ref: string | undefined): Promise<unknown | undefined> {
  if (!ref) return undefined;

  // Extract the schema name from the reference
  const hashIndex = ref.indexOf('#');
  if (hashIndex === -1) return undefined;

  const schemaName = ref.substring(hashIndex + 1);

  // Dynamic import of known schemas
  const schemas = await import('./schemas/index.js');
  const schema = (schemas as Record<string, unknown>)[schemaName];

  return schema ?? undefined;
}
