import { analyzeSpec } from '../scripts/analyze-spec';
import { generatePRDescription } from '../scripts/generate-pr-description';
import { auditSpecCompliance } from '../scripts/audit-spec-compliance';
import { updatePRDescription } from '../scripts/update-pr-description';
import * as fs from 'fs-extra';
import * as path from 'path';
import { GitHubClient } from '../scripts/utils/github';

// Mock fs and GitHubClient for integration tests
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));
jest.mock('fs-extra', () => ({
  readFile: jest.fn(),
}));
jest.mock('../scripts/utils/github');

describe('Integration Tests', () => {
  const testTemplatesDir = path.join(__dirname, '../templates');
  const mockSpecContent = `---
id: SPEC-000001
title: Test Feature
status: open
priority: high
---

## FR-001: User Authentication

**Priority:** MUST HAVE

- AC-001: User can log in with email and password
- AC-002: User can log out
- AC-003: User session persists after page refresh

## FR-002: Dashboard

**Priority:** SHOULD HAVE

- AC-004: User can navigate to dashboard after login
`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Full workflow integration', () => {
    it('should execute complete workflow from analysis to PR update', async () => {
      // Mock file operations
      (fs.readFile as jest.Mock).mockImplementation(async (filePath: any) => {
        if (filePath.includes('SPEC')) {
          return mockSpecContent;
        }
        // Return template content for PR description generation
        return '# {{specTitle}}\n\n## Test Template';
      });

      // Mock GitHub client
      const mockGitHubClient = {
        getPRDescription: jest.fn().mockResolvedValue('Old description'),
        updatePRDescription: jest.fn().mockResolvedValue(undefined),
      };
      (GitHubClient as jest.Mock).mockImplementation(() => mockGitHubClient);

      // STEP 1: Analyze spec
      const analysisResult = await analyzeSpec({
        specFile: '/test/SPEC-000001.md',
        sessionId: 'test-session',
      });

      expect(analysisResult.acceptanceCriteria).toHaveLength(4);
      expect(analysisResult.acceptanceCriteria[0].id).toBe('AC-001');
      expect(analysisResult.e2eTestFeatures.length).toBeGreaterThan(0);
      expect(analysisResult.manualTestingChecklist.length).toBeGreaterThan(0);

      // STEP 2: Generate planning PR description
      const planningDescription = await generatePRDescription({
        phase: 'planning' as any,
        specInfo: {
          specId: 'SPEC-000001',
          title: 'Test Feature',
          status: 'open',
          priority: 'high',
        },
        analysis: analysisResult,
        templatesDir: testTemplatesDir,
      });

      expect(planningDescription).toContain('Test Template');

      // STEP 3: Audit compliance (initially 0%)
      const complianceReport = auditSpecCompliance({
        analysis: analysisResult,
        completedTasks: [],
      });

      expect(complianceReport.percentage).toBe(0);
      expect(complianceReport.totalCriteria).toBe(4);

      // STEP 4: Simulate task completion
      const updatedAnalysis = {
        ...analysisResult,
        acceptanceCriteria: analysisResult.acceptanceCriteria.map((ac) => ({
          ...ac,
          met: true,
        })),
      };

      // STEP 5: Audit compliance (now 100%)
      const finalComplianceReport = auditSpecCompliance({
        analysis: updatedAnalysis,
        completedTasks: [
          { id: 'ISS-001', title: 'Task 1', status: 'closed' },
          { id: 'ISS-002', title: 'Task 2', status: 'closed' },
        ],
      });

      expect(finalComplianceReport.percentage).toBe(100);
      expect(finalComplianceReport.recommendations).toHaveLength(0);

      // STEP 6: Generate completion PR description
      const completeDescription = await generatePRDescription({
        phase: 'complete' as any,
        specInfo: {
          specId: 'SPEC-000001',
          title: 'Test Feature',
          status: 'open',
          priority: 'high',
        },
        analysis: updatedAnalysis,
        templatesDir: testTemplatesDir,
        complianceReport: finalComplianceReport,
      });

      expect(completeDescription).toContain('Test Template');

      // STEP 7: Update PR description
      await updatePRDescription({
        prNumber: 123,
        newDescription: completeDescription,
        mergeStrategy: 'update-sections',
      });

      expect(mockGitHubClient.updatePRDescription).toHaveBeenCalled();
    });
  });

  describe('Compliance tracking through phases', () => {
    it('should track compliance from 0% to 100%', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue(mockSpecContent);

      // Analyze spec
      const analysis = await analyzeSpec({
        specFile: '/test/SPEC-000001.md',
        sessionId: 'test-session',
      });

      // Initial compliance (no criteria met)
      const phase1 = auditSpecCompliance({
        analysis,
        completedTasks: [],
      });
      expect(phase1.percentage).toBe(0);

      // Partial compliance (2/4 met)
      const phase2Analysis = {
        ...analysis,
        acceptanceCriteria: analysis.acceptanceCriteria.map((ac, i) => ({
          ...ac,
          met: i < 2,
        })),
      };
      const phase2 = auditSpecCompliance({
        analysis: phase2Analysis,
        completedTasks: [{ id: 'ISS-001', title: 'Task 1', status: 'closed' }],
      });
      expect(phase2.percentage).toBe(50);

      // Full compliance (4/4 met)
      const phase3Analysis = {
        ...analysis,
        acceptanceCriteria: analysis.acceptanceCriteria.map((ac) => ({
          ...ac,
          met: true,
        })),
      };
      const phase3 = auditSpecCompliance({
        analysis: phase3Analysis,
        completedTasks: [
          { id: 'ISS-001', title: 'Task 1', status: 'closed' },
          { id: 'ISS-002', title: 'Task 2', status: 'closed' },
        ],
      });
      expect(phase3.percentage).toBe(100);
    });
  });

  describe('Template rendering with real data', () => {
    it('should render all phases with consistent data', async () => {
      jest.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
        if (filePath.includes('SPEC')) {
          return mockSpecContent;
        }
        // Simple template for testing
        return '{{specTitle}}: {{compliancePercentage}}%';
      });

      const analysis = await analyzeSpec({
        specFile: '/test/SPEC-000001.md',
        sessionId: 'test-session',
      });

      const specInfo = {
        specId: 'SPEC-000001',
        title: 'Test Feature',
        status: 'open',
        priority: 'high',
      };

      const phases = ['planning', 'execution', 'verification', 'complete'];

      for (const phase of phases) {
        const description = await generatePRDescription({
          phase: phase as any,
          specInfo,
          analysis,
          templatesDir: testTemplatesDir,
          complianceReport: {
            totalCriteria: 4,
            metCriteria: phase === 'complete' ? 4 : 2,
            percentage: phase === 'complete' ? 100 : 50,
          },
        });

        expect(description).toContain('Test Feature');
      }
    });
  });

  describe('Error handling across scripts', () => {
    it('should handle spec file not found', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue({ code: 'ENOENT' });

      await expect(
        analyzeSpec({
          specFile: '/nonexistent/spec.md',
          sessionId: 'test-session',
        })
      ).rejects.toThrow('Spec file not found');
    });

    it('should handle invalid compliance data', () => {
      const invalidAnalysis: any = {
        acceptanceCriteria: [],
        e2eTestFeatures: [],
        manualTestingChecklist: [],
        totalCriteria: 0,
      };

      const report = auditSpecCompliance({
        analysis: invalidAnalysis,
        completedTasks: [],
      });

      expect(report.percentage).toBe(0);
      expect(report.totalCriteria).toBe(0);
    });

    it('should handle PR update failures gracefully', async () => {
      const mockGitHubClient = {
        getPRDescription: jest.fn().mockResolvedValue('Old'),
        updatePRDescription: jest.fn().mockRejectedValue(new Error('Update failed')),
      };
      (GitHubClient as jest.Mock).mockImplementation(() => mockGitHubClient);

      await expect(
        updatePRDescription({
          prNumber: 123,
          newDescription: 'New',
        })
      ).rejects.toThrow('Update failed');
    });
  });
});
