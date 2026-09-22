require('dotenv').config();

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === '') {
  process.env.DATABASE_URL = 'file:./prisma/dev.db';
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const app = express();

// ── MIDDLEWARE ─────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// ── STATIC UPLOADS ─────────────────────────────────────────────────────────
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(path.resolve(uploadDir)));

// ── ROUTES ─────────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/school',     require('./routes/school'));
app.use('/api/students',   require('./routes/students'));
app.use('/api/teachers',   require('./routes/teachers'));
app.use('/api/classes',    require('./routes/classes'));
app.use('/api/income',     require('./routes/income'));
app.use('/api/expense',    require('./routes/expense'));
app.use('/api/payroll',    require('./routes/payroll'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/exams',      require('./routes/exams'));
app.use('/api/library',    require('./routes/library'));
app.use('/api/inventory',  require('./routes/inventory'));
app.use('/api/notices',    require('./routes/notices'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/events',     require('./routes/events'));
app.use('/api/parties',    require('./routes/parties'));
app.use('/api/financial-years', require('./routes/financialYears').router);
app.use('/api/public',         require('./routes/public'));
app.use('/api/admissions',     require('./routes/admissions'));

// ── ROOT & HEALTH CHECK ─────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'BPS School ERP API Server',
    school: 'Brindawan Public School',
    health: '/api/health',
    endpoints: '/api/public/site',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api', (req, res) => {
  res.json({ status: 'OK', message: 'BPS School ERP API Gateway' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), service: 'BPS School ERP API' });
});

// ── 404 ───────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// ── ERROR HANDLER ─────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error.', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n🏫 BPS School ERP Server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);

  try {
    const prisma = require('./lib/prisma');
    const bcrypt = require('bcryptjs');
    const syncSequences = require('../sync_sequences');

    // Ensure PostgreSQL sequences are synchronized before startup operations
    if (process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('postgres') || process.env.DATABASE_URL.includes('prisma.io'))) {
      await syncSequences(prisma).catch(() => {});
    }

    // Ensure school profile exists & updated for Brindawan Public School (Private)
    await prisma.school.upsert({
      where: { id: 1 },
      update: {
        name: 'Brindawan Public School',
        nameNepali: 'बृन्दावन पब्लिक स्कूल',
        address: 'Brindaban Municipality-02, Rautahat, Madhesh Province, Nepal',
        district: 'Rautahat',
        province: 'Madhesh Province',
        emisCode: 'BPS-320160',
        phone: '+977 9800000000',
        email: 'info@bps.edu.np',
        level: 'Primary & Pre-Primary (PG to Class 5)',
        type: 'Private',
        estYear: '2075',
        principalName: 'Principal',
        heroTagline: 'Empowering Young Learners with Excellence, Discipline & Moral Character',
        vision: 'To provide high-quality, inclusive, child-centered education with modern 21st-century foundation.',
        mission: 'Nurture curiosity, creativity, and foundational mastery from Playgroup through primary schooling.',
        aboutText: 'Brindawan Public School is a leading private educational institution in Brindaban, Rautahat, committed to delivering exceptional academic standards and character formation in a caring, modern environment.',
      },
      create: {
        name: 'Brindawan Public School',
        nameNepali: 'बृन्दावन पब्लिक स्कूल',
        address: 'Brindaban Municipality-02, Rautahat, Madhesh Province, Nepal',
        district: 'Rautahat',
        province: 'Madhesh Province',
        emisCode: 'BPS-320160',
        phone: '+977 9800000000',
        email: 'info@bps.edu.np',
        level: 'Primary & Pre-Primary (PG to Class 5)',
        type: 'Private',
        estYear: '2075',
        principalName: 'Principal',
        heroTagline: 'Empowering Young Learners with Excellence, Discipline & Moral Character',
        vision: 'To provide high-quality, inclusive, child-centered education with modern 21st-century foundation.',
        mission: 'Nurture curiosity, creativity, and foundational mastery from Playgroup through primary schooling.',
        aboutText: 'Brindawan Public School is a leading private educational institution in Brindaban, Rautahat, committed to delivering exceptional academic standards and character formation in a caring, modern environment.',
      },
    });

    // Deduplicate Academic Years and ensure active 2083-84 (2026 AD) exists
    try {
      const allYears = await prisma.academicYear.findMany({ orderBy: { id: 'asc' } });
      const seen = new Map();
      const toDelete = [];

      for (const yr of allYears) {
        const normalized = (yr.year || '').trim();
        if (!seen.has(normalized)) {
          seen.set(normalized, yr);
        } else {
          const primary = seen.get(normalized);
          const duplicateId = yr.id;
          await prisma.expenseEntry.updateMany({ where: { academicYearId: duplicateId }, data: { academicYearId: primary.id } }).catch(() => {});
          await prisma.incomeEntry.updateMany({ where: { academicYearId: duplicateId }, data: { academicYearId: primary.id } }).catch(() => {});
          await prisma.classEnrollment.updateMany({ where: { academicYearId: duplicateId }, data: { academicYearId: primary.id } }).catch(() => {});
          await prisma.class.updateMany({ where: { academicYearId: duplicateId }, data: { academicYearId: primary.id } }).catch(() => {});
          await prisma.exam.updateMany({ where: { academicYearId: duplicateId }, data: { academicYearId: primary.id } }).catch(() => {});
          await prisma.payroll.updateMany({ where: { academicYearId: duplicateId }, data: { academicYearId: primary.id } }).catch(() => {});
          toDelete.push(duplicateId);
        }
      }

      if (toDelete.length > 0) {
        await prisma.academicYear.deleteMany({ where: { id: { in: toDelete } } });
        console.log(`🧹 Cleaned up ${toDelete.length} duplicate academic years.`);
      }

      // Ensure active 2083-84 exists
      let active2083 = await prisma.academicYear.findFirst({ where: { year: { in: ['2083-84', '2083/84', '2083'] } } });
      if (!active2083) {
        active2083 = await prisma.academicYear.create({
          data: {
            year: '2083-84',
            startDateBs: '2083-01-01',
            endDateBs: '2083-12-30',
            isActive: true,
          },
        });
      }

      // Ensure 2083-84 is marked as isActive
      const currentActive = await prisma.academicYear.findFirst({ where: { isActive: true } });
      if (!currentActive || currentActive.year !== '2083-84') {
        await prisma.academicYear.updateMany({ data: { isActive: false } });
        await prisma.academicYear.update({
          where: { id: active2083.id },
          data: { isActive: true },
        });
      }

      // Ensure standard past fiscal / academic years exist for accounting records
      const standardYears = [
        { year: '2083-84', startDateBs: '2083-01-01', endDateBs: '2083-12-30' },
        { year: '2082-83', startDateBs: '2082-01-01', endDateBs: '2082-12-30' },
        { year: '2081-82', startDateBs: '2081-01-01', endDateBs: '2081-12-30' },
        { year: '2080-81', startDateBs: '2080-01-01', endDateBs: '2080-12-30' },
        { year: '2079-80', startDateBs: '2079-01-01', endDateBs: '2079-12-30' },
      ];

      for (const sy of standardYears) {
        const existing = await prisma.academicYear.findFirst({ where: { year: sy.year } });
        if (!existing) {
          await prisma.academicYear.create({
            data: {
              year: sy.year,
              startDateBs: sy.startDateBs,
              endDateBs: sy.endDateBs,
              isActive: sy.year === '2083-84',
            },
          });
        }
      }

      // ── SEED DEDICATED FINANCIAL YEARS (साउन १ – असार ३१/३२) ─────────────────
      const { getFiscalYearFromBS } = require('./routes/financialYears');
      const standardFiscalYears = [
        { year: '2083/84', startDateBs: '2083-04-01', endDateBs: '2084-03-32', isActive: true },
        { year: '2082/83', startDateBs: '2082-04-01', endDateBs: '2083-03-32', isActive: false },
        { year: '2081/82', startDateBs: '2081-04-01', endDateBs: '2082-03-32', isActive: false },
        { year: '2080/81', startDateBs: '2080-04-01', endDateBs: '2081-03-32', isActive: false },
        { year: '2079/80', startDateBs: '2079-04-01', endDateBs: '2080-03-32', isActive: false },
      ];

      for (const sfy of standardFiscalYears) {
        const existingFy = await prisma.financialYear.findFirst({
          where: { year: { in: [sfy.year, sfy.year.replace('/', '-')] } }
        });
        if (!existingFy) {
          await prisma.financialYear.create({
            data: {
              year: sfy.year,
              startDateBs: sfy.startDateBs,
              endDateBs: sfy.endDateBs,
              isActive: sfy.isActive,
            }
          });
        } else {
          // Keep start and end dates accurate
          await prisma.financialYear.update({
            where: { id: existingFy.id },
            data: {
              startDateBs: sfy.startDateBs,
              endDateBs: sfy.endDateBs,
            }
          });
        }
      }

      // Ensure 2083/84 is marked active if no active FY
      const activeFy = await prisma.financialYear.findFirst({ where: { isActive: true } });
      if (!activeFy) {
        const fy2083 = await prisma.financialYear.findFirst({ where: { year: { contains: '2083' } } });
        if (fy2083) {
          await prisma.financialYear.update({ where: { id: fy2083.id }, data: { isActive: true } });
        }
      }

      // Auto-backfill and re-assign all accounting records strictly by BS date
      const allFiscalYears = await prisma.financialYear.findMany();
      const fyMapByYear = new Map();
      allFiscalYears.forEach(fy => {
        fyMapByYear.set(fy.year, fy);
        fyMapByYear.set(fy.year.replace('/', '-'), fy);
      });

      // 1. Backfill Expenses
      const allExpenses = await prisma.expenseEntry.findMany({ select: { id: true, expenseDateBs: true, financialYearId: true } });
      for (const exp of allExpenses) {
        if (exp.expenseDateBs) {
          const derived = getFiscalYearFromBS(exp.expenseDateBs);
          const targetFy = fyMapByYear.get(derived) || allFiscalYears.find(f => exp.expenseDateBs >= f.startDateBs && exp.expenseDateBs <= f.endDateBs);
          if (targetFy && exp.financialYearId !== targetFy.id) {
            await prisma.expenseEntry.update({
              where: { id: exp.id },
              data: { financialYearId: targetFy.id }
            }).catch(() => {});
          }
        }
      }

      // 2. Backfill Incomes
      const allIncomes = await prisma.incomeEntry.findMany({ select: { id: true, receivedDateBs: true, financialYearId: true } });
      for (const inc of allIncomes) {
        if (inc.receivedDateBs) {
          const derived = getFiscalYearFromBS(inc.receivedDateBs);
          const targetFy = fyMapByYear.get(derived) || allFiscalYears.find(f => inc.receivedDateBs >= f.startDateBs && inc.receivedDateBs <= f.endDateBs);
          if (targetFy && inc.financialYearId !== targetFy.id) {
            await prisma.incomeEntry.update({
              where: { id: inc.id },
              data: { financialYearId: targetFy.id }
            }).catch(() => {});
          }
        }
      }

      // 3. Backfill Fee Collections
      const allFees = await prisma.feeCollection.findMany({ select: { id: true, paidDateBs: true, financialYearId: true } });
      for (const fee of allFees) {
        if (fee.paidDateBs) {
          const derived = getFiscalYearFromBS(fee.paidDateBs);
          const targetFy = fyMapByYear.get(derived) || allFiscalYears.find(f => fee.paidDateBs >= f.startDateBs && fee.paidDateBs <= f.endDateBs);
          if (targetFy && fee.financialYearId !== targetFy.id) {
            await prisma.feeCollection.update({
              where: { id: fee.id },
              data: { financialYearId: targetFy.id }
            }).catch(() => {});
          }
        }
      }

      // 4. Backfill Payrolls
      const allPayrolls = await prisma.payroll.findMany({ select: { id: true, monthFrom: true, financialYearId: true } });
      for (const pay of allPayrolls) {
        if (pay.monthFrom) {
          const dateBs = pay.monthFrom.includes('-') && pay.monthFrom.split('-').length === 2 ? `${pay.monthFrom}-15` : pay.monthFrom;
          const derived = getFiscalYearFromBS(dateBs);
          const targetFy = fyMapByYear.get(derived) || allFiscalYears.find(f => dateBs >= f.startDateBs && dateBs <= f.endDateBs);
          if (targetFy && pay.financialYearId !== targetFy.id) {
            await prisma.payroll.update({
              where: { id: pay.id },
              data: { financialYearId: targetFy.id }
            }).catch(() => {});
          }
        }
      }
      console.log('✅ Financial Year auto-backfill completed for all accounting records.');
    } catch (yrErr) {
      console.error('Academic/Financial year verification error:', yrErr.message);
    }

    // Ensure super admin user exists
    try {
      const adminHash = await bcrypt.hash('Admin@2083', 12);
      const u1 = await prisma.user.findFirst({ where: { username: 'admin@bps.edu.np' } });
      if (u1) {
        await prisma.user.update({ where: { id: u1.id }, data: { passwordHash: adminHash, isActive: true } });
      } else {
        await prisma.user.create({ data: { username: 'admin@bps.edu.np', passwordHash: adminHash, role: 'SUPER_ADMIN' } });
      }
      const u2 = await prisma.user.findFirst({ where: { username: 'admin' } });
      if (u2) {
        await prisma.user.update({ where: { id: u2.id }, data: { passwordHash: adminHash, isActive: true } });
      } else {
        await prisma.user.create({ data: { username: 'admin', passwordHash: adminHash, role: 'SUPER_ADMIN' } });
      }
      console.log('✅ Auto-seed verified: Super Admin ready (admin@bps.edu.np / Admin@2083)');
    } catch (uErr) {
      console.log('Admin user verified.');
    }

    // Synchronize PostgreSQL auto-increment sequences safely on startup (if on PostgreSQL)
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgres')) {
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
        console.log('✅ PostgreSQL auto-increment sequences verified & synchronized.');
      } catch (_) {}
    }

    // Initialize Automatic Daily Backup Scheduler
    const { initBackupScheduler } = require('./lib/backupScheduler');
    initBackupScheduler();
  } catch (err) {
    console.error('⚠️ Auto-seed notice:', err.message);
  }
});

module.exports = app;
