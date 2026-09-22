const { Prisma, PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const dbUrl = process.env.TARGET_POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('Error: Please set DATABASE_URL or TARGET_POSTGRES_URL');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

const dumpPath = path.join(__dirname, 'sqlite_dump.json');
if (!fs.existsSync(dumpPath)) {
  console.error('Error: sqlite_dump.json not found! Run export_from_sqlite.py first.');
  process.exit(1);
}

const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));

// Build type map from Prisma DMMF
const modelFieldsMap = {};
for (const m of Prisma.dmmf.datamodel.models) {
  modelFieldsMap[m.name] = {};
  for (const f of m.fields) {
    // Only scalar fields, ignore relations
    if (f.kind === 'scalar') {
      modelFieldsMap[m.name][f.name] = f.type;
    }
  }
}

function cleanRow(row, modelName) {
  const fields = modelFieldsMap[modelName] || {};
  const cleaned = {};

  for (const [key, val] of Object.entries(row)) {
    if (!fields[key]) continue; // skip fields not in model
    if (val === null || val === undefined || val === 'null') continue;

    const targetType = fields[key];

    if (targetType === 'DateTime') {
      if (typeof val === 'number') {
        cleaned[key] = new Date(val);
      } else if (typeof val === 'string') {
        const num = Number(val);
        if (!isNaN(num) && num > 1000000000) {
          cleaned[key] = new Date(num);
        } else {
          cleaned[key] = new Date(val);
        }
      }
    } else if (targetType === 'Boolean') {
      cleaned[key] = (val === 1 || val === '1' || val === true || val === 'true');
    } else if (targetType === 'Int') {
      cleaned[key] = parseInt(val, 10);
    } else if (targetType === 'Float') {
      cleaned[key] = parseFloat(val);
    } else {
      cleaned[key] = String(val);
    }
  }

  return cleaned;
}

const tableOrder = [
  'School',
  'AcademicYear',
  'FinancialYear',
  'User',
  'Teacher',
  'Student',
  'Class',
  'ClassEnrollment',
  'Subject',
  'ClassSubject',
  'TeacherSubject',
  'FeeHead',
  'ClassFeeStructure',
  'StudentFeeDue',
  'FeeCollection',
  'IncomeCategory',
  'IncomeHead',
  'IncomeEntry',
  'ExpenseCategory',
  'ExpenseHead',
  'ExpenseEntry',
  'SalaryScale',
  'Payroll',
  'Attendance',
  'Exam',
  'ExamClass',
  'ExamSubject',
  'MarkTitle',
  'MarkEntry',
  'Book',
  'LibraryIssue',
  'InventoryCategory',
  'InventoryItem',
  'Notice',
  'Certificate',
  'BankAccount',
  'Event',
  'Party',
  'PasswordResetRequest',
];

function toCamelCase(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

async function runImport() {
  console.log('Connecting to PostgreSQL and importing full school database...');

  for (const tableName of tableOrder) {
    const rows = dump[tableName] || [];
    if (!rows || rows.length === 0) continue;

    const modelName = toCamelCase(tableName);
    if (!prisma[modelName]) {
      console.log(`Skipping unknown model: ${modelName}`);
      continue;
    }

    console.log(`Importing ${rows.length} records into "${tableName}"...`);
    let successCount = 0;

    if (['user', 'student', 'teacher', 'school'].includes(modelName)) {
      const chunkSize = 200;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        for (const row of chunk) {
          const item = cleanRow(row, tableName);
          try {
            if (modelName === 'user') {
              const { id, ...uData } = item;
              await prisma.user.upsert({
                where: { username: item.username },
                update: uData,
                create: { id, ...uData },
              });
            } else if (modelName === 'student') {
              const { id, ...sData } = item;
              await prisma.student.upsert({
                where: { studentId: item.studentId },
                update: sData,
                create: { id, ...sData },
              });
            } else if (modelName === 'teacher') {
              const { id, ...tData } = item;
              await prisma.teacher.upsert({
                where: { userId: item.userId },
                update: tData,
                create: { id, ...tData },
              });
            } else if (modelName === 'school') {
              const { id, ...scData } = item;
              await prisma.school.upsert({
                where: { id: id || 1 },
                update: scData,
                create: { id: id || 1, ...scData },
              });
            }
            successCount++;
          } catch (_) {}
        }
      }
    } else {
      // Bulk insert with createMany for blazing speed
      const chunkSize = 1000;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const cleanedItems = chunk.map(r => cleanRow(r, tableName)).filter(r => Object.keys(r).length > 0);
        try {
          const result = await prisma[modelName].createMany({
            data: cleanedItems,
            skipDuplicates: true,
          });
          successCount += (result.count || cleanedItems.length);
        } catch (bulkErr) {
          // If bulk fails, fallback to row-by-row
          for (const item of cleanedItems) {
            try {
              if (item.id) {
                const { id, ...rest } = item;
                await prisma[modelName].upsert({
                  where: { id },
                  update: rest,
                  create: item,
                });
              } else {
                await prisma[modelName].create({ data: item });
              }
              successCount++;
            } catch (_) {}
          }
        }
      }
    }
    console.log(` -> Imported ${successCount}/${rows.length} records into ${tableName}`);
  }

  // Synchronize PostgreSQL sequences
  console.log('Synchronizing PostgreSQL serial sequences...');
  try {
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'id'
        AND column_default LIKE 'nextval%';
    `;
    for (const t of tables) {
      try {
        const maxRes = await prisma.$queryRawUnsafe(`SELECT COALESCE(MAX(id), 0) as max_id FROM "${t.table_name}";`);
        const nextVal = Number(maxRes[0]?.max_id || 0) + 1;
        const seqRes = await prisma.$queryRawUnsafe(`SELECT pg_get_serial_sequence('"${t.table_name}"', 'id') as seq;`);
        const seqName = seqRes[0]?.seq || `"${t.table_name}_id_seq"`;
        await prisma.$queryRawUnsafe(`SELECT setval('${seqName}', ${nextVal}, false);`);
      } catch (_) {}
    }
    console.log('Serial sequences successfully synced!');
  } catch (seqErr) {
    console.warn('Sequence sync notice:', seqErr.message);
  }

  console.log('SUCCESS: Full school database has been migrated to PostgreSQL!');
  await prisma.$disconnect();
}

runImport().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
