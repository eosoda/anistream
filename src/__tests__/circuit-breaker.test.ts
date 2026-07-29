import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitBreaker } from '@/lib/api/circuit-breaker';

describe('CircuitBreaker State Machine', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 3,
      windowMs: 1000,
      resetTimeoutMs: 500,
    });
  });

  it('starts in CLOSED state', () => {
    expect(breaker.getState('test-provider')).toBe('CLOSED');
  });

  it('transitions to OPEN state after failure threshold is reached', () => {
    breaker.recordFailure('test-provider');
    breaker.recordFailure('test-provider');
    expect(breaker.getState('test-provider')).toBe('CLOSED');

    breaker.recordFailure('test-provider');
    expect(breaker.getState('test-provider')).toBe('OPEN');
  });

  it('executes fallback when state is OPEN', async () => {
    breaker.recordFailure('test-provider');
    breaker.recordFailure('test-provider');
    breaker.recordFailure('test-provider');

    const primaryFn = async () => 'primary-data';
    const fallbackFn = async () => 'fallback-data';

    const res = await breaker.execute('test-provider', primaryFn, fallbackFn);
    expect(res.isFallback).toBe(true);
    expect(res.data).toBe('fallback-data');
  });

  it('resets to CLOSED state on recorded success', () => {
    breaker.recordFailure('test-provider');
    breaker.recordFailure('test-provider');
    breaker.recordFailure('test-provider');
    expect(breaker.getState('test-provider')).toBe('OPEN');

    breaker.recordSuccess('test-provider');
    expect(breaker.getState('test-provider')).toBe('CLOSED');
  });
});
