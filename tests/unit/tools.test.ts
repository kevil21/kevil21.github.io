import { describe, expect, it } from 'vitest';
import { extractToolCalls, stripToolCalls, validateToolCall, TOOL_NAMES } from '@/ai/tools/registry';

describe('tool boundary', () => {
  it('exposes exactly the plan.md tools plus the three additions', () => {
    expect([...TOOL_NAMES].sort()).toEqual(
      [
        'compareProjects',
        'filterProjects',
        'highlightSkill',
        'navigateTo',
        'openProject',
        'openResume',
        'resetWorkspace',
        'showEvidence',
        'showRelevantExperience',
        'switchPersona',
      ].sort(),
    );
  });
  it('accepts valid calls and rejects unknown tools or malformed args', () => {
    expect(validateToolCall({ tool: 'openProject', args: { projectId: 'a360' } })).toEqual({
      tool: 'openProject',
      args: { projectId: 'a360' },
    });
    expect(validateToolCall({ tool: 'evalJS', args: { code: 'alert(1)' } })).toBeNull();
    expect(validateToolCall({ tool: 'openProject', args: { projectId: '../../etc/passwd' } })).toBeNull();
    expect(validateToolCall({ tool: 'navigateTo', args: { section: 'admin' } })).toBeNull();
    expect(validateToolCall({ tool: 'compareProjects', args: { projectIds: ['a360'] } })).toBeNull();
    expect(validateToolCall({ tool: 'switchPersona', args: { persona: 'ceo' } })).toBeNull();
  });
  it('extracts at most three validated calls from model text and strips them', () => {
    const text =
      'A360 is the flagship [1].\n{"tool":"openProject","args":{"projectId":"a360"}}\n```json\n{"tool":"nope","args":{}}\n```';
    const calls = extractToolCalls(text);
    expect(calls).toEqual([{ tool: 'openProject', args: { projectId: 'a360' } }]);
    expect(stripToolCalls(text)).toBe('A360 is the flagship [1].');
  });
});
