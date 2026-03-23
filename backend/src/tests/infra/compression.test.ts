import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../helpers/app.js';

describe('INFRA-02: gzip compression', () => {
  it('GET /health returns Content-Encoding: gzip when client accepts gzip', async () => {
    const res = await request(app)
      .get('/health')
      .set('Accept-Encoding', 'gzip');
    expect(res.headers['content-encoding']).toBe('gzip');
  });
});
