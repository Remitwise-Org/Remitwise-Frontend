import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

/**
 * Guards the CI workflow's job graph so `lint` and `typecheck` keep running
 * as independent parallel jobs instead of being re-merged into a single
 * sequential job (see issue #1501).
 */

type WorkflowJob = { needs?: string | string[] };
type Workflow = { jobs: Record<string, WorkflowJob> };

function jobsRunInParallel(jobs: Record<string, WorkflowJob>, a: string, b: string): boolean {
  const needsOf = (name: string): string[] => {
    const needs = jobs[name]?.needs;
    if (!needs) return [];
    return Array.isArray(needs) ? needs : [needs];
  };

  // Two jobs run in parallel only if neither depends on the other, directly.
  return !needsOf(a).includes(b) && !needsOf(b).includes(a);
}

const workflowPath = path.join(process.cwd(), '.github/workflows/ci.yml');

describe('CI workflow job graph', () => {
  it('defines separate lint and typecheck jobs that run in parallel (happy path)', () => {
    const workflow = parse(readFileSync(workflowPath, 'utf8')) as Workflow;

    expect(workflow.jobs.lint).toBeDefined();
    expect(workflow.jobs.typecheck).toBeDefined();
    expect(jobsRunInParallel(workflow.jobs, 'lint', 'typecheck')).toBe(true);
  });

  it('flags a workflow where typecheck is made to wait on lint (failure mode)', () => {
    const sequentialJobs: Record<string, WorkflowJob> = {
      lint: {},
      typecheck: { needs: 'lint' },
    };

    expect(jobsRunInParallel(sequentialJobs, 'lint', 'typecheck')).toBe(false);
  });
});