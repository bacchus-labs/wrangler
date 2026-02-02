import * as fs from 'fs/promises';
import matter from 'gray-matter';

/**
 * Parameters for analyzing a specification
 */
export interface AnalyzeSpecParams {
  specFile: string;
  sessionId: string;
}

/**
 * Acceptance criterion extracted from spec
 */
export interface AcceptanceCriterion {
  id: string;              // AC-001, AC-002, etc.
  description: string;      // What must be true
  section: string;          // Which spec section (e.g., FR-001)
  priority: 'must' | 'should' | 'nice';
  met?: boolean;            // Verification result (optional)
}

/**
 * Manual testing checklist item
 */
export interface ChecklistItem {
  id: string;               // MT-001, MT-002, etc.
  description: string;      // Testing step
}

/**
 * Result of analyzing a specification
 */
export interface AnalyzeSpecResult {
  acceptanceCriteria: AcceptanceCriterion[];
  e2eTestFeatures: string[];
  manualTestingChecklist: ChecklistItem[];
  totalCriteria: number;
}

/**
 * Analyze a specification file to extract acceptance criteria,
 * identify E2E test needs, and generate verification checklist
 */
export async function analyzeSpec(params: AnalyzeSpecParams): Promise<AnalyzeSpecResult> {
  // Validate parameters
  if (!params.specFile || params.specFile.trim() === '') {
    throw new Error('Spec file path is required');
  }
  if (!params.sessionId || params.sessionId.trim() === '') {
    throw new Error('Session ID is required');
  }

  // Read spec file
  let content: string;
  try {
    content = await fs.readFile(params.specFile, 'utf-8');
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(`Spec file not found: ${params.specFile}`);
    }
    throw error;
  }

  // Parse frontmatter and content
  const parsed = matter(content);
  const markdown = parsed.content;

  // Extract acceptance criteria
  const acceptanceCriteria = extractAcceptanceCriteria(markdown);

  // Identify E2E test features
  const e2eTestFeatures = identifyE2EFeatures(markdown, acceptanceCriteria);

  // Generate manual testing checklist
  const manualTestingChecklist = generateManualChecklist(markdown, acceptanceCriteria);

  return {
    acceptanceCriteria,
    e2eTestFeatures,
    manualTestingChecklist,
    totalCriteria: acceptanceCriteria.length,
  };
}

/**
 * Extract numbered acceptance criteria from markdown content
 */
function extractAcceptanceCriteria(markdown: string): AcceptanceCriterion[] {
  const criteria: AcceptanceCriterion[] = [];
  const lines = markdown.split('\n');

  let currentSection = '';
  let currentPriority: 'must' | 'should' | 'nice' = 'must';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track current section (FR-001, FR-002, etc.)
    const sectionMatch = line.match(/^#+\s+(FR-\d{3}|NFR-\d{3})/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      continue;
    }

    // Track priority
    const priorityMatch = line.match(/\*\*Priority:\*\*\s*(MUST HAVE|SHOULD HAVE|NICE TO HAVE)/i);
    if (priorityMatch) {
      const priorityText = priorityMatch[1].toUpperCase();
      if (priorityText.includes('MUST')) {
        currentPriority = 'must';
      } else if (priorityText.includes('SHOULD')) {
        currentPriority = 'should';
      } else if (priorityText.includes('NICE')) {
        currentPriority = 'nice';
      }
      continue;
    }

    // Extract acceptance criteria (format: "- AC-001: Description")
    const criterionMatch = line.match(/^-\s+(AC-\d{3}):\s+(.+)$/);
    if (criterionMatch) {
      const [, id, description] = criterionMatch;
      criteria.push({
        id,
        description: description.trim(),
        section: currentSection,
        priority: currentPriority,
        met: false,
      });
    }
  }

  return criteria;
}

/**
 * Identify user-facing features that require E2E tests
 * Triggers: "user can", "UI displays", "clicking", "navigate", etc.
 */
function identifyE2EFeatures(markdown: string, criteria: AcceptanceCriterion[]): string[] {
  const features: string[] = [];
  const e2eKeywords = [
    /user\s+can/i,
    /user\s+must/i,
    /ui\s+displays?/i,
    /click(?:ing|s)?/i,
    /navigate/i,
    /page\s+transition/i,
    /routing/i,
    /display/i,
    /render/i,
  ];

  // Check acceptance criteria for E2E triggers
  for (const criterion of criteria) {
    for (const keyword of e2eKeywords) {
      if (keyword.test(criterion.description)) {
        features.push(`${criterion.id}: ${criterion.description}`);
        break;
      }
    }
  }

  return features;
}

/**
 * Generate manual testing checklist from spec content and criteria
 */
function generateManualChecklist(markdown: string, criteria: AcceptanceCriterion[]): ChecklistItem[] {
  const checklist: ChecklistItem[] = [];
  let counter = 1;

  // Add setup steps
  checklist.push({
    id: `MT-${String(counter++).padStart(3, '0')}`,
    description: 'Start the application and verify it loads without errors',
  });

  checklist.push({
    id: `MT-${String(counter++).padStart(3, '0')}`,
    description: 'Open browser DevTools and check for console errors',
  });

  // Generate testing steps from acceptance criteria
  for (const criterion of criteria) {
    // Convert acceptance criterion to manual test step
    const testStep = convertCriterionToTestStep(criterion);
    if (testStep) {
      checklist.push({
        id: `MT-${String(counter++).padStart(3, '0')}`,
        description: testStep,
      });
    }
  }

  // Add verification step
  checklist.push({
    id: `MT-${String(counter++).padStart(3, '0')}`,
    description: 'Verify no errors in browser console after all tests',
  });

  return checklist;
}

/**
 * Convert an acceptance criterion to a manual testing step
 */
function convertCriterionToTestStep(criterion: AcceptanceCriterion): string | null {
  const description = criterion.description.toLowerCase();

  // Generate actionable test step
  if (description.includes('can log in') || description.includes('can login')) {
    return 'Attempt to log in with valid credentials and verify success';
  }

  if (description.includes('can log out') || description.includes('can logout')) {
    return 'Log out and verify user is redirected to login page';
  }

  if (description.includes('session persists')) {
    return 'Refresh the page and verify user session is maintained';
  }

  if (description.includes('dashboard')) {
    return 'Navigate to dashboard and verify it displays correctly';
  }

  if (description.includes('click')) {
    return `Verify: ${criterion.description}`;
  }

  // Default: convert criterion to test instruction
  return `Test: ${criterion.description}`;
}
