const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Brindawan Public School ERP database...');

  // ── 1. School Profile ────────────────────────────────────────────────────
  const school = await prisma.school.upsert({
    where: { id: 1 },
    update: {
      name: 'Brindawan Public School',
      nameNepali: 'बृन्दावन पब्लिक स्कूल',
      address: 'Brindaban Municipality-02, Rautahat, Madhesh Province, Nepal',
      district: 'Rautahat',
      province: 'Madhesh Province',
      emisCode: 'BPS-320160',
      phone: '+977 9845000000',
      email: 'info@bps.edu.np',
      website: 'https://bps.edu.np',
      level: 'Primary & Pre-Primary (PG to Class 5)',
      type: 'Private',
      estYear: '2075',
      principalName: 'Premlal Prasad Raut',
      smsEnabled: true,
      heroTagline: 'Nurturing Young Minds · Inspiring Excellence · Building Strong Character',
      vision: 'To deliver high-quality, inclusive, and child-centered holistic education from early childhood through primary schooling.',
      mission: 'Empower students in Rautahat with 21st-century foundational skills, moral values, digital literacy, and active learning.',
      aboutText: 'Brindawan Public School is an esteemed private English-medium school located in Brindaban-02, Rautahat, Nepal. Offering specialized child development programs from Play Group to Class 5 and beyond, we focus on individualized attention, modern teaching aids, and strong moral character.',
    },
    create: {
      id: 1,
      name: 'Brindawan Public School',
      nameNepali: 'बृन्दावन पब्लिक स्कूल',
      address: 'Brindaban Municipality-02, Rautahat, Madhesh Province, Nepal',
      district: 'Rautahat',
      province: 'Madhesh Province',
      emisCode: 'BPS-320160',
      phone: '+977 9845000000',
      email: 'info@bps.edu.np',
      website: 'https://bps.edu.np',
      level: 'Primary & Pre-Primary (PG to Class 5)',
      type: 'Private',
      estYear: '2075',
      principalName: 'Premlal Prasad Raut',
      smsEnabled: true,
      heroTagline: 'Nurturing Young Minds · Inspiring Excellence · Building Strong Character',
      vision: 'To deliver high-quality, inclusive, and child-centered holistic education from early childhood through primary schooling.',
      mission: 'Empower students in Rautahat with 21st-century foundational skills, moral values, digital literacy, and active learning.',
      aboutText: 'Brindawan Public School is an esteemed private English-medium school located in Brindaban-02, Rautahat, Nepal. Offering specialized child development programs from Play Group to Class 5 and beyond, we focus on individualized attention, modern teaching aids, and strong moral character.',
    },
  });
  console.log('✅ School Profile seeded:', school.name);

  // ── 2. Academic Years ───────────────────────────────────────────────────
  await prisma.academicYear.updateMany({ data: { isActive: false } });
  const year2083 = await prisma.academicYear.upsert({
    where: { id: 1 },
    update: { year: '2083-84', startDateBs: '2083-01-01', endDateBs: '2083-12-30', isActive: true },
    create: { id: 1, year: '2083-84', startDateBs: '2083-01-01', endDateBs: '2083-12-30', isActive: true },
  });
  console.log('✅ Academic Year seeded: 2083-84 (Active)');

  // ── 3. Dedicated Financial Years (साउन १ – असार ३१) ─────────────────────
  await prisma.financialYear.upsert({
    where: { id: 1 },
    update: { year: '2083/84', startDateBs: '2083-04-01', endDateBs: '2084-03-32', isActive: true },
    create: { id: 1, year: '2083/84', startDateBs: '2083-04-01', endDateBs: '2084-03-32', isActive: true },
  });
  console.log('✅ Financial Year seeded: 2083/84 (Active)');

  // ── 4. Bank Account ─────────────────────────────────────────────────────
  await prisma.bankAccount.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      bankName: 'Nepal Bank Limited',
      accountName: 'Brindawan Public School Operating A/C',
      accountNo: '04200100009988',
      branch: 'Brindaban / Garuda Branch',
      type: 'Current',
      isActive: true,
    },
  });
  console.log('✅ School Bank Account seeded');

  // ── 5. System Users (Multi-Role) ────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@2083', 10);
  const teacherHash = await bcrypt.hash('Teacher@2083', 10);
  const accHash = await bcrypt.hash('Accountant@2083', 10);
  const libHash = await bcrypt.hash('Librarian@2083', 10);

  // Admin users
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: adminHash, isActive: true, role: 'SUPER_ADMIN' },
    create: { username: 'admin', passwordHash: adminHash, role: 'SUPER_ADMIN', isActive: true },
  });
  await prisma.user.upsert({
    where: { username: 'admin@bps.edu.np' },
    update: { passwordHash: adminHash, isActive: true, role: 'SUPER_ADMIN' },
    create: { username: 'admin@bps.edu.np', passwordHash: adminHash, role: 'SUPER_ADMIN', isActive: true },
  });

  // Accountant user
  await prisma.user.upsert({
    where: { username: 'accountant' },
    update: { passwordHash: accHash, isActive: true, role: 'ACCOUNTANT' },
    create: { username: 'accountant', passwordHash: accHash, role: 'ACCOUNTANT', isActive: true },
  });

  // Librarian user
  await prisma.user.upsert({
    where: { username: 'librarian' },
    update: { passwordHash: libHash, isActive: true, role: 'LIBRARIAN' },
    create: { username: 'librarian', passwordHash: libHash, role: 'LIBRARIAN', isActive: true },
  });

  // Principal / Teacher user
  const principalUser = await prisma.user.upsert({
    where: { username: 'principal' },
    update: { passwordHash: teacherHash, isActive: true, role: 'TEACHER' },
    create: { username: 'principal', passwordHash: teacherHash, role: 'TEACHER', isActive: true },
  });

  const principalTeacher = await prisma.teacher.upsert({
    where: { userId: principalUser.id },
    update: {},
    create: {
      userId: principalUser.id,
      fullName: 'Premlal Prasad Raut',
      fullNameNepali: 'प्रेमलाल प्रसाद राउत',
      gender: 'Male',
      post: 'Principal / Senior Teacher',
      type: 'NIJI_SROTH',
      phone: '9845012345',
      email: 'principal@bps.edu.np',
      bankName: 'Nepal Bank Limited',
      bankAccountNo: '04200109988112',
      panNo: '600123456',
    },
  });

  // Ram Kumar Sharma (Teacher)
  const ramUser = await prisma.user.upsert({
    where: { username: 'ram.sharma' },
    update: { passwordHash: teacherHash, isActive: true, role: 'TEACHER' },
    create: { username: 'ram.sharma', passwordHash: teacherHash, role: 'TEACHER', isActive: true },
  });

  const ramTeacher = await prisma.teacher.upsert({
    where: { userId: ramUser.id },
    update: {},
    create: {
      userId: ramUser.id,
      fullName: 'Ram Kumar Sharma',
      fullNameNepali: 'राम कुमार शर्मा',
      gender: 'Male',
      post: 'Primary Level Subject Teacher',
      type: 'NIJI_SROTH',
      phone: '9845023456',
      email: 'ram.sharma@bps.edu.np',
      bankName: 'Global IME Bank',
      bankAccountNo: '11200100456789',
      panNo: '600234567',
    },
  });

  // Sita Kumari Dahal (Pre-Primary Teacher)
  const sitaUser = await prisma.user.upsert({
    where: { username: 'sita.dahal' },
    update: { passwordHash: teacherHash, isActive: true, role: 'TEACHER' },
    create: { username: 'sita.dahal', passwordHash: teacherHash, role: 'TEACHER', isActive: true },
  });

  const sitaTeacher = await prisma.teacher.upsert({
    where: { userId: sitaUser.id },
    update: {},
    create: {
      userId: sitaUser.id,
      fullName: 'Sita Kumari Dahal',
      fullNameNepali: 'सीता कुमारी दाहाल',
      gender: 'Female',
      post: 'Montessori / Pre-Primary In-Charge',
      type: 'NIJI_SROTH',
      phone: '9845034567',
      email: 'sita.dahal@bps.edu.np',
      bankName: 'NIC Asia Bank',
      bankAccountNo: '22300100789012',
      panNo: '600345678',
    },
  });
  console.log('✅ Users & Teachers seeded (Admin, Accountant, Librarian, Principal, Teachers)');

  // ── 6. Classes (Play Group, Nursery, LKG, UKG, Class 1 to 5) ─────────────
  // Explicitly requested private school classes: Play group, Nursery, LKG, KG/UKG, Class 1 to 5
  const classList = [
    { name: 'Play Group', nameNepali: 'प्ले ग्रुप (PG)', orderIndex: 1, teacherId: sitaTeacher.id },
    { name: 'Nursery',    nameNepali: 'नर्सरी (Nursery)', orderIndex: 2, teacherId: sitaTeacher.id },
    { name: 'LKG',        nameNepali: 'एल.के.जी. (LKG)',  orderIndex: 3, teacherId: sitaTeacher.id },
    { name: 'UKG',        nameNepali: 'यु.के.जी. (UKG)',  orderIndex: 4, teacherId: sitaTeacher.id },
    { name: 'Class 1',    nameNepali: 'कक्षा १',          orderIndex: 5, teacherId: ramTeacher.id },
    { name: 'Class 2',    nameNepali: 'कक्षा २',          orderIndex: 6, teacherId: ramTeacher.id },
    { name: 'Class 3',    nameNepali: 'कक्षा ३',          orderIndex: 7, teacherId: principalTeacher.id },
    { name: 'Class 4',    nameNepali: 'कक्षा ४',          orderIndex: 8, teacherId: principalTeacher.id },
    { name: 'Class 5',    nameNepali: 'कक्षा ५',          orderIndex: 9, teacherId: principalTeacher.id },
  ];

  const classMap = new Map();
  for (let i = 0; i < classList.length; i++) {
    const item = classList[i];
    const existing = await prisma.class.findFirst({
      where: { name: item.name, academicYearId: year2083.id },
    });
    let cObj;
    if (existing) {
      cObj = await prisma.class.update({
        where: { id: existing.id },
        data: {
          nameNepali: item.nameNepali,
          orderIndex: item.orderIndex,
          classTeacherId: item.teacherId,
        },
      });
    } else {
      cObj = await prisma.class.create({
        data: {
          name: item.name,
          nameNepali: item.nameNepali,
          section: 'A',
          academicYearId: year2083.id,
          orderIndex: item.orderIndex,
          classTeacherId: item.teacherId,
        },
      });
    }
    classMap.set(item.name, cObj.id);
  }
  console.log('✅ Private School Classes seeded: Play Group, Nursery, LKG, UKG, Class 1 to 5');

  // ── 7. Subjects ─────────────────────────────────────────────────────────
  const subjectsData = [
    { name: 'English', nameNepali: 'अंग्रेजी', code: 'ENG' },
    { name: 'Nepali', nameNepali: 'नेपाली', code: 'NEP' },
    { name: 'Mathematics', nameNepali: 'गणित', code: 'MAT' },
    { name: 'Science & Technology', nameNepali: 'विज्ञान तथा प्रविधि', code: 'SCI' },
    { name: 'Social Studies & Life Skills', nameNepali: 'सामाजिक अध्ययन तथा जीवनोपयोगी सीप', code: 'SOC' },
    { name: 'Computer Science', nameNepali: 'कम्प्युटर शिक्षा', code: 'COM' },
    { name: 'General Knowledge & Rhymes', nameNepali: 'सामान्य ज्ञान तथा बालगीत', code: 'GKR' },
    { name: 'Creative Arts & Drawing', nameNepali: 'सृजनात्मक कला तथा चित्रकला', code: 'ART' },
  ];

  const subjectMap = new Map();
  for (let i = 0; i < subjectsData.length; i++) {
    const s = subjectsData[i];
    const existing = await prisma.subject.findFirst({ where: { code: s.code } });
    let sObj;
    if (existing) {
      sObj = await prisma.subject.update({ where: { id: existing.id }, data: s });
    } else {
      sObj = await prisma.subject.create({ data: s });
    }
    subjectMap.set(s.code, sObj.id);
  }

  // Link subjects to Class 1
  const class1Id = classMap.get('Class 1');
  if (class1Id) {
    for (const sCode of ['ENG', 'NEP', 'MAT', 'SCI', 'SOC', 'COM']) {
      const sId = subjectMap.get(sCode);
      if (sId) {
        await prisma.classSubject.upsert({
          where: { classId_subjectId: { classId: class1Id, subjectId: sId } },
          update: {},
          create: { classId: class1Id, subjectId: sId, teacherId: ramTeacher.id },
        }).catch(() => {});
      }
    }
  }
  console.log('✅ Subjects seeded & mapped to classes');

  // ── 8. Private School Fee Heads (Tuition, Admission, ID Card, Tie & Belt, etc.)
  const feeHeadsList = [
    { name: 'Monthly Tuition Fee (मासिक शुल्क)', amount: 1200, isOptional: false },
    { name: 'Admission Fee (भर्ना शुल्क)', amount: 2000, isOptional: false },
    { name: 'Examination Fee (परीक्षा शुल्क)', amount: 600, isOptional: false },
    { name: 'Student ID Card (परिचय पत्र शुल्क)', amount: 150, isOptional: true },
    { name: 'School Tie & Belt (टाई तथा बेल्ट शुल्क)', amount: 250, isOptional: true },
    { name: 'School Uniform / Dress (विद्यालय पोशाक)', amount: 1600, isOptional: true },
    { name: 'Books & Stationery (किताब तथा कापी)', amount: 1800, isOptional: true },
    { name: 'Transportation / Van (यातायात शुल्क)', amount: 1000, isOptional: true },
    { name: 'Computer & Smart Lab (कम्प्युटर ल्याब शुल्क)', amount: 300, isOptional: false },
    { name: 'School Diary & Miscellaneous (डायरी तथा विविध शुल्क)', amount: 150, isOptional: true },
  ];

  const feeHeadMap = new Map();
  for (let i = 0; i < feeHeadsList.length; i++) {
    const fh = feeHeadsList[i];
    const existing = await prisma.feeHead.findFirst({ where: { name: fh.name } });
    let fObj;
    if (existing) {
      fObj = await prisma.feeHead.update({ where: { id: existing.id }, data: fh });
    } else {
      fObj = await prisma.feeHead.create({ data: fh });
    }
    feeHeadMap.set(fh.name, fObj.id);
  }
  console.log('✅ Private School Fee Heads seeded (Tuition, Admission, ID Card, Tie & Belt, etc.)');

  // ── 9. Income Categories & Heads ─────────────────────────────────────────
  const feeIncomeCat = await prisma.incomeCategory.upsert({
    where: { id: 1 },
    update: { name: 'Student Fee Income', nameNepali: 'विद्यार्थी शुल्क आम्दानी', type: 'STUDENT_FEE' },
    create: { id: 1, name: 'Student Fee Income', nameNepali: 'विद्यार्थी शुल्क आम्दानी', type: 'STUDENT_FEE' },
  });
  const outSourceCat = await prisma.incomeCategory.upsert({
    where: { id: 2 },
    update: { name: 'Out Source & Investments', nameNepali: 'बाह्य स्रोत तथा लगानी आम्दानी', type: 'OWN_SOURCE' },
    create: { id: 2, name: 'Out Source & Investments', nameNepali: 'बाह्य स्रोत तथा लगानी आम्दानी', type: 'OWN_SOURCE' },
  });

  await prisma.incomeHead.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, categoryId: feeIncomeCat.id, name: 'All Student Fee Collections' },
  });
  await prisma.incomeHead.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, categoryId: outSourceCat.id, name: 'School Investment & Fixed Deposit Interest' },
  });
  await prisma.incomeHead.upsert({
    where: { id: 3 },
    update: {},
    create: { id: 3, categoryId: outSourceCat.id, name: 'External Donations & Community Grants' },
  });
  console.log('✅ Income categories & heads seeded');

  // ── 10. Expense Categories & Heads ───────────────────────────────────────
  const salaryExpCat = await prisma.expenseCategory.upsert({
    where: { id: 1 },
    update: { name: 'Staff Salary & Payroll', nameNepali: 'कर्मचारी तथा शिक्षक तलब भत्ता' },
    create: { id: 1, name: 'Staff Salary & Payroll', nameNepali: 'कर्मचारी तथा शिक्षक तलब भत्ता' },
  });
  const opExpCat = await prisma.expenseCategory.upsert({
    where: { id: 2 },
    update: { name: 'Operational & Utility', nameNepali: 'सञ्चालन तथा प्रशासनिक खर्च' },
    create: { id: 2, name: 'Operational & Utility', nameNepali: 'सञ्चालन तथा प्रशासनिक खर्च' },
  });
  const actExpCat = await prisma.expenseCategory.upsert({
    where: { id: 3 },
    update: { name: 'Sports, ECA & Events', nameNepali: 'खेलकुद, अतिरिक्त क्रियाकलाप तथा कार्यक्रम' },
    create: { id: 3, name: 'Sports, ECA & Events', nameNepali: 'खेलकुद, अतिरिक्त क्रियाकलाप तथा कार्यक्रम' },
  });

  await prisma.expenseHead.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, categoryId: salaryExpCat.id, name: 'Monthly Teacher & Staff Salaries (बैंक खाता भुक्तानी)' },
  });
  await prisma.expenseHead.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, categoryId: opExpCat.id, name: 'Electricity, Water & Internet Bills' },
  });
  await prisma.expenseHead.upsert({
    where: { id: 3 },
    update: {},
    create: { id: 3, categoryId: opExpCat.id, name: 'School Van Fuel & Maintenance' },
  });
  await prisma.expenseHead.upsert({
    where: { id: 4 },
    update: {},
    create: { id: 4, categoryId: opExpCat.id, name: 'Stationery, Register & Printing Supplies' },
  });
  await prisma.expenseHead.upsert({
    where: { id: 5 },
    update: {},
    create: { id: 5, categoryId: actExpCat.id, name: 'Annual Sports Day & Prize Distribution' },
  });
  console.log('✅ Expense categories & heads seeded');

  // ── 11. Sample Students (EMIS Format Demo) ──────────────────────────────
  const studentDefaultHash = await bcrypt.hash('Student@2081', 10);
  const sampleStudents = [
    {
      studentId: '320160001',
      fullName: 'Aayush Shrestha',
      fullNameNepali: 'आयुष श्रेष्ठ',
      gender: 'Male',
      fatherName: 'Bikash Shrestha',
      motherName: 'Sunita Shrestha',
      guardianName: 'Bikash Shrestha',
      guardianContact: '9845111111',
      address: 'Brindaban Municipality-02, Rautahat',
      dateOfBirthBs: '2075-02-15',
      className: 'Class 1',
      rollNo: 1,
    },
    {
      studentId: '320160002',
      fullName: 'Smarika Dahal',
      fullNameNepali: 'स्मारिका दाहाल',
      gender: 'Female',
      fatherName: 'Gopal Dahal',
      motherName: 'Radha Dahal',
      guardianName: 'Gopal Dahal',
      guardianContact: '9845222222',
      address: 'Brindaban Municipality-01, Rautahat',
      dateOfBirthBs: '2075-06-20',
      className: 'Class 1',
      rollNo: 2,
    },
    {
      studentId: '320160003',
      fullName: 'Rohan Kumar Raut',
      fullNameNepali: 'रोहन कुमार राउत',
      gender: 'Male',
      fatherName: 'Rajesh Raut',
      motherName: 'Mina Devi Raut',
      guardianName: 'Rajesh Raut',
      guardianContact: '9845333333',
      address: 'Brindaban Municipality-02, Rautahat',
      dateOfBirthBs: '2076-08-10',
      className: 'UKG',
      rollNo: 1,
    },
    {
      studentId: '320160004',
      fullName: 'Ananya Patel',
      fullNameNepali: 'अनन्या पटेल',
      gender: 'Female',
      fatherName: 'Dharmendra Patel',
      motherName: 'Punam Patel',
      guardianName: 'Dharmendra Patel',
      guardianContact: '9845444444',
      address: 'Brindaban Municipality-03, Rautahat',
      dateOfBirthBs: '2077-04-12',
      className: 'LKG',
      rollNo: 1,
    },
  ];

  for (const s of sampleStudents) {
    const sUser = await prisma.user.upsert({
      where: { username: s.studentId },
      update: { passwordHash: studentDefaultHash, isActive: true, role: 'STUDENT' },
      create: { username: s.studentId, passwordHash: studentDefaultHash, role: 'STUDENT', isActive: true },
    });

    const studentRecord = await prisma.student.upsert({
      where: { studentId: s.studentId },
      update: {
        fullName: s.fullName,
        fullNameNepali: s.fullNameNepali,
        fatherName: s.fatherName,
        motherName: s.motherName,
        guardianName: s.guardianName,
        guardianContact: s.guardianContact,
        address: s.address,
        dateOfBirthBs: s.dateOfBirthBs,
        gender: s.gender,
        emisId: s.studentId,
      },
      create: {
        userId: sUser.id,
        studentId: s.studentId,
        fullName: s.fullName,
        fullNameNepali: s.fullNameNepali,
        fatherName: s.fatherName,
        motherName: s.motherName,
        guardianName: s.guardianName,
        guardianContact: s.guardianContact,
        address: s.address,
        dateOfBirthBs: s.dateOfBirthBs,
        gender: s.gender,
        emisId: s.studentId,
      },
    });

    const targetClassId = classMap.get(s.className);
    if (targetClassId) {
      await prisma.classEnrollment.upsert({
        where: { studentId_classId: { studentId: studentRecord.id, classId: targetClassId } },
        update: { rollNo: s.rollNo, isActive: true },
        create: {
          studentId: studentRecord.id,
          classId: targetClassId,
          rollNo: s.rollNo,
          isActive: true,
        },
      });
    }

    // Seed sample paid fee receipt for Aayush Shrestha (ID Card + Tie Belt + Tuition)
    if (s.studentId === '320160001') {
      const tuitionHeadId = feeHeadMap.get('Monthly Tuition Fee (मासिक शुल्क)');
      const idCardHeadId = feeHeadMap.get('Student ID Card (परिचय पत्र शुल्क)');
      const tieBeltHeadId = feeHeadMap.get('School Tie & Belt (टाई तथा बेल्ट शुल्क)');

      if (idCardHeadId) {
        await prisma.feeCollection.upsert({
          where: { receiptNo: 'BPS-RCP-2083-0001' },
          update: {},
          create: {
            studentId: studentRecord.id,
            feeHeadId: idCardHeadId,
            academicYearId: year2083.id,
            amount: 150,
            paidDateBs: '2083-01-15',
            paidDateAd: new Date('2026-04-28'),
            receiptNo: 'BPS-RCP-2083-0001',
            collectedBy: 'Accountant',
            paymentMedium: 'CASH',
            remarks: 'Student ID Card fee paid in cash',
          },
        }).catch(() => {});
      }

      if (tieBeltHeadId) {
        await prisma.feeCollection.upsert({
          where: { receiptNo: 'BPS-RCP-2083-0002' },
          update: {},
          create: {
            studentId: studentRecord.id,
            feeHeadId: tieBeltHeadId,
            academicYearId: year2083.id,
            amount: 250,
            paidDateBs: '2083-01-15',
            paidDateAd: new Date('2026-04-28'),
            receiptNo: 'BPS-RCP-2083-0002',
            collectedBy: 'Accountant',
            paymentMedium: 'CASH',
            remarks: 'School Tie and Belt package issued',
          },
        }).catch(() => {});
      }

      if (tuitionHeadId) {
        await prisma.feeCollection.upsert({
          where: { receiptNo: 'BPS-RCP-2083-0003' },
          update: {},
          create: {
            studentId: studentRecord.id,
            feeHeadId: tuitionHeadId,
            academicYearId: year2083.id,
            amount: 1200,
            paidDateBs: '2083-02-05',
            paidDateAd: new Date('2026-05-18'),
            receiptNo: 'BPS-RCP-2083-0003',
            collectedBy: 'Accountant',
            paymentMedium: 'QR_CODE',
            paymentRef: 'ESW-889102482',
            remarks: 'Monthly Tuition Fee for Baishakh 2083 via eSewa QR',
          },
        }).catch(() => {});
      }
    }
  }
  console.log('✅ Sample Students & Fee Receipts seeded');

  // ── 12. Sample Terminal Exam & Multi-Title Marks ─────────────────────────
  const exam = await prisma.exam.upsert({
    where: { id: 1 },
    update: {
      name: 'First Terminal Examination 2083',
      nameNepali: 'पहिलो त्रैमासिक परीक्षा २०८३',
      academicYearId: year2083.id,
      startDateBs: '2083-03-15',
      endDateBs: '2083-03-24',
    },
    create: {
      id: 1,
      name: 'First Terminal Examination 2083',
      nameNepali: 'पहिलो त्रैमासिक परीक्षा २०८३',
      academicYearId: year2083.id,
      startDateBs: '2083-03-15',
      endDateBs: '2083-03-24',
    },
  });

  if (class1Id) {
    await prisma.examClass.upsert({
      where: { examId_classId: { examId: exam.id, classId: class1Id } },
      update: { isPublished: true, publishedAt: new Date() },
      create: { examId: exam.id, classId: class1Id, isPublished: true, publishedAt: new Date() },
    });

    const engSubId = subjectMap.get('ENG');
    if (engSubId) {
      const examSub = await prisma.examSubject.upsert({
        where: { id: 1 },
        update: { examId: exam.id, subjectId: engSubId },
        create: { id: 1, examId: exam.id, subjectId: engSubId },
      });

      // Multi-title marks: Theory (50), Practical (25), Life Learning (25)
      const titleTheory = await prisma.markTitle.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1, examSubjectId: examSub.id, title: 'Theory (सैद्धान्तिक)', fullMark: 50, passMarkPct: 40, orderIndex: 1 },
      });
      const titlePractical = await prisma.markTitle.upsert({
        where: { id: 2 },
        update: {},
        create: { id: 2, examSubjectId: examSub.id, title: 'Practical (प्रयोगात्मक)', fullMark: 25, passMarkPct: 40, orderIndex: 2 },
      });
      const titleContinuous = await prisma.markTitle.upsert({
        where: { id: 3 },
        update: {},
        create: { id: 3, examSubjectId: examSub.id, title: 'Continuous & Life Learning (निरन्तर मूल्याङ्कन)', fullMark: 25, passMarkPct: 40, orderIndex: 3 },
      });

      const aayush = await prisma.student.findUnique({ where: { studentId: '320160001' } });
      if (aayush) {
        await prisma.markEntry.upsert({
          where: { examSubjectId_markTitleId_studentId: { examSubjectId: examSub.id, markTitleId: titleTheory.id, studentId: aayush.id } },
          update: { marksObtained: 46 },
          create: { examSubjectId: examSub.id, markTitleId: titleTheory.id, studentId: aayush.id, marksObtained: 46, teacherId: ramTeacher.id },
        });
        await prisma.markEntry.upsert({
          where: { examSubjectId_markTitleId_studentId: { examSubjectId: examSub.id, markTitleId: titlePractical.id, studentId: aayush.id } },
          update: { marksObtained: 24 },
          create: { examSubjectId: examSub.id, markTitleId: titlePractical.id, studentId: aayush.id, marksObtained: 24, teacherId: ramTeacher.id },
        });
        await prisma.markEntry.upsert({
          where: { examSubjectId_markTitleId_studentId: { examSubjectId: examSub.id, markTitleId: titleContinuous.id, studentId: aayush.id } },
          update: { marksObtained: 23 },
          create: { examSubjectId: examSub.id, markTitleId: titleContinuous.id, studentId: aayush.id, marksObtained: 23, teacherId: ramTeacher.id },
        });
      }
    }
  }
  console.log('✅ Exam, Multi-Title Mark Titles & Sample Results seeded');

  // ── 13. Public School Notices ───────────────────────────────────────────
  const notices = [
    {
      title: 'Welcome to Academic Session 2083-84 at Brindawan Public School',
      body: 'We warmly welcome all new and returning students to the academic year 2083-84. Classes commence from Sunday, Baishakh 5. Let us work together towards academic excellence and moral character.',
      type: 'GENERAL',
      postedDateBs: '2083-01-02',
    },
    {
      title: 'School Uniform, ID Card & Tie-Belt Distribution Notice',
      body: 'All parents are requested to collect student ID Cards, School Ties, Belts, and Uniform sets from the school administrative counter between 10:00 AM and 3:00 PM.',
      type: 'GENERAL',
      postedDateBs: '2083-01-10',
    },
    {
      title: 'First Terminal Examination Routine 2083 Announced',
      body: 'The First Terminal Examination for Pre-Primary to Class 5 will be conducted from Ashadh 15, 2083. Detailed exam routines and admit cards have been published in the student portal.',
      type: 'EXAM',
      postedDateBs: '2083-03-01',
    },
    {
      title: 'Parent-Teacher Meeting (PTM) & Child Progress Review',
      body: 'A Parent-Teacher Meeting will be held on Saturday to review child foundational development, attendance, and quarterly learning outcomes. Active guardian participation is requested.',
      type: 'GENERAL',
      postedDateBs: '2083-03-28',
    },
  ];

  for (const n of notices) {
    const existingNotice = await prisma.notice.findFirst({ where: { title: n.title } });
    if (!existingNotice) {
      await prisma.notice.create({
        data: {
          ...n,
          isActive: true,
          postedDateAd: new Date(),
        },
      });
    }
  }
  console.log('✅ School Notices seeded');

  console.log('\n=============================================================');
  console.log('🎉 BRINDAWAN PUBLIC SCHOOL ERP SEED COMPLETED SUCCESSFULLY!');
  console.log('=============================================================');
  console.log('🔑 DEFAULT CREDENTIALS:');
  console.log('   Super Admin: admin        / Admin@2083');
  console.log('   Accountant:  accountant   / Accountant@2083');
  console.log('   Principal:   principal    / Teacher@2083');
  console.log('   Teacher:     ram.sharma   / Teacher@2083');
  console.log('   Librarian:   librarian    / Librarian@2083');
  console.log('   Student 1:   320160001    / Student@2081 (Class 1, Aayush Shrestha)');
  console.log('   Student 2:   320160002    / Student@2081 (Class 1, Smarika Dahal)');
  console.log('   Student 3:   320160003    / Student@2081 (UKG, Rohan Kumar Raut)');
  console.log('=============================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
