/**
 * Loaders for agent and prompt markdown files with YAML frontmatter.
 *
 * Agent files define AI agent configurations with system prompts.
 * Prompt files define reusable prompt templates with Mustache variables.
 */

import * as fs from 'fs/promises';
import matter from 'gray-matter';
import { z } from 'zod';

// --- Agent File Schema ---

export const AgentFileSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  tools: z.array(z.string()).default([]),
  model: z.string().optional(),
  outputSchema: z.string().optional(),
});

export interface AgentDefinition {
  name: string;
  description?: string;
  tools: string[];
  model?: string;
  outputSchema?: string;
  systemPrompt: string;
}

// --- Prompt File Schema ---

export const PromptFileSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export interface PromptDefinition {
  name: string;
  description?: string;
  body: string;
}

// --- Loader Functions ---

/**
 * Load and validate a markdown agent definition file.
 * Parses YAML frontmatter for configuration and extracts the body as systemPrompt.
 */
export async function loadAgentFile(filePath: string): Promise<AgentDefinition> {
  const content = await fs.readFile(filePath, 'utf-8');
  const { data, content: body } = matter(content);

  const frontmatter = AgentFileSchema.parse(data);

  return {
    ...frontmatter,
    systemPrompt: body.trim(),
  };
}

/**
 * Load and validate a markdown prompt definition file.
 * Parses YAML frontmatter for metadata and preserves the body with template variables.
 */
export async function loadPromptFile(filePath: string): Promise<PromptDefinition> {
  const content = await fs.readFile(filePath, 'utf-8');
  const { data, content: body } = matter(content);

  const frontmatter = PromptFileSchema.parse(data);

  return {
    ...frontmatter,
    body: body.trim(),
  };
}
