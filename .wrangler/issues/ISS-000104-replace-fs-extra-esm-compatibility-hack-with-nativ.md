---
id: ISS-000104
title: Replace fs-extra ESM compatibility hack with native fs/promises
type: issue
status: open
priority: low
labels:
  - workflow-engine
  - v2
  - tech-debt
createdAt: '2026-02-12T17:30:51.757Z'
updatedAt: '2026-02-12T17:30:51.757Z'
project: Deterministic Pipeline
---
## Context

From code review of the workflow engine (PR #26).

In `src/integration/session.ts`, line 13:
```typescript
const fs = (fsExtra as any).default || fsExtra;
```

This `as any` cast bypasses TypeScript's type system for all subsequent `fs.*` calls.

## Proposed Fix

Replace `fs-extra` dependency with native `fs/promises` + small helper functions:
```typescript
import * as fs from 'fs/promises';

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function writeJson(filePath: string, data: unknown, spaces = 2): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, spaces), 'utf-8');
}

async function readJson(filePath: string): Promise<unknown> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}
```

This eliminates the `fs-extra` dependency and the ESM/CJS interop hack.

## Priority

Low -- the hack works, this is a cleanup item.
