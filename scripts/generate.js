const { execSync } = require('child_process');

process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./prisma/dev.db';

try {
  console.log('Generating Prisma Client...');
  execSync('npx --package=prisma prisma generate', { stdio: 'inherit', env: process.env });
  console.log('Prisma Client generated successfully.');
} catch (err) {
  console.error('Error generating Prisma client:', err.message);
  process.exit(1);
}
