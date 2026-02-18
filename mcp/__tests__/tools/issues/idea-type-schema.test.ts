/**
 * Tests for 'idea' type in tool schemas
 * Following TDD: These tests should FAIL initially (RED phase)
 */

import { createIssueSchema } from '../../../src/tools/issues/create';
import { listIssuesSchema } from '../../../src/tools/issues/list';

describe('Idea Type Schema Support', () => {
  describe('createIssueSchema', () => {
    it('should accept "idea" as valid type', () => {
      const params = {
        title: 'Test Idea',
        description: 'Test description',
        type: 'idea',
      };

      const result = createIssueSchema.safeParse(params);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('idea');
      }
    });

    it('should accept issue, specification, and idea types', () => {
      const types = ['issue', 'specification', 'idea'];

      for (const type of types) {
        const params = {
          title: 'Test',
          description: 'Test description',
          type,
        };

        const result = createIssueSchema.safeParse(params);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid types', () => {
      const params = {
        title: 'Test',
        description: 'Test description',
        type: 'invalid-type',
      };

      const result = createIssueSchema.safeParse(params);
      expect(result.success).toBe(false);
    });
  });

  describe('listIssuesSchema', () => {
    it('should accept "idea" in types array', () => {
      const params = {
        types: ['idea'],
      };

      const result = listIssuesSchema.safeParse(params);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.types).toEqual(['idea']);
      }
    });

    it('should accept "idea" as single type filter', () => {
      const params = {
        type: 'idea',
      };

      const result = listIssuesSchema.safeParse(params);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('idea');
      }
    });

    it('should accept mixed types including idea', () => {
      const params = {
        types: ['issue', 'specification', 'idea'],
      };

      const result = listIssuesSchema.safeParse(params);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.types).toEqual(['issue', 'specification', 'idea']);
      }
    });

    it('should reject invalid type in array', () => {
      const params = {
        types: ['idea', 'invalid-type'],
      };

      const result = listIssuesSchema.safeParse(params);
      expect(result.success).toBe(false);
    });
  });
});
