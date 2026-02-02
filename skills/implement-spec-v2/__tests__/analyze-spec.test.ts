import { analyzeSpec, AnalyzeSpecParams, AnalyzeSpecResult } from '../scripts/analyze-spec';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('analyzeSpec', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');
  const sampleSpecPath = path.join(fixturesDir, 'sample-spec.md');

  beforeAll(async () => {
    // Create fixtures directory
    await fs.mkdir(fixturesDir, { recursive: true });

    // Create sample spec file
    const sampleSpec = `---
id: SPEC-TEST-001
title: Test Specification
---

# Test Specification

## Requirements

### Functional Requirements

#### FR-001: User Authentication
**Priority:** MUST HAVE

**Acceptance Criteria:**
- AC-001: User can log in with email and password
- AC-002: User can log out
- AC-003: User session persists across page refreshes

#### FR-002: Dashboard Display
**Priority:** SHOULD HAVE

**Acceptance Criteria:**
- AC-004: User can view dashboard after login
- AC-005: Dashboard displays user's recent activity
- AC-006: User can click on activity to view details

## Manual Testing Checklist

- [ ] Start the application
- [ ] Navigate to login page
- [ ] Enter valid credentials
- [ ] Verify successful login
- [ ] Check dashboard loads
`;

    await fs.writeFile(sampleSpecPath, sampleSpec, 'utf-8');
  });

  afterAll(async () => {
    // Clean up fixtures
    await fs.rm(fixturesDir, { recursive: true, force: true });
  });

  describe('extract acceptance criteria', () => {
    it('should extract numbered acceptance criteria from spec', async () => {
      const params: AnalyzeSpecParams = {
        specFile: sampleSpecPath,
        sessionId: 'test-session-001',
      };

      const result = await analyzeSpec(params);

      expect(result.acceptanceCriteria).toBeDefined();
      expect(result.acceptanceCriteria.length).toBeGreaterThan(0);

      // Check first criterion
      const firstCriterion = result.acceptanceCriteria.find(c => c.id === 'AC-001');
      expect(firstCriterion).toBeDefined();
      expect(firstCriterion?.description).toContain('log in');
      expect(firstCriterion?.section).toBe('FR-001');
    });

    it('should extract all 6 acceptance criteria', async () => {
      const params: AnalyzeSpecParams = {
        specFile: sampleSpecPath,
        sessionId: 'test-session-002',
      };

      const result = await analyzeSpec(params);

      expect(result.acceptanceCriteria).toHaveLength(6);
      expect(result.totalCriteria).toBe(6);

      // Verify all IDs are present
      const ids = result.acceptanceCriteria.map(c => c.id);
      expect(ids).toContain('AC-001');
      expect(ids).toContain('AC-002');
      expect(ids).toContain('AC-003');
      expect(ids).toContain('AC-004');
      expect(ids).toContain('AC-005');
      expect(ids).toContain('AC-006');
    });
  });

  describe('identify E2E test features', () => {
    it('should identify user-facing features requiring E2E tests', async () => {
      const params: AnalyzeSpecParams = {
        specFile: sampleSpecPath,
        sessionId: 'test-session-003',
      };

      const result = await analyzeSpec(params);

      expect(result.e2eTestFeatures).toBeDefined();
      expect(result.e2eTestFeatures.length).toBeGreaterThan(0);

      // Should identify login/dashboard as E2E features
      const featureText = result.e2eTestFeatures.join(' ').toLowerCase();
      expect(featureText).toMatch(/log.*in|dashboard|click/);
    });

    it('should extract E2E features based on trigger keywords', async () => {
      const params: AnalyzeSpecParams = {
        specFile: sampleSpecPath,
        sessionId: 'test-session-004',
      };

      const result = await analyzeSpec(params);

      // Features with "user can", "clicking", "navigate" should be identified
      expect(result.e2eTestFeatures.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('generate manual testing checklist', () => {
    it('should generate manual testing checklist from requirements', async () => {
      const params: AnalyzeSpecParams = {
        specFile: sampleSpecPath,
        sessionId: 'test-session-005',
      };

      const result = await analyzeSpec(params);

      expect(result.manualTestingChecklist).toBeDefined();
      expect(result.manualTestingChecklist.length).toBeGreaterThan(0);

      // Should have checklist items
      const firstItem = result.manualTestingChecklist[0];
      expect(firstItem).toHaveProperty('id');
      expect(firstItem).toHaveProperty('description');
      expect(firstItem.id).toMatch(/MT-\d{3}/);
    });

    it('should generate checklist items for key user flows', async () => {
      const params: AnalyzeSpecParams = {
        specFile: sampleSpecPath,
        sessionId: 'test-session-006',
      };

      const result = await analyzeSpec(params);

      const checklistText = result.manualTestingChecklist
        .map(item => item.description)
        .join(' ')
        .toLowerCase();

      // Should include login testing
      expect(checklistText).toMatch(/login|authenticate/);
    });
  });

  describe('error handling', () => {
    it('should throw error if spec file does not exist', async () => {
      const params: AnalyzeSpecParams = {
        specFile: '/nonexistent/spec.md',
        sessionId: 'test-session-error-001',
      };

      await expect(analyzeSpec(params)).rejects.toThrow(/not found|ENOENT/);
    });

    it('should handle spec with no acceptance criteria', async () => {
      const emptySpecPath = path.join(fixturesDir, 'empty-spec.md');
      await fs.writeFile(emptySpecPath, '# Empty Spec\n\nNo criteria here.', 'utf-8');

      const params: AnalyzeSpecParams = {
        specFile: emptySpecPath,
        sessionId: 'test-session-error-002',
      };

      const result = await analyzeSpec(params);

      expect(result.acceptanceCriteria).toEqual([]);
      expect(result.totalCriteria).toBe(0);
    });

    it('should require specFile parameter', async () => {
      const params = {
        specFile: '',
        sessionId: 'test-session-error-003',
      };

      await expect(analyzeSpec(params)).rejects.toThrow(/spec.*file.*required/i);
    });

    it('should require sessionId parameter', async () => {
      const params = {
        specFile: sampleSpecPath,
        sessionId: '',
      };

      await expect(analyzeSpec(params)).rejects.toThrow(/session.*id.*required/i);
    });
  });

  describe('priority mapping', () => {
    it('should map MUST HAVE priority correctly', async () => {
      const params: AnalyzeSpecParams = {
        specFile: sampleSpecPath,
        sessionId: 'test-session-priority-001',
      };

      const result = await analyzeSpec(params);

      const mustHaveCriteria = result.acceptanceCriteria.filter(c => c.priority === 'must');
      expect(mustHaveCriteria.length).toBeGreaterThan(0);
    });

    it('should map SHOULD HAVE priority correctly', async () => {
      const params: AnalyzeSpecParams = {
        specFile: sampleSpecPath,
        sessionId: 'test-session-priority-002',
      };

      const result = await analyzeSpec(params);

      const shouldHaveCriteria = result.acceptanceCriteria.filter(c => c.priority === 'should');
      expect(shouldHaveCriteria.length).toBeGreaterThan(0);
    });

    it('should default to "must" priority if not specified', async () => {
      const noPrioritySpecPath = path.join(fixturesDir, 'no-priority-spec.md');
      await fs.writeFile(noPrioritySpecPath, `---
id: SPEC-TEST-002
---

# Test Spec

**Acceptance Criteria:**
- AC-001: User can do something
`, 'utf-8');

      const params: AnalyzeSpecParams = {
        specFile: noPrioritySpecPath,
        sessionId: 'test-session-priority-003',
      };

      const result = await analyzeSpec(params);

      expect(result.acceptanceCriteria[0].priority).toBe('must');
    });
  });
});
