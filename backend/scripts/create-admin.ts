/**
 * Create / update an admin user — interactively or non-interactively.
 *
 *   npm run create:admin
 *       → prompts you for Email + Password (hidden) + Name. Best for making a
 *         custom admin by hand on the server.
 *
 *   npm run create:admin -- admin@rajkamal.local 'Strong_Pass1!' "Admin Name"
 *       → non-interactive (email, password, name as args). Note: args are visible
 *         in shell history — prefer the interactive prompt or env for real secrets.
 *
 *   No args + no TTY (e.g. CI) → falls back to ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME.
 *
 * Idempotent UPSERT by email: creates the user if new, or promotes to ADMIN and resets
 * the password if that email already exists. Writes to whatever DATABASE_URL points to,
 * so run it ON THE VPS to seed the local DB.
 */
import dotenv from 'dotenv';
dotenv.config();

import readline from 'node:readline';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

function ask(query: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(query, (a) => { rl.close(); resolve(a.trim()); }));
}

// Reads a line while masking typed characters with '*' (for passwords).
function askHidden(query: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const redraw = () => {
      // clear line, return to col 0, reprint prompt + one '*' per typed char
      process.stdout.write('\x1B[2K\x1B[200D' + query + '*'.repeat((rl as any).line.length));
    };
    process.stdin.on('data', redraw);
    rl.question(query, (value) => {
      process.stdin.removeListener('data', redraw);
      rl.close();
      process.stdout.write('\n');
      resolve(value.trim());
    });
  });
}

async function run() {
  const [argEmail, argPass, argName] = process.argv.slice(2);
  const interactive = !argEmail && Boolean(process.stdin.isTTY);

  let email: string;
  let password: string;
  let name: string;

  if (interactive) {
    console.log('\n— Create / update an admin —\n');
    email = (await ask('Email: ')).toLowerCase();
    password = await askHidden('Password (min 8 chars): ');
    const confirm = await askHidden('Confirm password: ');
    name = (await ask('Name [Administrator]: ')) || 'Administrator';
    if (password !== confirm) throw new Error('Passwords do not match.');
  } else {
    email = (argEmail || process.env.ADMIN_EMAIL || '').toLowerCase().trim();
    password = argPass || process.env.ADMIN_PASSWORD || '';
    name = (argName || process.env.ADMIN_NAME || 'Administrator').trim();
  }

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error('A valid email is required.');
  }
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: Role.ADMIN, password: hashed, name }, // promote + reset if exists
    create: { email, name, password: hashed, role: Role.ADMIN },
  });

  console.log(`\n✅ Admin ${existing ? 'updated' : 'created'}: ${user.email} (role=${user.role})`);
  console.log('   Log in with this email and the password you just set.\n');
}

run()
  .catch((e) => {
    console.error(`\n❌ ${e instanceof Error ? e.message : e}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
