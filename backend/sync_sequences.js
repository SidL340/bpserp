const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function syncSequences(prismaClient = p) {
  const tables = [
    'School', 'AcademicYear', 'FinancialYear', 'User', 'Teacher', 'Student',
    'Class', 'ClassEnrollment', 'Subject', 'ClassSubject', 'TeacherSubject',
    'FeeHead', 'ClassFeeStructure', 'StudentFeeDue', 'FeeCollection',
    'IncomeCategory', 'IncomeHead', 'IncomeEntry', 'ExpenseCategory',
    'ExpenseHead', 'ExpenseEntry', 'SalaryScale', 'Payroll', 'Attendance',
    'Exam', 'ExamClass', 'ExamSubject', 'MarkTitle', 'MarkEntry', 'Book',
    'LibraryIssue', 'InventoryCategory', 'InventoryItem', 'Notice',
    'Certificate', 'BankAccount', 'Event', 'Party', 'PasswordResetRequest'
  ];

  for (const t of tables) {
    try {
      const maxR = await prismaClient.$queryRawUnsafe(`SELECT COALESCE(MAX(id), 0) as m FROM "${t}";`);
      const maxId = Number(maxR[0]?.m || 0);
      const nextVal = maxId + 1;
      const seqR = await prismaClient.$queryRawUnsafe(`SELECT pg_get_serial_sequence('"${t}"', 'id') as s;`);
      const seqName = seqR[0]?.s;
      if (seqName) {
        await prismaClient.$queryRawUnsafe(`SELECT setval('${seqName}', ${nextVal}, false);`);
        console.log(`Synced ${t} (max: ${maxId}) -> sequence set to ${nextVal}`);
      }
    } catch (e) {
      // ignore
    }
  }
}

if (require.main === module) {
  syncSequences()
    .then(() => {
      console.log('All PostgreSQL sequences synced!');
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = syncSequences;
