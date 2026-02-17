/**
 * init_workspace MCP tool
 *
 * Idempotent workspace initialization that creates the .wrangler/ directory
 * structure, provisions builtin assets, and manages configuration files.
 *
 * Reads directory structure from workspace-schema.json in the plugin directory
 * (FR-001), supports report-only mode (FR-009) and apply mode (FR-010),
 * works on both fresh and existing projects (FR-013).
 */
import { z } from "zod";
import { MCPResponse } from "../../types/errors.js";
export declare const initWorkspaceSchema: z.ZodObject<{
    fix: z.ZodDefault<z.ZodBoolean>;
    projectRoot: z.ZodOptional<z.ZodString>;
    pluginRoot: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    fix: boolean;
    projectRoot?: string | undefined;
    pluginRoot?: string | undefined;
}, {
    fix?: boolean | undefined;
    projectRoot?: string | undefined;
    pluginRoot?: string | undefined;
}>;
export type InitWorkspaceParams = z.infer<typeof initWorkspaceSchema>;
interface AssetCopyResult {
    copied: string[];
    skipped: string[];
}
export interface InitWorkspaceResult {
    status: "compliant" | "initialized" | "changes_needed";
    directories: {
        created: string[];
        existing: string[];
    };
    assets: {
        agents: AssetCopyResult;
        prompts: AssetCopyResult;
        workflows: AssetCopyResult;
    };
    config: {
        created: boolean;
        schemaUpdated: boolean;
        wranglerConfigCreated: boolean;
    };
    gitignore: {
        patternsAdded: string[];
        existing: string[];
    };
}
/**
 * Resolve the plugin root directory.
 * Uses the provided path or walks up from the module location.
 *
 * Issue #4: Uses __dirname which works in both CJS (ts-jest) and esbuild-bundled contexts
 *   when bundling to bundle.cjs, so this works in both ESM and CJS output.
 * Issue #1: Validates the resolved path is not a system directory.
 */
export declare function resolvePluginRoot(explicitPath?: string): string;
/**
 * Resolve the project root directory.
 * Uses the provided path or attempts to find git root, falling back to cwd.
 *
 * Issue #1: Validates the resolved path is not a system directory.
 */
export declare function resolveProjectRoot(explicitPath?: string): string;
/**
 * Parse a .gitignore file into a set of active (non-comment, non-blank) patterns.
 * Handles both LF and CRLF line endings, trims whitespace from each line,
 * and skips comment lines (starting with #) and blank lines.
 */
export declare function parseGitignorePatterns(content: string): Set<string>;
/**
 * Parse a semver version string into numeric components.
 * Returns [major, minor, patch] or [0, 0, 0] for invalid/missing versions.
 */
export declare function parseSemver(version: string | undefined): [number, number, number];
/**
 * Compare two semver versions.
 * Returns positive if a > b, negative if a < b, 0 if equal.
 */
export declare function compareSemver(a: string | undefined, b: string | undefined): number;
/**
 * Initialize or verify the .wrangler/ workspace directory structure.
 *
 * In report-only mode (fix: false), returns what would be created.
 * In apply mode (fix: true), creates directories, copies assets, and manages config.
 */
export declare function initWorkspaceTool(params: InitWorkspaceParams): Promise<MCPResponse<InitWorkspaceResult>>;
export {};
//# sourceMappingURL=init.d.ts.map