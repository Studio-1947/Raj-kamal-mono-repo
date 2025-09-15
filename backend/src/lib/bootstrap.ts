import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';
import { Role } from '@prisma/client';

// Ensures exactly one admin exists. If none exists, creates a fixed admin
// from environment variables. If a user with ADMIN_EMAIL exists but is not
// an admin, it will be promoted and password updated.
export async function ensureAdminExists(): Promise<void> {
  const existingAdmin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  if (existingAdmin) {
    return; // Admin already present
  }

  const email = (process.env.ADMIN_EMAIL || 'admin@rajkamal.local').toLowerCase().trim();
  const name = (process.env.ADMIN_NAME || 'Administrator').trim();
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe_123!';

  const hashedPassword = await bcrypt.hash(password, 10);

  const existingByEmail = await prisma.user.findUnique({ where: { email } });
  if (existingByEmail) {
    // Promote to admin and reset password
    await prisma.user.update({
      where: { email },
      data: { role: Role.ADMIN, password: hashedPassword, name },
    });
    console.log(`Admin promoted from existing user: ${email}`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });
  console.log(`Admin user created: ${email}`);
}

