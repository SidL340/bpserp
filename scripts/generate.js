const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');
const targetProvider = isPostgres ? 'postgresql' : 'sqlite';

const schemaPath = path.resolve(__dirname, '../backend/prisma/schema.prisma');
if (fs.existsSync(schemaPath)) {
  let schema = fs.readFileSync(schemaPath, 'utf8');
  const currentProviderMatch = schema.match(/datasource\s+db\s*\{[\s\S]*?provider\s*=\s*"(sqlite|postgresql)"/);
  if (currentProviderMatch && !currentProviderMatch[0].includes(`"${targetProvider}"`)) {
    console.log(`Switching Prisma schema provider to ${targetProvider}...`);
    schema = schema.replace(/(datasource\s+db\s*\{[\s\S]*?provider\s*=\s*)"(sqlite|postgresql)"/, `$1"${targetProvider}"`);
    fs.writeFileSync(schemaPath, schema, 'utf8');
  }
}

try {
  console.log(`Generating Prisma Client (provider: ${targetProvider})...`);
  execSync('npx --package=prisma prisma generate', { stdio: 'inherit', env: process.env });
  console.log('Prisma Client generated successfully.');

  if (isPostgres) {
    console.log('Synchronizing schema with PostgreSQL database...');
    try {
      execSync('npx --package=prisma prisma db push --skip-generate --accept-data-loss', { stdio: 'inherit', env: process.env });
      console.log('PostgreSQL database tables synchronized successfully.');
    } catch (pushErr) {
      console.warn('Notice: db push skipped or failed during build (will retry at runtime):', pushErr.message);
    }
  }
} catch (err) {
  console.error('Error generating Prisma client:', err.message);
  process.exit(1);
}
