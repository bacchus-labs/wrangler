/**
 * E2E Tests for implement-spec-v2 workflow
 *
 * These tests verify the complete workflow using fixtures and real file operations.
 * They test the full five-phase process end-to-end.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { analyzeSpec } from '../scripts/analyze-spec';
import { generatePRDescription, PRPhase } from '../scripts/generate-pr-description';
import { auditSpecCompliance } from '../scripts/audit-spec-compliance';

describe('E2E Tests', () => {
  let testDir: string;
  let fixturesDir: string;
  let templatesDir: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'implement-spec-v2-e2e-'));
    fixturesDir = path.join(testDir, 'fixtures');
    templatesDir = path.join(__dirname, '../templates');

    await fs.ensureDir(fixturesDir);
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.remove(testDir);
  });

  describe('Full workflow with fixture spec', () => {
    it('should process fixture spec through all phases', async () => {
      // Create fixture spec
      const specContent = `---
id: SPEC-TEST-001
title: User Authentication System
status: open
priority: high
---

# User Authentication System

## FR-001: Login Feature

**Priority:** MUST HAVE

Users must be able to log in to the system.

- AC-001: User can log in with email and password
- AC-002: User can click login button to submit credentials
- AC-003: User is redirected to dashboard after successful login

## FR-002: Logout Feature

**Priority:** MUST HAVE

- AC-004: User can log out of the system
- AC-005: User session is cleared upon logout

## NFR-001: Security

**Priority:** SHOULD HAVE

- AC-006: Passwords are hashed before storage
`;

      const specPath = path.join(fixturesDir, 'SPEC-TEST-001.md');
      await fs.writeFile(specPath, specContent);

      // PHASE 1: ANALYZE
      const analysisResult = await analyzeSpec({
        specFile: specPath,
        sessionId: 'e2e-test-session',
      });

      expect(analysisResult.acceptanceCriteria).toHaveLength(6);
      expect(analysisResult.acceptanceCriteria[0].id).toBe('AC-001');
      expect(analysisResult.e2eTestFeatures.length).toBeGreaterThan(0);
      expect(analysisResult.manualTestingChecklist.length).toBeGreaterThan(0);
      expect(analysisResult.totalCriteria).toBe(6);

      // Verify E2E requirements detected (should detect "user can")
      expect(analysisResult.e2eTestFeatures).toContainEqual(
        expect.stringContaining('AC-001')
      );

      // Save analysis to file
      const analysisPath = path.join(testDir, 'analysis.json');
      await fs.writeJSON(analysisPath, analysisResult);

      // PHASE 2: PLAN - Generate planning description
      const specInfo = {
        specId: 'SPEC-TEST-001',
        title: 'User Authentication System',
        status: 'open',
        priority: 'high',
      };

      const planningDescription = await generatePRDescription({
        phase: PRPhase.PLANNING,
        specInfo,
        analysis: analysisResult,
        templatesDir,
      });

      expect(planningDescription).toContain('User Authentication System');
      expect(planningDescription).toContain('SPEC-TEST-001');
      expect(planningDescription).toContain('Planning Phase');
      expect(planningDescription).toContain('AC-001');
      expect(planningDescription).toContain('6 acceptance criteria');

      // Save planning description
      await fs.writeFile(path.join(testDir, 'planning.md'), planningDescription);

      // PHASE 3: EXECUTE - Simulate task completion
      const tasks = [
        { id: 'ISS-001', title: 'Implement login UI', status: 'closed' },
        { id: 'ISS-002', title: 'Add authentication backend', status: 'closed' },
        { id: 'ISS-003', title: 'Implement logout', status: 'closed' },
      ];

      // Mark some criteria as met (partial completion)
      const partialAnalysis = {
        ...analysisResult,
        acceptanceCriteria: analysisResult.acceptanceCriteria.map((ac, i) => ({
          ...ac,
          met: i < 3, // First 3 criteria met
        })),
      };

      const partialComplianceForExecution = auditSpecCompliance({
        analysis: partialAnalysis,
        completedTasks: tasks,
      });

      const executionDescription = await generatePRDescription({
        phase: PRPhase.EXECUTION,
        specInfo,
        analysis: partialAnalysis,
        templatesDir,
        tasks,
        complianceReport: partialComplianceForExecution,
      });

      expect(executionDescription).toContain('Execution Phase');
      expect(executionDescription).toContain('ISS-001');
      expect(executionDescription).toContain('50%'); // 3/6 criteria met

      // PHASE 4: VERIFY - Audit compliance
      const partialCompliance = auditSpecCompliance({
        analysis: partialAnalysis,
        completedTasks: tasks,
      });

      expect(partialCompliance.percentage).toBe(50);
      expect(partialCompliance.metCriteria).toBe(3);
      expect(partialCompliance.totalCriteria).toBe(6);
      expect(partialCompliance.recommendations.length).toBeGreaterThan(0);

      // Complete remaining criteria
      const completeAnalysis = {
        ...analysisResult,
        acceptanceCriteria: analysisResult.acceptanceCriteria.map((ac) => ({
          ...ac,
          met: true,
        })),
      };

      const finalCompliance = auditSpecCompliance({
        analysis: completeAnalysis,
        completedTasks: tasks,
      });

      expect(finalCompliance.percentage).toBe(100);
      expect(finalCompliance.recommendations).toHaveLength(0);
      expect(finalCompliance.summary).toContain('100%');

      const verificationDescription = await generatePRDescription({
        phase: PRPhase.VERIFICATION,
        specInfo,
        analysis: completeAnalysis,
        templatesDir,
        complianceReport: finalCompliance,
      });

      expect(verificationDescription).toContain('Verification Phase');
      expect(verificationDescription).toContain('100%');

      // PHASE 5: PUBLISH - Generate completion summary
      const completeDescription = await generatePRDescription({
        phase: PRPhase.COMPLETE,
        specInfo,
        analysis: completeAnalysis,
        templatesDir,
        tasks,
        complianceReport: finalCompliance,
      });

      expect(completeDescription).toContain('Implementation Complete');
      expect(completeDescription).toContain('100%');
      expect(completeDescription).toContain('All acceptance criteria');

      // Save final description
      await fs.writeFile(path.join(testDir, 'complete.md'), completeDescription);

      // Verify all generated files exist
      const files = await fs.readdir(testDir);
      expect(files).toContain('analysis.json');
      expect(files).toContain('planning.md');
      expect(files).toContain('complete.md');
    });
  });

  describe('Quality gate enforcement', () => {
    it('should enforce mandatory verification gate', async () => {
      const specContent = `---
id: SPEC-TEST-002
title: Test Feature
status: open
priority: high
---

## FR-001: Feature

**Priority:** MUST HAVE

- AC-001: Feature works
- AC-002: Feature is tested
`;

      const specPath = path.join(fixturesDir, 'SPEC-TEST-002.md');
      await fs.writeFile(specPath, specContent);

      const analysis = await analyzeSpec({
        specFile: specPath,
        sessionId: 'e2e-test-session-2',
      });

      // Attempt to skip verification (only 1/2 criteria met)
      const incompleteAnalysis = {
        ...analysis,
        acceptanceCriteria: analysis.acceptanceCriteria.map((ac, i) => ({
          ...ac,
          met: i === 0, // Only first criterion met
        })),
      };

      const compliance = auditSpecCompliance({
        analysis: incompleteAnalysis,
        completedTasks: [],
      });

      // Verification gate should fail
      expect(compliance.percentage).toBeLessThan(100);
      expect(compliance.recommendations.length).toBeGreaterThan(0);

      // Should not be able to generate complete description with <100% compliance
      // (This is enforced by the skill workflow, not the scripts themselves)
    });
  });

  describe('E2E test requirement detection', () => {
    it('should correctly identify features requiring E2E tests', async () => {
      const e2eRequiredSpec = `---
id: SPEC-TEST-003
title: UI Feature
status: open
priority: high
---

## FR-001: User Interface

**Priority:** MUST HAVE

- AC-001: User can click the button
- AC-002: Page displays user information
- AC-003: User can navigate to settings
`;

      const specPath = path.join(fixturesDir, 'SPEC-TEST-003.md');
      await fs.writeFile(specPath, e2eRequiredSpec);

      const analysis = await analyzeSpec({
        specFile: specPath,
        sessionId: 'e2e-test-session-3',
      });

      // All criteria involve user interaction - should require E2E
      expect(analysis.e2eTestFeatures.length).toBeGreaterThan(0);
      expect(analysis.e2eTestFeatures).toContainEqual(
        expect.stringContaining('click')
      );
    });

    it('should not require E2E for backend-only features', async () => {
      const noE2ESpec = `---
id: SPEC-TEST-004
title: Backend API
status: open
priority: high
---

## FR-001: Data Processing

**Priority:** MUST HAVE

- AC-001: API validates input data
- AC-002: API returns correct status codes
- AC-003: API handles errors gracefully
`;

      const specPath = path.join(fixturesDir, 'SPEC-TEST-004.md');
      await fs.writeFile(specPath, noE2ESpec);

      const analysis = await analyzeSpec({
        specFile: specPath,
        sessionId: 'e2e-test-session-4',
      });

      // No user-facing keywords - should not require E2E
      expect(analysis.e2eTestFeatures).toHaveLength(0);
    });
  });
});
