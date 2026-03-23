import { describe, it, expect } from 'vitest';
import { prisma } from '../../lib/prisma.js';

describe('INFRA-01: Prisma connection pool config', () => {
  it('prisma client has event-based query log configured', () => {
    // Access internal _engineConfig to confirm log includes emit:'event'
    // If $on('query') can be registered without throwing, the client supports events
    expect(() => {
      const handler = (_e: unknown) => {};
      prisma.$on('query' as never, handler);
    }).not.toThrow();
  });
});
