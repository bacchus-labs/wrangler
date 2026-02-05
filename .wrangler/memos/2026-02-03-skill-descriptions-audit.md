# Skill Descriptions Audit - SPEC-000043

## Summary

- Total skills: 49
- Compliant (has 'Use when...'): 24
- Missing trigger clause: 9
- Needs reformatting: 16

## Compliant Descriptions ✅

**avoiding-testing-anti-patterns**: Use when writing or changing tests, adding mocks, or tempted to add test-only methods to production code - prevents testing mock behavior, production pollution with test-only methods, and mocking without understanding dependencies

**brainstorming**: Use when creating or developing anything, before writing code or implementation plans - refines rough ideas into fully-formed designs through structured Socratic questioning, alternative exploration, and incremental validation

**creating-issues**: For use when a new issue/task has been identified and needs to be formally captured using the Wrangler MCP issue management system. Use this skill to create new issues via the issues_create MCP tool with appropriate metadata and structured content.

**debugging-systematically**: Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes - four-phase framework (root cause investigation, pattern analysis, hypothesis testing, implementation) that ensures understanding before attempting solutions

**dispatching-parallel-agents**: Use when facing 3+ logically independent failures (different features, different root causes) that can be investigated concurrently - dispatches multiple agents to investigate in parallel; requires either parallel-safe test infrastructure OR sequential fix implementation

**finishing-a-development-branch**: Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by verifying work is complete (tests, requirements, code review, TDD compliance) and presenting structured options for merge, PR, or cleanup

**frontend/accessibility-verification**: Use when implementing any UI - verifies accessibility compliance through automated testing (axe-core), keyboard navigation, screen reader verification, and Lighthouse audits; legally required and ensures inclusive user experience

**frontend/e2e-user-journeys**: Use when implementing critical user workflows that span multiple pages/components - tests complete journeys end-to-end using Page Object Model, user-centric selectors, and condition-based waiting; use sparingly (10-15% of tests)

**frontend/visual-regression-testing**: Use when implementing UI components, design systems, or responsive layouts - verifies visual correctness through screenshot comparison and DevTools verification; prevents shipping broken UI

**housekeeping**: Perform comprehensive project housekeeping - update roadmap, reconcile issues with implementation reality, organize completed work, and identify drift. This is a workflow skill that coordinates multiple parallel subagents for efficiency.  Use when user says something like "run housekeeping", "do your housekeeping" or "clean up project state".

**isolating-worktrees**: Use when implementing features in git worktrees to ensure all changes stay in the correct worktree - prevents "bleeding" of changes back to main branch

**practicing-tdd**: Use when implementing any feature or bugfix, before writing implementation code - write the test first, watch it fail, write minimal code to pass; ensures tests actually verify behavior by requiring failure first

**receiving-code-review**: Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable - requires technical rigor and verification, not performative agreement or blind implementation

**reporting-status**: Generate situational awareness report showing new memos, recent commits, decisions, questions, and roadmap work since user's last reporting-status. Use when user asks "what's new", "catch me up", "status update", "what did I miss", or "recent activity". ONLY invoke via /wrangler:reporting-status command.

**requesting-code-review**: Use when completing tasks, implementing major features, or before merging to verify work meets requirements - dispatches reviewing-code subagent to review implementation against plan or requirements before proceeding

**sharing-skills**: Use when you've developed a broadly useful skill and want to contribute it upstream via pull request - guides process of branching, committing, pushing, and creating PR to contribute skills back to upstream repository

**tracing-root-causes**: Use when errors occur deep in execution and you need to trace back to find the original trigger - systematically traces bugs backward through call stack, adding instrumentation when needed, to identify source of invalid data or incorrect behavior

**updating-wrangler**: Update the wrangler plugin to the latest version by clearing all caching layers. Use when user says "update yourself", "update wrangler", or after pushing changes to the wrangler repo.

**using-git-worktrees**: Use when starting feature work that needs isolation from current workspace or before executing implementation plans - creates isolated git worktrees with smart directory selection and safety verification

**using-wrangler**: Use when starting any conversation - establishes mandatory workflows for finding and using skills, including using Skill tool before announcing usage, following brainstorming before coding, and creating TodoWrite todos for checklists

**verifying-before-completion**: Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always

**writing-plans**: Use when design is complete and you need detailed implementation tasks - creates tracked MCP issues with exact file paths, complete code examples, and verification steps. Optional reference plan file for architecture overview.

**writing-skills**: Creates and refines agent skills using TDD methodology with pressure testing and rationalization detection. Use when creating new skills, editing existing skills, testing skills with pressure scenarios, or verifying skills work before deployment.

**writing-specifications**: Use when creating technical specifications for features, systems, or architectural designs. Creates comprehensive specification documents using the Wrangler MCP issue management system with proper structure and completeness checks.


## Missing Trigger Clause ❌

**capturing-ideas**: Capture user ideas verbatim in .wrangler/ideas/ directory using the MCP issues_create tool with type='idea'. Preserves exact user wording without interpretation or enhancement.

**cleanup-dangling-worktrees**: Clean up git worktrees whose associated feature PRs have been merged. Only removes worktrees where the PR is confirmed merged - never removes active development worktrees.

**defining-constitution**: Develop, refine, and maintain project constitutional principles - uses Socratic questioning to eliminate ambiguity and ensure perfect clarity on design values and non-negotiables

**implementing-issues**: Autonomously implementing-issues tasks from specs, plans, or issues using subagents with TDD and code review

**implementing-specs**: Orchestrate spec-to-PR workflow with session tracking, worktree isolation, and audit trail

**initializing-governance**: Initialize complete governance framework in a project - creates defining-constitution, roadmap, directory READMEs, and issue/spec templates with guided setup process

**organizing-root-files**: Clean up and organize markdown files dumped at project root. Routes files to appropriate directories (memos/, docs/, devops/docs/) or deletes obsolete content. Follows project file organization guidelines from CLAUDE.md.

**refreshing-metrics**: Auto-update status metrics across governance documents - scans MCP issues/specs to calculate current counts and percentages, updates README files and NEXT_STEPS with accurate data

**testing-skills-with-subagents**: DEPRECATED - Use writing-skills instead. This skill has been consolidated into writing-skills which now contains both skill creation and testing methodology.


## Needs Reformatting ⚠️

**analyzing-implementations**: Documents HOW code works with surgical precision - traces data flow, explains implementation details, provides file:line references. Purely documentarian, no critiques or suggestions for improvement.

**analyzing-research-documents**: Extracts high-value insights from research documents, RCAs, design docs, and memos - filters aggressively to return only actionable information. Research equivalent of analyzing-implementations skill.

**checking-constitutional-alignment**: Verify feature requests align with project constitutional principles - applies decision framework systematically and provides clear align/reject/revise recommendation with detailed reasoning

**designing-frontends**: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, or applications. Generates creative, polished code that avoids generic AI aesthetics.

**finding-code-patterns**: Finds similar implementations, usage examples, and existing patterns in the codebase - shows concrete code examples for modeling new work. Pattern librarian documenting what exists without judgment.

**implementing-specs-v2**: GitHub-centric specification implementation orchestrating writing-plans and implementing-issues skills

**locating-code**: Finds WHERE code lives in a codebase - locates files by topic/feature, categorizes by purpose, organizes findings. Super grep/glob/ls tool for navigating unfamiliar codebases.

**refining-specifications**: Reviews existing specifications for ambiguity and missing decision points - uses structured taxonomy to detect gaps, generates prioritized clarification questions, reduces specification uncertainty.

**researching-web-sources**: Strategic web research using WebSearch and WebFetch - finds accurate, relevant information with multiple search angles, prioritizes authoritative sources, synthesizes findings with proper attribution.

**reviewing-code**: Comprehensive code review framework for evaluating implementations against plans, requirements, and quality standards. Provides structured analysis with prioritized, actionable feedback.

**reviewing-implementation-progress**: Reviews in-progress implementation against feature specification and plan - provides structured compliance report with categorized issues for fixing. Mid-implementation checkpoint for quality.

**running-tests**: Run the project's test suite and fix any failures. If no test runner is configured, sets up best-in-class testing infrastructure for the project's language/framework. Ensures all tests pass before completion.

**setting-up-git-hooks**: Set up Git hooks for automated testing and code quality enforcement. Interactive configuration with smart project detection.

**updating-git-hooks**: Update existing Git hooks configuration without full re-setup. Reads current config, allows modifications, regenerates hooks.

**validating-roadmaps**: Validates specification consistency, identifies implementation gaps, reviews roadmap coherence. Ensures documentation aligns, tasks are realistic, and dependencies are clear.

**verifying-governance**: Verify integrity and completeness of governance framework using workspace-schema.json as single source of truth - checks directories, files, and .gitignore against schema
