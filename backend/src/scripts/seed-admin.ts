#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();

import { ensureAdminExists } from '../lib/bootstrap.js';

(async () => {
  try {
    await ensureAdminExists();
    const email = (process.env.ADMIN_EMAIL || 'admin@rajkamal.local').toLowerCase().trim();
    console.log(`Admin seed ensured for: ${email}`);
    process.exit(0);
  } catch (e) {
    console.error('Failed to seed admin:', e);
    process.exit(1);
  }
})();

