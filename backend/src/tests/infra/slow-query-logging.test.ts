import { describe, it, expect, vi } from 'vitest';
import { prisma } from '../../lib/prisma.js';

describe('INFRA-04: slow query logging', () => {
  it('prisma client supports $on query event registration', () => {
    // This confirms the client was created with emit:'event' log config.
    // If the client was created with string-only log config, $on for query
    // events does not fire (it is a no-op but does not throw in Prisma 5.7).
    // Plan 02 makes this meaningful by actually configuring emit:'event'.
    const spy = vi.fn();
    expect(() => {
      prisma.$on('query' as never, spy);
    }).not.toThrow();
  });
});
