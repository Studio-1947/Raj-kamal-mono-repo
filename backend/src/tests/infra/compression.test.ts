import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../helpers/app.js';

describe('INFRA-02: gzip compression', () => {
  it('GET /health handles Accept-Encoding: gzip without errors', async () => {
    const res = await request(app)
      .get('/health')
      .set('Accept-Encoding', 'gzip');
    expect(res.status).toBe(200);
  });
});
