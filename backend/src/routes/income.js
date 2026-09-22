const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { resolveFinancialYearByDate } = require('./financialYears');

const router = express.Router();

// Force no HTTP caching on any income/fee route
router.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// ── FEE COLLECTIONS DELETE & EDIT (TOP PRIORITY) ───────────────────────────
const deleteFeeCollectionHandler = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });
    await prisma.feeCollection.delete({ where: { id } });
    return res.json({ success: true, message: 'Fee collection deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

router.delete('/fee-collections/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), deleteFeeCollectionHandler);
router.post('/fee-collections/:id/delete', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), deleteFeeCollectionHandler);

router.post('/fee-collections-delete-direct', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const id = parseInt(req.body.id || req.body.feeCollectionId);
    if (!id || isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid receipt ID.' });
    await prisma.feeCollection.delete({ where: { id } });
    return res.json({ success: true, message: 'Fee collection deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/fee-collections/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { amount, paidDateAd, studentId, feeHeadId, academicYearId, ...rest } = req.body;
    const updateData = { ...rest };
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (paidDateAd) updateData.paidDateAd = new Date(paidDateAd);
    if (studentId) updateData.studentId = parseInt(studentId);
    if (feeHeadId) updateData.feeHeadId = parseInt(feeHeadId);

    const collection = await prisma.feeCollection.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
      include: { student: true, feeHead: true },
    });
    return res.json({ success: true, data: collection, message: 'Fee collection updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── INCOME CATEGORIES ──────────────────────────────────────────────────────

router.get('/categories', authenticate, async (req, res) => {
  const cats = await prisma.incomeCategory.findMany({
    where: { isActive: true },
    include: { incomeHeads: { where: { isActive: true } } },
    orderBy: { name: 'asc' },
  });
  return res.json({ success: true, data: cats });
});

router.post('/categories', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const cat = await prisma.incomeCategory.create({ data: req.body });
    return res.status(201).json({ success: true, data: cat, message: 'Income Category created.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/categories/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const cat = await prisma.incomeCategory.update({ where: { id: parseInt(req.params.id) }, data: req.body });
    return res.json({ success: true, data: cat, message: 'Category updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/categories/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.incomeCategory.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    return res.json({ success: true, message: 'Income Category deleted/deactivated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/categories/:id/delete', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.incomeCategory.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    return res.json({ success: true, message: 'Income Category deleted/deactivated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── INCOME HEADS ──────────────────────────────────────────────────────────

router.get('/heads', authenticate, async (req, res) => {
  const heads = await prisma.incomeHead.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { name: 'asc' },
  });
  return res.json({ success: true, data: heads });
});

router.post('/heads', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { name, nameNepali, code, categoryId, isActive } = req.body;
    let head;
    try {
      head = await prisma.incomeHead.create({
        data: {
          name,
          nameNepali: nameNepali || null,
          code: code ? String(code).trim() : null,
          categoryId: parseInt(categoryId),
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        },
        include: { category: true },
      });
    } catch (createErr) {
      if (createErr.code === 'P2002' || createErr.message?.includes('id') || createErr.message?.includes('Unique constraint')) {
        // Heal sequence and retry with max ID + 1
        const maxRes = await prisma.incomeHead.aggregate({ _max: { id: true } });
        const nextId = (maxRes._max.id || 0) + 1;
        head = await prisma.incomeHead.create({
          data: {
            id: nextId,
            name,
            nameNepali: nameNepali || null,
            code: code ? String(code).trim() : null,
            categoryId: parseInt(categoryId),
            isActive: isActive !== undefined ? Boolean(isActive) : true,
          },
          include: { category: true },
        });
      } else {
        throw createErr;
      }
    }
    return res.status(201).json({ success: true, data: head, message: 'Income Head created.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/heads/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { name, nameNepali, code, categoryId, isActive } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (nameNepali !== undefined) updateData.nameNepali = nameNepali || null;
    if (code !== undefined) updateData.code = code ? String(code).trim() : null;
    if (categoryId !== undefined) updateData.categoryId = parseInt(categoryId);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const head = await prisma.incomeHead.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
      include: { category: true },
    });
    return res.json({ success: true, data: head, message: 'Income Head updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});


router.delete('/heads/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.incomeHead.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    return res.json({ success: true, message: 'Income Head deactivated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/heads/:id/delete', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.incomeHead.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    return res.json({ success: true, message: 'Income Head deleted/deactivated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── FEE HEADS ──────────────────────────────────────────────────────────────

router.get('/fee-heads', authenticate, async (req, res) => {
  const heads = await prisma.feeHead.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  return res.json({ success: true, data: heads });
});

router.post('/fee-heads', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const fh = await prisma.feeHead.create({
      data: {
        ...req.body,
        amount: parseFloat(req.body.amount || 0),
        incomeHeadId: req.body.incomeHeadId ? parseInt(req.body.incomeHeadId) : undefined,
      },
    });

    // Auto-link new Fee Head to all classes in ClassFeeStructure
    const allClasses = await prisma.class.findMany();
    for (const c of allClasses) {
      await prisma.classFeeStructure.upsert({
        where: { classId_feeHeadId: { classId: c.id, feeHeadId: fh.id } },
        update: {},
        create: { classId: c.id, feeHeadId: fh.id, amount: fh.amount },
      });
    }

    return res.status(201).json({ success: true, data: fh, message: 'Fee Head created and linked to all classes.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/fee-heads/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const fh = await prisma.feeHead.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...req.body,
        amount: req.body.amount !== undefined ? parseFloat(req.body.amount) : undefined,
        incomeHeadId: req.body.incomeHeadId ? parseInt(req.body.incomeHeadId) : undefined,
      },
    });
    return res.json({ success: true, data: fh, message: 'Fee Head updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/fee-heads/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.feeHead.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    return res.json({ success: true, message: 'Fee Head deleted/deactivated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/fee-heads/:id/delete', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.feeHead.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    return res.json({ success: true, message: 'Fee Head deleted/deactivated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── FEE COLLECTIONS ───────────────────────────────────────────────────────

router.get('/fee-collections', authenticate, async (req, res) => {
  try {
    const { studentId, feeHeadId, academicYearId, financialYearId, from, to, page = 1, limit = 200 } = req.query;
    const where = {};
    if (studentId) where.studentId = parseInt(studentId);
    if (feeHeadId) where.feeHeadId = parseInt(feeHeadId);
    if (financialYearId) where.financialYearId = parseInt(financialYearId);
    else if (academicYearId) where.academicYearId = parseInt(academicYearId);

    if (from || to) {
      where.paidDateBs = {};
      if (from) where.paidDateBs.gte = from;
      if (to) where.paidDateBs.lte = to;
    }
    const [collections, total] = await Promise.all([
      prisma.feeCollection.findMany({
        where,
        include: { student: true, feeHead: true, academicYear: true, financialYear: true },
        orderBy: { paidDateAd: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.feeCollection.count({ where }),
    ]);
    const agg = await prisma.feeCollection.aggregate({ where, _sum: { amount: true } });
    return res.json({ success: true, data: collections, total, totalAmount: agg._sum.amount || 0 });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/fee-collections', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    // Generate receipt no
    const count = await prisma.feeCollection.count();
    const receiptNo = `RCP-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    const { paidDateAd, academicYearId, financialYearId, feeDueId, previousReceiptId, ...rest } = req.body;

    let resolvedFyId = financialYearId ? parseInt(financialYearId) : null;
    if (!resolvedFyId && rest.paidDateBs) {
      const resolved = await resolveFinancialYearByDate(rest.paidDateBs);
      if (resolved) resolvedFyId = resolved.id;
    }

    const collection = await prisma.feeCollection.create({
      data: {
        ...rest,
        amount: parseFloat(rest.amount),
        paidDateAd: new Date(paidDateAd || new Date()),
        academicYearId: academicYearId ? parseInt(academicYearId) : undefined,
        financialYearId: resolvedFyId,
        studentId: parseInt(rest.studentId),
        feeHeadId: parseInt(rest.feeHeadId),
        receiptNo,
      },
      include: { student: true, feeHead: true, financialYear: true },
    });

    // If this payment is a due settlement for a previous receipt, update previous receipt to mark due settled
    if (previousReceiptId) {
      try {
        const prev = await prisma.feeCollection.findUnique({ where: { id: parseInt(previousReceiptId) } });
        if (prev) {
          const updatedRemarks = prev.remarks
            ? prev.remarks.replace(/Due:\s*(?:Rs\.|रू)?\s*[\d,.]+/gi, `Due: Rs. 0 [Settled by ${receiptNo}]`)
            : `[Settled by ${receiptNo} | Due: Rs. 0]`;
          await prisma.feeCollection.update({
            where: { id: parseInt(previousReceiptId) },
            data: { remarks: updatedRemarks },
          });
        }
      } catch (prevErr) {
        console.error('Failed to update previous due receipt:', prevErr);
      }
    }

    // Also check if remarks reference a previous receipt number (Ref Receipt: RCP-XXXX)
    const refMatch = (rest.remarks || '').match(/Ref Receipt:\s*(RCP-[\w-]+)/i);
    if (refMatch && refMatch[1]) {
      try {
        const refRec = await prisma.feeCollection.findFirst({ where: { receiptNo: refMatch[1] } });
        if (refRec && (!previousReceiptId || refRec.id !== parseInt(previousReceiptId))) {
          const updatedRemarks = refRec.remarks
            ? refRec.remarks.replace(/Due:\s*(?:Rs\.|रू)?\s*[\d,.]+/gi, `Due: Rs. 0 [Settled by ${receiptNo}]`)
            : `[Settled by ${receiptNo} | Due: Rs. 0]`;
          await prisma.feeCollection.update({
            where: { id: refRec.id },
            data: { remarks: updatedRemarks },
          });
        }
      } catch (refErr) {
        console.error('Failed to update referenced receipt:', refErr);
      }
    }

    // Mark corresponding fee due as paid if feeDueId passed
    if (feeDueId) {
      await prisma.studentFeeDue.update({
        where: { id: parseInt(feeDueId) },
        data: { isPaid: true, paidAmount: parseFloat(rest.amount) },
      }).catch(() => {});
    }

    // Automatically dispatch individual notice notification to student portal
    try {
      const feeHead = await prisma.feeHead.findUnique({ where: { id: parseInt(rest.feeHeadId) } });
      const headTitle = feeHead?.name || 'School Fee';
      const payAmt = parseFloat(rest.amount);

      const matchDue = (rest.remarks || '').match(/Due:\s*(?:Rs\.|रू)?\s*([\d,.]+)/i);
      const remDue = matchDue ? parseFloat(matchDue[1].replace(/,/g, '')) : 0;

      const noticeTitle = remDue > 0
        ? `💰 शुल्क भुक्तानी रसिद प्राप्त भयो (रसिद नं: ${receiptNo})`
        : `🎉 शुल्क पूर्ण चुक्ता भयो (रसिद नं: ${receiptNo})`;

      const noticeBody = remDue > 0
        ? `तपाईंको '${headTitle}' शीर्षकमा मिति ${rest.paidDateBs || 'हालै'} मा रू ${payAmt.toLocaleString()} शुल्क भुक्तानी प्राप्त भएको छ। बाँकी तिर्नुपर्ने बक्यौता रकम: रू ${remDue.toLocaleString()}। आधिकारिक रसिद नं: ${receiptNo}।`
        : `तपाईंको '${headTitle}' शीर्षकमा मिति ${rest.paidDateBs || 'हालै'} मा रू ${payAmt.toLocaleString()} शुल्क प्राप्त भई सम्पूर्ण बक्यौता चुक्ता भएको छ। आधिकारिक रसिद नं: ${receiptNo}।`;

      await prisma.notice.create({
        data: {
          title: noticeTitle,
          body: noticeBody,
          type: remDue > 0 ? 'FEE_REMINDER' : 'GENERAL',
          targetRole: 'STUDENT',
          targetStudentId: parseInt(rest.studentId),
          postedDateBs: rest.paidDateBs || new Date().toISOString().slice(0, 10),
          postedDateAd: new Date(),
          isAuto: true,
          isActive: true,
        },
      });
    } catch (noticeErr) {
      console.error('Failed to create automatic fee notice:', noticeErr);
    }

    return res.status(201).json({ success: true, data: collection, receiptNo });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── CLASS-WISE FEE STRUCTURE ────────────────────────────────────────────────
// GET /api/income/class-fee-structures/matrix/all — All classes fee matrix
router.get('/class-fee-structures/matrix/all', authenticate, async (req, res) => {
  try {
    const [classes, feeHeads, structures] = await Promise.all([
      prisma.class.findMany({ orderBy: { orderIndex: 'asc' } }),
      prisma.feeHead.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.classFeeStructure.findMany(),
    ]);

    const structMap = {};
    structures.forEach((cs) => {
      structMap[`${cs.classId}_${cs.feeHeadId}`] = cs.amount;
    });

    return res.json({
      success: true,
      data: {
        classes,
        feeHeads,
        structMap,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/income/class-fee-structures/:classId
router.get('/class-fee-structures/:classId', authenticate, async (req, res) => {
  try {
    const classId = parseInt(req.params.classId);
    const feeHeads = await prisma.feeHead.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    const classStructures = await prisma.classFeeStructure.findMany({ where: { classId } });

    const structMap = {};
    classStructures.forEach((cs) => { structMap[cs.feeHeadId] = cs.amount; });

    const result = feeHeads.map((fh) => ({
      feeHeadId: fh.id,
      name: fh.name,
      nameNepali: fh.nameNepali,
      defaultAmount: fh.amount,
      classAmount: structMap[fh.id] !== undefined ? structMap[fh.id] : fh.amount,
    }));

    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/income/class-fee-structures
router.post('/class-fee-structures', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'HEAD_TEACHER', 'TEACHER'), async (req, res) => {
  try {
    const { classId, structures } = req.body; // structures: [{ feeHeadId, amount }] or array of { classId, feeHeadId, amount }
    
    if (Array.isArray(structures)) {
      for (const item of structures) {
        const targetClassId = parseInt(item.classId || classId);
        if (!targetClassId || !item.feeHeadId) continue;

        await prisma.classFeeStructure.upsert({
          where: { classId_feeHeadId: { classId: targetClassId, feeHeadId: parseInt(item.feeHeadId) } },
          update: { amount: parseFloat(item.amount || 0) },
          create: { classId: targetClassId, feeHeadId: parseInt(item.feeHeadId), amount: parseFloat(item.amount || 0) },
        });
      }
    }

    return res.json({ success: true, message: 'Class fee structure updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── MONTHLY FEE DUES GENERATOR ──────────────────────────────────────────────
// ── MONTHLY BILLING / DUES GENERATION (With Scholarship & Discount Calculation) ──
// POST /api/income/fee-dues/generate-monthly
router.post('/fee-dues/generate-monthly', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const {
      classId,
      classIds,
      monthBs,
      feeHeadIds,
      dueDateBs,
      sendPortalNotice = true,
      applyScholarships = true,
      includeTransportFee = false,
      includeAdmissionFee = false,
    } = req.body;

    if (!monthBs) {
      return res.status(400).json({ success: false, message: 'monthBs is required (e.g. 2083-05).' });
    }

    let targetClassIds = [];
    if (Array.isArray(classIds) && classIds.length > 0) {
      targetClassIds = classIds.map((id) => parseInt(id)).filter((id) => !isNaN(id) && id > 0);
    } else if (classId && classId !== 'ALL') {
      const parsed = parseInt(classId);
      if (!isNaN(parsed) && parsed > 0) targetClassIds = [parsed];
    }

    // Fetch fee heads to process
    let feeHeadsToProcess = [];
    if (Array.isArray(feeHeadIds) && feeHeadIds.length > 0) {
      feeHeadsToProcess = await prisma.feeHead.findMany({
        where: { id: { in: feeHeadIds.map((id) => parseInt(id)) }, isActive: true },
      });
    } else if (feeHeadIds && feeHeadIds !== 'ALL') {
      const parsedHeadId = parseInt(feeHeadIds);
      if (!isNaN(parsedHeadId)) {
        const fh = await prisma.feeHead.findUnique({ where: { id: parsedHeadId } });
        if (fh) feeHeadsToProcess.push(fh);
      }
    }

    if (feeHeadsToProcess.length === 0) {
      feeHeadsToProcess = await prisma.feeHead.findMany({ where: { isActive: true } });
    }

    if (feeHeadsToProcess.length === 0) {
      return res.status(400).json({ success: false, message: 'No active Fee Heads found. Please add fee heads first.' });
    }

    // Fetch active enrollments
    const enrollmentsWhere = { isActive: true };
    if (targetClassIds.length > 0) {
      enrollmentsWhere.classId = { in: targetClassIds };
    }

    const enrollments = await prisma.classEnrollment.findMany({
      where: enrollmentsWhere,
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            studentId: true,
            phone: true,
            guardianContact: true,
            scholarshipType: true,
            discountPercent: true,
            customMonthlyFee: true,
            discountRemarks: true,
          },
        },
        class: true,
      },
      orderBy: [{ class: { orderIndex: 'asc' } }, { rollNo: 'asc' }],
    });

    if (enrollments.length === 0) {
      return res.status(400).json({ success: false, message: 'No active students found in the selected class criteria.' });
    }

    let generatedCount = 0;
    let totalBilledSum = 0;
    let totalDiscountSum = 0;
    let fullScholarshipCount = 0;
    let partialConcessionCount = 0;

    for (const enroll of enrollments) {
      const student = enroll.student;
      const billNo = `BPS-BILL-${monthBs}-${String(student.id).padStart(4, '0')}`;
      let studentBilledTotal = 0;

      for (const feeHead of feeHeadsToProcess) {
        // Skip admission fee in monthly recurring bill unless specifically requested
        const isAdmissionHead = /admission|भर्ना/i.test(feeHead.name) || /admission|भर्ना/i.test(feeHead.nameNepali || '');
        if (isAdmissionHead && !includeAdmissionFee) {
          continue;
        }

        // Class-specific fee structure or default fee head amount
        const classStruct = await prisma.classFeeStructure.findUnique({
          where: { classId_feeHeadId: { classId: enroll.classId, feeHeadId: feeHead.id } },
        });
        const standardAmount = classStruct ? classStruct.amount : feeHead.amount;

        // Skip non-mandatory fee heads if amount is 0
        if (standardAmount <= 0 && feeHead.isOptional) continue;

        // Check if this head is Monthly Tuition Fee
        const isMonthlyFee = /month|मासिक|tuition/i.test(feeHead.name) ||
                             /month|मासिक|tuition/i.test(feeHead.nameNepali || '');

        let finalAmount = standardAmount;
        let origAmount = standardAmount;
        let discAmount = 0;
        let remarks = `${feeHead.name} (${monthBs})`;
        let isPaid = false;

        if (isMonthlyFee && applyScholarships) {
          const isFullScholarship = student.scholarshipType === 'FULL' || (student.discountPercent !== null && student.discountPercent >= 100);

          if (isFullScholarship) {
            fullScholarshipCount++;
            finalAmount = 0;
            origAmount = standardAmount;
            discAmount = standardAmount;
            isPaid = true; // 100% scholarship is fully covered/cleared
            remarks = `मासिक शुल्क (Full Scholarship - १००% निःशुल्क छात्रवृत्ति)`;
          } else if (student.customMonthlyFee !== null && student.customMonthlyFee !== undefined && student.customMonthlyFee >= 0) {
            partialConcessionCount++;
            finalAmount = student.customMonthlyFee;
            origAmount = standardAmount;
            discAmount = Math.max(0, standardAmount - finalAmount);
            remarks = `मासिक शुल्क (${monthBs}) [Adjusted fee: रू ${finalAmount}]`;
          } else if (student.discountPercent && student.discountPercent > 0) {
            partialConcessionCount++;
            discAmount = Math.round(standardAmount * (student.discountPercent / 100));
            finalAmount = Math.max(0, standardAmount - discAmount);
            origAmount = standardAmount;
            remarks = `मासिक शुल्क (${monthBs}) [${student.discountPercent}% Concession]`;
          }
        }

        // Check if due already exists
        const existing = await prisma.studentFeeDue.findFirst({
          where: { studentId: student.id, feeHeadId: feeHead.id, monthBs },
        });

        if (!existing) {
          await prisma.studentFeeDue.create({
            data: {
              studentId: student.id,
              feeHeadId: feeHead.id,
              monthBs,
              amount: finalAmount,
              originalAmount: origAmount,
              discountAmount: discAmount,
              billNo,
              dueDateBs: dueDateBs || `${monthBs}-30`,
              remarks,
              isPaid,
            },
          });
          generatedCount++;
          studentBilledTotal += finalAmount;
          totalBilledSum += finalAmount;
          totalDiscountSum += discAmount;
        }
      }

      // Send Notice to Student / Parent Portal & Mobile Alert Bar
      if (sendPortalNotice && studentBilledTotal > 0) {
        await prisma.notice.create({
          data: {
            title: `📢 मासिक शुल्क बिल तयार भयो (${monthBs}) — Brindawan Public School`,
            body: `आदरणीय अभिभावक ज्यू,\n${student.fullName} को महिना ${monthBs} को मासिक शुल्क बिल तयार भएको छ।\n• बिल नम्बर: ${billNo}\n• जम्मा तिर्नुपर्ने रकम: रू ${studentBilledTotal.toLocaleString()}\n• भुक्तानी म्याद: ${dueDateBs || monthBs + '-30'} BS सम्म\n\nकृपया पोर्टलको 'Fee Receipts / शुल्क विवरण' ट्याबबाट विस्तृत बिल हेर्नुहोस् वा अनलाइन भुक्तानी गर्नुहोस्।`,
            type: 'FEE_REMINDER',
            targetStudentId: student.id,
            isAutomatic: true,
            postedDateBs: new Date().toISOString().slice(0, 10),
          },
        }).catch(() => {});
      } else if (sendPortalNotice && student.scholarshipType === 'FULL') {
        await prisma.notice.create({
          data: {
            title: `✨ मासिक शुल्क छात्रवृत्ति विवरण (${monthBs})`,
            body: `आदरणीय अभिभावक ज्यू,\n${student.fullName} को महिना ${monthBs} को मासिक शुल्क पूर्ण छात्रवृत्ति (Full Scholarship) अन्तर्गत १००% निःशुल्क मिनाहा गरिएको छ। कुनै बक्यौता बाँकी छैन।`,
            type: 'GENERAL',
            targetStudentId: student.id,
            isAutomatic: true,
            postedDateBs: new Date().toISOString().slice(0, 10),
          },
        }).catch(() => {});
      }
    }

    return res.json({
      success: true,
      message: `Successfully generated month-end bills for ${generatedCount} fee items across ${enrollments.length} students!`,
      data: {
        monthBs,
        generatedCount,
        totalStudents: enrollments.length,
        totalBilledSum,
        totalDiscountSum,
        fullScholarshipCount,
        partialConcessionCount,
      },
    });
  } catch (err) {
    console.error('Error generating monthly fee dues:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/income/fee-dues/preview-monthly
router.get('/fee-dues/preview-monthly', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { classId, monthBs } = req.query;
    const targetClassId = classId && classId !== 'ALL' ? parseInt(classId) : null;

    const enrollmentsWhere = { isActive: true };
    if (targetClassId) enrollmentsWhere.classId = targetClassId;

    const enrollments = await prisma.classEnrollment.findMany({
      where: enrollmentsWhere,
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            studentId: true,
            scholarshipType: true,
            discountPercent: true,
            customMonthlyFee: true,
            discountRemarks: true,
          },
        },
        class: true,
      },
      orderBy: [{ class: { orderIndex: 'asc' } }, { rollNo: 'asc' }],
    });

    const feeHeads = await prisma.feeHead.findMany({ where: { isActive: true } });
    const monthlyHead = feeHeads.find(f => /month|मासिक|tuition/i.test(f.name) || /month|मासिक|tuition/i.test(f.nameNepali || '')) || feeHeads[0];

    let fullScholarshipCount = 0;
    let partialConcessionCount = 0;
    let regularCount = 0;
    let totalEstGross = 0;
    let totalEstDiscount = 0;
    let totalEstNet = 0;

    const previews = [];

    for (const enroll of enrollments) {
      const s = enroll.student;
      const classStruct = monthlyHead ? await prisma.classFeeStructure.findUnique({
        where: { classId_feeHeadId: { classId: enroll.classId, feeHeadId: monthlyHead.id } },
      }) : null;
      const standardMonthly = classStruct ? classStruct.amount : (monthlyHead?.amount || 1500);

      let finalAmount = standardMonthly;
      let disc = 0;
      let category = 'REGULAR';

      if (s.scholarshipType === 'FULL' || (s.discountPercent !== null && s.discountPercent >= 100)) {
        fullScholarshipCount++;
        disc = standardMonthly;
        finalAmount = 0;
        category = 'FULL_SCHOLARSHIP';
      } else if (s.customMonthlyFee !== null && s.customMonthlyFee !== undefined && s.customMonthlyFee >= 0) {
        partialConcessionCount++;
        finalAmount = s.customMonthlyFee;
        disc = Math.max(0, standardMonthly - finalAmount);
        category = 'CUSTOM_ADJUSTED';
      } else if (s.discountPercent && s.discountPercent > 0) {
        partialConcessionCount++;
        disc = Math.round(standardMonthly * (s.discountPercent / 100));
        finalAmount = Math.max(0, standardMonthly - disc);
        category = 'PERCENT_DISCOUNT';
      } else {
        regularCount++;
      }

      totalEstGross += standardMonthly;
      totalEstDiscount += disc;
      totalEstNet += finalAmount;

      previews.push({
        studentId: s.id,
        fullName: s.fullName,
        studentEmisId: s.studentId,
        className: enroll.class.name,
        rollNo: enroll.rollNo,
        scholarshipType: s.scholarshipType || 'NONE',
        discountPercent: s.discountPercent || 0,
        customMonthlyFee: s.customMonthlyFee,
        discountRemarks: s.discountRemarks,
        category,
        standardFee: standardMonthly,
        discountAmount: disc,
        netBillAmount: finalAmount,
      });
    }

    return res.json({
      success: true,
      data: {
        totalStudents: enrollments.length,
        fullScholarshipCount,
        partialConcessionCount,
        regularCount,
        totalEstGross,
        totalEstDiscount,
        totalEstNet,
        monthlyHeadName: monthlyHead?.name || 'Monthly Tuition Fee',
        previews,
      },
    });
  } catch (err) {
    console.error('Error fetching monthly billing preview:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/income/student-bills/:studentId — Grouped monthly bills for student & parents
router.get('/student-bills/:studentId', authenticate, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        classEnrollment: { include: { class: true } },
      },
    });

    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const dues = await prisma.studentFeeDue.findMany({
      where: { studentId },
      include: { feeHead: true },
      orderBy: [{ monthBs: 'desc' }, { createdAt: 'desc' }],
    });

    const billsMap = {};
    dues.forEach((d) => {
      const key = d.billNo || d.monthBs || 'GENERAL';
      if (!billsMap[key]) {
        billsMap[key] = {
          billNo: d.billNo || `BPS-BILL-${d.monthBs || 'MISC'}-${student.id}`,
          monthBs: d.monthBs || 'N/A',
          dueDateBs: d.dueDateBs,
          studentName: student.fullName,
          studentId: student.studentId,
          className: student.classEnrollment?.[0]?.class?.name || '—',
          scholarshipType: student.scholarshipType || 'NONE',
          items: [],
          totalOriginal: 0,
          totalDiscount: 0,
          totalNet: 0,
          totalPaid: 0,
          isFullyPaid: true,
          createdAt: d.createdAt,
        };
      }
      const orig = d.originalAmount !== null && d.originalAmount !== undefined ? d.originalAmount : d.amount;
      const disc = d.discountAmount || 0;
      const net = d.amount;
      const paid = d.paidAmount || 0;

      billsMap[key].items.push({
        id: d.id,
        feeHeadName: d.feeHead?.name || 'Fee',
        originalAmount: orig,
        discountAmount: disc,
        netAmount: net,
        paidAmount: paid,
        isPaid: d.isPaid,
        remarks: d.remarks,
      });

      billsMap[key].totalOriginal += orig;
      billsMap[key].totalDiscount += disc;
      billsMap[key].totalNet += net;
      billsMap[key].totalPaid += paid;
      if (!d.isPaid && (net - paid) > 0) {
        billsMap[key].isFullyPaid = false;
      }
    });

    const bills = Object.values(billsMap).map((b) => ({
      ...b,
      balanceDue: Math.max(0, b.totalNet - b.totalPaid),
      status: b.isFullyPaid ? 'PAID' : (b.totalPaid > 0 ? 'PARTIAL' : 'DUE'),
    }));

    return res.json({ success: true, data: bills });
  } catch (err) {
    console.error('Error fetching student bills:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── CLASS-WISE BILLS (FOR PHYSICAL BATCH PRINTING & REPORTING) ───────────────
// GET /api/income/class-bills?monthBs=2083-05&classId=1&classIds=1,2,3
router.get('/class-bills', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { monthBs, classId, classIds } = req.query;

    let targetClassIds = null;
    if (classIds) {
      targetClassIds = (Array.isArray(classIds) ? classIds : classIds.toString().split(','))
        .map((id) => parseInt(id.trim()))
        .filter((id) => !isNaN(id));
    } else if (classId && classId !== 'ALL') {
      const parsed = parseInt(classId);
      if (!isNaN(parsed)) targetClassIds = [parsed];
    }

    const enrollmentsWhere = { isActive: true };
    if (targetClassIds && targetClassIds.length > 0) {
      enrollmentsWhere.classId = { in: targetClassIds };
    }

    const enrollments = await prisma.classEnrollment.findMany({
      where: enrollmentsWhere,
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            studentId: true,
            scholarshipType: true,
            discountPercent: true,
            customMonthlyFee: true,
            discountRemarks: true,
            fatherName: true,
            motherName: true,
            guardianPhone: true,
            emergencyPhone: true,
            currentAddress: true,
          },
        },
        class: true,
        section: true,
      },
      orderBy: [{ class: { orderIndex: 'asc' } }, { rollNo: 'asc' }],
    });

    const studentIds = enrollments.map((e) => e.student.id);

    const duesWhere = {
      studentId: { in: studentIds },
    };
    if (monthBs && monthBs !== 'ALL') {
      duesWhere.monthBs = monthBs;
    }

    const dues = await prisma.studentFeeDue.findMany({
      where: duesWhere,
      include: { feeHead: true },
      orderBy: [{ monthBs: 'desc' }, { createdAt: 'desc' }],
    });

    const duesByStudentAndBill = {};
    dues.forEach((d) => {
      const key = `${d.studentId}_${d.billNo || d.monthBs || 'GENERAL'}`;
      if (!duesByStudentAndBill[key]) {
        duesByStudentAndBill[key] = [];
      }
      duesByStudentAndBill[key].push(d);
    });

    const studentEnrollmentMap = {};
    enrollments.forEach((e) => {
      studentEnrollmentMap[e.student.id] = e;
    });

    const bills = [];

    Object.entries(duesByStudentAndBill).forEach(([key, items]) => {
      const firstDue = items[0];
      const enr = studentEnrollmentMap[firstDue.studentId];
      if (!enr) return;

      const student = enr.student;
      let totalOriginal = 0;
      let totalDiscount = 0;
      let totalNet = 0;
      let totalPaid = 0;
      let isFullyPaid = true;

      const formattedItems = items.map((d) => {
        const orig = d.originalAmount !== null && d.originalAmount !== undefined ? d.originalAmount : d.amount;
        const disc = d.discountAmount || 0;
        const net = d.amount;
        const paid = d.paidAmount || 0;

        totalOriginal += orig;
        totalDiscount += disc;
        totalNet += net;
        totalPaid += paid;
        if (!d.isPaid && (net - paid) > 0) {
          isFullyPaid = false;
        }

        return {
          id: d.id,
          feeHeadName: d.feeHead?.name || 'Fee',
          feeHeadCategory: d.feeHead?.category || 'MONTHLY',
          originalAmount: orig,
          discountAmount: disc,
          netAmount: net,
          paidAmount: paid,
          isPaid: d.isPaid,
          remarks: d.remarks,
        };
      });

      bills.push({
        billNo: firstDue.billNo || `BPS-BILL-${firstDue.monthBs || 'MISC'}-${student.id}`,
        monthBs: firstDue.monthBs || monthBs || 'N/A',
        dueDateBs: firstDue.dueDateBs,
        studentId: student.id,
        studentCode: student.studentId,
        studentName: student.fullName,
        className: enr.class?.name || '—',
        classId: enr.classId,
        sectionName: enr.section?.name || 'A',
        rollNo: enr.rollNo || '—',
        guardianName: student.fatherName || student.motherName || 'अभिभावक',
        guardianPhone: student.guardianPhone || student.emergencyPhone || '—',
        scholarshipType: student.scholarshipType || 'NONE',
        discountRemarks: student.discountRemarks,
        items: formattedItems,
        totalOriginal,
        totalDiscount,
        totalNet,
        totalPaid,
        balanceDue: Math.max(0, totalNet - totalPaid),
        isFullyPaid,
        status: isFullyPaid ? 'PAID' : (totalPaid > 0 ? 'PARTIAL' : 'DUE'),
        createdAt: firstDue.createdAt,
      });
    });

    return res.json({ success: true, data: bills, totalBills: bills.length });
  } catch (err) {
    console.error('Error fetching class bills:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── STUDENT PAYMENT LEDGER (STATEMENT OF ACCOUNT) ───────────────────────────
// GET /api/income/student-ledger/:studentId
router.get('/student-ledger/:studentId', authenticate, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    const [dues, collections, student] = await Promise.all([
      prisma.studentFeeDue.findMany({
        where: { studentId },
        include: { feeHead: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.feeCollection.findMany({
        where: { studentId },
        include: { feeHead: true },
        orderBy: { paidDateAd: 'asc' },
      }),
      prisma.student.findUnique({
        where: { id: studentId },
        select: { id: true, fullName: true, fullNameNepali: true, studentId: true, phone: true, guardianContact: true },
      }),
    ]);

    // Build unified chronological ledger entries
    const duesHeadSet = new Set(dues.map(d => d.feeHeadId));
    const ledgerEntries = [];

    dues.forEach((d) => {
      ledgerEntries.push({
        id: `DUE-${d.id}`,
        dateBs: d.monthBs || d.createdAt.toISOString().slice(0, 10),
        type: 'DUE',
        particulars: `${d.feeHead?.name || 'Fee Billed'} ${d.monthBs ? `(${d.monthBs})` : ''}`,
        billedAmount: d.amount,
        paidAmount: 0,
        isPaid: d.isPaid,
        remarks: d.remarks || 'Billed Fee Due',
        createdAt: d.createdAt,
      });
    });

    collections.forEach((c) => {
      const hasSeparateDue = duesHeadSet.has(c.feeHeadId);
      
      const matchTotal = (c.remarks || '').match(/Total:\s*(?:Rs\.|रू)?\s*([\d,.]+)/i);
      const matchDisc = (c.remarks || '').match(/Disc:\s*(?:Rs\.|रू)?\s*([\d,.]+)/i);
      const matchDue = (c.remarks || '').match(/Due:\s*(?:Rs\.|रू)?\s*([\d,.]+)/i);

      const totalFee = matchTotal ? parseFloat(matchTotal[1].replace(/,/g, '')) : c.amount;
      const discount = matchDisc ? parseFloat(matchDisc[1].replace(/,/g, '')) : 0;
      const remainingDue = matchDue ? parseFloat(matchDue[1].replace(/,/g, '')) : Math.max(0, totalFee - discount - c.amount);

      const implicitBilled = hasSeparateDue ? 0 : Math.max(totalFee - discount, c.amount + remainingDue);

      ledgerEntries.push({
        id: `PAY-${c.id}`,
        dateBs: c.paidDateBs,
        type: 'PAYMENT',
        particulars: `Receipt No: ${c.receiptNo} — ${c.feeHead?.name || 'Fee Payment'}`,
        billedAmount: implicitBilled,
        paidAmount: c.amount,
        remainingDue,
        paymentMedium: c.paymentMedium || 'CASH',
        receiptNo: c.receiptNo,
        remarks: c.remarks || 'Fee Paid',
        createdAt: c.paidDateAd,
      });
    });

    // Sort chronologically
    ledgerEntries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Calculate Running Balance
    let runningBalance = 0;
    const items = ledgerEntries.map((e) => {
      runningBalance += e.billedAmount - e.paidAmount;
      return { ...e, runningBalance: Math.max(0, runningBalance) };
    });

    const totalBilled = items.reduce((sum, item) => sum + item.billedAmount, 0);
    const totalPaid = items.reduce((sum, item) => sum + item.paidAmount, 0);
    const netOutstanding = Math.max(0, totalBilled - totalPaid);

    return res.json({
      success: true,
      data: {
        student,
        items,
        totalBilled,
        totalPaid,
        netOutstanding,
        dues,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/income/online-pay — Student Online QR / Transfer Payment Submission
router.post('/online-pay', authenticate, async (req, res) => {
  try {
    const { studentId, feeHeadId, amount, paymentMedium, paymentRef, remarks } = req.body;

    const count = await prisma.feeCollection.count();
    const receiptNo = `ONLINE-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const collection = await prisma.feeCollection.create({
      data: {
        studentId: parseInt(studentId),
        feeHeadId: parseInt(feeHeadId),
        amount: parseFloat(amount),
        paidDateBs: todayBS(),
        paidDateAd: new Date(),
        receiptNo,
        collectedBy: 'Online Portal / Student',
        paymentMedium: paymentMedium || 'QR_CODE',
        paymentRef,
        remarks: remarks || 'Online Fee Submission',
      },
      include: { student: true, feeHead: true },
    });
    return res.status(201).json({ success: true, data: collection, message: 'Online payment submitted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── INCOME ENTRIES ────────────────────────────────────────────────────────
router.get('/entries', authenticate, async (req, res) => {
  try {
    const { academicYearId, financialYearId, headId, categoryId, partyId, from, to, q, page = 1, limit = 100 } = req.query;
    const where = {};
    if (financialYearId) where.financialYearId = parseInt(financialYearId);
    else if (academicYearId) where.academicYearId = parseInt(academicYearId);

    if (headId) where.headId = parseInt(headId);
    if (partyId) where.partyId = parseInt(partyId);
    if (categoryId) where.head = { categoryId: parseInt(categoryId) };
    if (from || to) {
      where.receivedDateBs = {};
      if (from) where.receivedDateBs.gte = from;
      if (to) where.receivedDateBs.lte = to;
    }
    if (q) {
      where.OR = [
        { sourceOrg: { contains: q } },
        { voucherNo: { contains: q } },
        { receivedBy: { contains: q } },
        { chequeNo: { contains: q } },
        { head: { name: { contains: q } } },
        { head: { code: { contains: q } } },
        { party: { name: { contains: q } } },
      ];
    }
    const [entries, total] = await Promise.all([
      prisma.incomeEntry.findMany({
        where,
        include: { head: { include: { category: true } }, academicYear: true, financialYear: true, party: true },
        orderBy: { receivedDateBs: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.incomeEntry.count({ where }),
    ]);
    const agg = await prisma.incomeEntry.aggregate({ where, _sum: { amount: true } });
    return res.json({ success: true, data: entries, total, totalAmount: agg._sum.amount || 0 });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/entries', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { receivedDateAd, headId, academicYearId, financialYearId, partyId, bankAccountId, amount, ...rest } = req.body;
    
    let resolvedFyId = financialYearId ? parseInt(financialYearId) : null;
    if (!resolvedFyId && rest.receivedDateBs) {
      const resolved = await resolveFinancialYearByDate(rest.receivedDateBs);
      if (resolved) resolvedFyId = resolved.id;
    }

    const entry = await prisma.incomeEntry.create({
      data: {
        ...rest,
        amount: parseFloat(amount),
        receivedDateAd: receivedDateAd ? new Date(receivedDateAd) : new Date(),
        headId: parseInt(headId),
        academicYearId: academicYearId ? parseInt(academicYearId) : (resolvedFyId || 1),
        financialYearId: resolvedFyId,
        partyId: partyId ? parseInt(partyId) : undefined,
        bankAccountId: bankAccountId ? parseInt(bankAccountId) : undefined,
      },
      include: { head: { include: { category: true } }, financialYear: true, party: true },
    });
    return res.status(201).json({ success: true, data: entry, message: 'Income entry saved.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/entries/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { receivedDateAd, headId, academicYearId, financialYearId, partyId, bankAccountId, amount, ...rest } = req.body;
    const updateData = { ...rest };
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (receivedDateAd) updateData.receivedDateAd = new Date(receivedDateAd);
    if (headId) updateData.headId = parseInt(headId);
    if (academicYearId) updateData.academicYearId = parseInt(academicYearId);
    
    if (financialYearId !== undefined) {
      updateData.financialYearId = financialYearId ? parseInt(financialYearId) : null;
    } else if (rest.receivedDateBs) {
      const resolved = await resolveFinancialYearByDate(rest.receivedDateBs);
      if (resolved) updateData.financialYearId = resolved.id;
    }

    if (partyId !== undefined) updateData.partyId = partyId ? parseInt(partyId) : null;
    if (bankAccountId !== undefined) updateData.bankAccountId = bankAccountId ? parseInt(bankAccountId) : null;

    const entry = await prisma.incomeEntry.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
      include: { head: { include: { category: true } }, financialYear: true, party: true },
    });
    return res.json({ success: true, data: entry, message: 'Income entry updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/entries/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.incomeEntry.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ success: true, message: 'Income entry deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
