import { describe, it, expect } from 'vitest';
import { computeNextRunAt } from '@/lib/remittance/recurring-frequency';

describe('Recurring Remittance Frequency Computation', () => {
  it('should compute weekly nextRunAt correctly', () => {
    const from = new Date('2024-01-15T10:00:00Z');
    const nextRun = computeNextRunAt('weekly', from);
    const expected = new Date('2024-01-22T10:00:00Z');
    expect(nextRun.getTime()).toBe(expected.getTime());
  });

  it('should compute biweekly nextRunAt correctly', () => {
    const from = new Date('2024-01-15T10:00:00Z');
    const nextRun = computeNextRunAt('biweekly', from);
    const expected = new Date('2024-01-29T10:00:00Z');
    expect(nextRun.getTime()).toBe(expected.getTime());
  });

  it('should compute monthly nextRunAt correctly', () => {
    const from = new Date('2024-01-15T10:00:00Z');
    const nextRun = computeNextRunAt('monthly', from);
    const expected = new Date('2024-02-15T10:00:00Z');
    expect(nextRun.getTime()).toBe(expected.getTime());
  });

  it('should handle month-end dates correctly for monthly frequency', () => {
    const from = new Date('2024-01-31T10:00:00Z');
    const nextRun = computeNextRunAt('monthly', from);
    expect(nextRun.getMonth()).toBe(1); // February
    expect(nextRun.getDate()).toBe(29); // Last day of Feb in leap year
  });

  it('should handle weekly computation at month boundary', () => {
    const from = new Date('2024-01-29T10:00:00Z');
    const nextRun = computeNextRunAt('weekly', from);
    const expected = new Date('2024-02-05T10:00:00Z');
    expect(nextRun.getTime()).toBe(expected.getTime());
  });

  it('should preserve time of day for all frequencies', () => {
    const time = new Date('2024-01-15T14:30:45Z');

    const weekly = computeNextRunAt('weekly', time);
    const biweekly = computeNextRunAt('biweekly', time);
    const monthly = computeNextRunAt('monthly', time);

    expect(weekly.getHours()).toBe(14);
    expect(weekly.getMinutes()).toBe(30);
    expect(weekly.getSeconds()).toBe(45);

    expect(biweekly.getHours()).toBe(14);
    expect(biweekly.getMinutes()).toBe(30);
    expect(biweekly.getSeconds()).toBe(45);

    expect(monthly.getHours()).toBe(14);
    expect(monthly.getMinutes()).toBe(30);
    expect(monthly.getSeconds()).toBe(45);
  });
});
