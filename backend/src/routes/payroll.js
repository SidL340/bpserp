const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { resolveFinancialYearByDate } = require('./financialYears');

const router = express.Router();

// Payroll calculation engine — Flexible Private School Model with optional GoN items
function calculatePayroll(data) {
  const {
    moolTalab = 0,
    gradeNo = 0,
    gradeAmount = 0,
    mahangiGhata = 0,
    praABhata = 0,
    sahayakPraABhata = 0,
    prabiInchargeBhata = 0,
    mabiInchargeBhata = 0,
    otherBhata = 0,
    karmachariKoshSapati = 0,
    bimaKati = 0,
    peshkiKati = 0,
    includeChaadparba = false,
    peshki = 0,
    // Private School Checkbox Options (Default to false)
    includeEpf = false,
    includeSsk = false,
    includeBima = false,
    includeTax = false,
    monthsCount = 1,
    paidAmount = 0,
  } = data;

  const basic = parseFloat(moolTalab) || 0;
  const gradeRakam = (parseInt(gradeNo) || 0) * (parseFloat(gradeAmount) || 0);
  const gradeSahitTalab = +(basic + gradeRakam).toFixed(2);

  // Allowances (Dearness, Principal/Incharge, Special)
  const jammaBhata = +(
    (parseFloat(mahangiGhata) || 0) +
    (parseFloat(praABhata) || 0) +
    (parseFloat(sahayakPraABhata) || 0) +
    (parseFloat(prabiInchargeBhata) || 0) +
    (parseFloat(mabiInchargeBhata) || 0) +
    (parseFloat(otherBhata) || 0)
  ).toFixed(2);

  const jammaTalabBhata = +(gradeSahitTalab + jammaBhata).toFixed(2);
  const totalMonths = parseInt(monthsCount) || 1;
  const traimasikTalan = +(jammaTalabBhata * totalMonths).toFixed(2);

  // Deductions:
  // EPF / SSK / Beema only if checked by admin (private schools typically don't have these unless opted)
  const epfDed = includeEpf ? +(gradeSahitTalab * 0.10).toFixed(2) : 0;
  const sskEmp = includeSsk ? +(gradeSahitTalab * 0.20).toFixed(2) : 0;
  const bimaDed = includeBima ? (parseFloat(bimaKati) || 0) : 0;
  const advanceDed = parseFloat(peshkiKati) || 0;
  const loanDed = parseFloat(karmachariKoshSapati) || 0;

  const jammaKati = +(epfDed + loanDed + bimaDed + advanceDed).toFixed(2);
  const chaadparbaKharcha = includeChaadparba ? gradeSahitTalab : 0;
  const additionalPeshki = parseFloat(peshki) || 0;
  const kulRakam = +(traimasikTalan - jammaKati + chaadparbaKharcha + additionalPeshki).toFixed(2);

  const samajikSurakshaKar = includeTax ? +(kulRakam * 0.01).toFixed(2) : 0;
  const khudPaaunuParne = +(kulRakam - samajikSurakshaKar).toFixed(2);

  const actualPaid = parseFloat(paidAmount) || 0;
  const bakiPaaunuParne = Math.max(0, +(khudPaaunuParne - actualPaid).toFixed(2));

  let calculatedStatus = 'PENDING';
  if (actualPaid >= khudPaaunuParne && khudPaaunuParne > 0) {
    calculatedStatus = 'PAID';
  } else if (actualPaid > 0) {
    calculatedStatus = 'PARTIAL';
  }

  return {
    gradeRakam,
    gradeSahitTalab,
    karmachari10Pct: epfDed,
    ssk20Pct: sskEmp,
    jammaBhata,
    jammaTalabBhata,
    traimasikTalan,
    jammaKati,
    bakiPaaunuParne,
    chaadparbaKharcha,
    peshki: additionalPeshki,
    kulRakam,
    samajikSurakshaKar1Pct: samajikSurakshaKar,
    khudPaaunuParne,
    status: calculatedStatus,
  };
}

// GET /api/payroll — list
router.get('/', authenticate, async (req, res) => {
  try {
    const { teacherId, academicYearId, financialYearId, status, page = 1, limit = 50 } = req.query;
    const where = {};
    if (teacherId) where.teacherId = parseInt(teacherId);
    if (financialYearId) where.financialYearId = parseInt(financialYearId);
    else if (academicYearId) where.academicYearId = parseInt(academicYearId);
    if (status) where.status = status;
    const [payrolls, total] = await Promise.all([
      prisma.payroll.findMany({
        where,
        include: { teacher: { select: { fullName: true, type: true, taha: true } }, academicYear: true, financialYear: true },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.payroll.count({ where }),
    ]);
    return res.json({ success: true, data: payrolls, total });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/payroll/:id
router.get('/:id', authenticate, async (req, res) => {
  const idNum = parseInt(req.params.id);
  if (isNaN(idNum)) {
    return res.status(400).json({ success: false, message: 'Invalid payroll ID' });
  }
  const p = await prisma.payroll.findUnique({
    where: { id: idNum },
    include: { teacher: true, academicYear: true, financialYear: true },
  });
  if (!p) return res.status(404).json({ success: false, message: 'Not found.' });
  return res.json({ success: true, data: p });
});

// POST /api/payroll/calculate — preview without saving
router.post('/calculate', authenticate, async (req, res) => {
  try {
    const calc = calculatePayroll(req.body);
    return res.json({ success: true, data: { ...req.body, ...calc } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/payroll — create
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const calc = calculatePayroll(req.body);
    let fyId = req.body.financialYearId ? parseInt(req.body.financialYearId) : null;
    if (!fyId && req.body.monthFrom) {
      const dateForResolution = req.body.monthFrom.length === 7 ? `${req.body.monthFrom}-01` : req.body.monthFrom;
      const resolved = await resolveFinancialYearByDate(dateForResolution);
      if (resolved) fyId = resolved.id;
    }

    const payroll = await prisma.payroll.create({
      data: {
        teacherId: parseInt(req.body.teacherId),
        academicYearId: parseInt(req.body.academicYearId),
        financialYearId: fyId,
        monthFrom: req.body.monthFrom,
        monthTo: req.body.monthTo,
        taha: req.body.taha,
        shreni: req.body.shreni,
        moolTalab: parseFloat(req.body.moolTalab),
        gradeNo: parseInt(req.body.gradeNo || 0),
        gradeAmount: parseFloat(req.body.gradeAmount || 0),
        mahangiGhata: parseFloat(req.body.mahangiGhata || 0),
        praABhata: parseFloat(req.body.praABhata || 0),
        sahayakPraABhata: parseFloat(req.body.sahayakPraABhata || 0),
        prabiInchargeBhata: parseFloat(req.body.prabiInchargeBhata || 0),
        mabiInchargeBhata: parseFloat(req.body.mabiInchargeBhata || 0),
        otherBhata: parseFloat(req.body.otherBhata || 0),
        otherBhataLabel: req.body.otherBhataLabel,
        karmachariKoshSapati: parseFloat(req.body.karmachariKoshSapati || 0),
        bimaKati: parseFloat(req.body.bimaKati || 0),
        peshkiKati: parseFloat(req.body.peshkiKati || 0),
        peshki: parseFloat(req.body.peshki || 0),
        paidAmount: parseFloat(req.body.paidAmount || 0),
        paymentDateBs: req.body.paymentDateBs || null,
        paymentMethod: req.body.paymentMethod || 'CASH',
        remarks: req.body.remarks,
        ...calc,
      },
      include: { teacher: true, academicYear: true, financialYear: true },
    });
    return res.status(201).json({ success: true, data: payroll });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/payroll/:id — Edit existing payroll
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const calc = calculatePayroll(req.body);
    let fyId = req.body.financialYearId ? parseInt(req.body.financialYearId) : undefined;
    if (fyId === undefined && req.body.monthFrom) {
      const dateForResolution = req.body.monthFrom.length === 7 ? `${req.body.monthFrom}-01` : req.body.monthFrom;
      const resolved = await resolveFinancialYearByDate(dateForResolution);
      if (resolved) fyId = resolved.id;
    }

    const payroll = await prisma.payroll.update({
      where: { id },
      data: {
        teacherId: req.body.teacherId ? parseInt(req.body.teacherId) : undefined,
        academicYearId: req.body.academicYearId ? parseInt(req.body.academicYearId) : undefined,
        financialYearId: fyId,
        monthFrom: req.body.monthFrom,
        monthTo: req.body.monthTo,
        taha: req.body.taha,
        shreni: req.body.shreni,
        moolTalab: req.body.moolTalab ? parseFloat(req.body.moolTalab) : undefined,
        gradeNo: req.body.gradeNo !== undefined ? parseInt(req.body.gradeNo) : undefined,
        gradeAmount: req.body.gradeAmount !== undefined ? parseFloat(req.body.gradeAmount) : undefined,
        mahangiGhata: req.body.mahangiGhata !== undefined ? parseFloat(req.body.mahangiGhata) : undefined,
        praABhata: req.body.praABhata !== undefined ? parseFloat(req.body.praABhata) : undefined,
        sahayakPraABhata: req.body.sahayakPraABhata !== undefined ? parseFloat(req.body.sahayakPraABhata) : undefined,
        prabiInchargeBhata: req.body.prabiInchargeBhata !== undefined ? parseFloat(req.body.prabiInchargeBhata) : undefined,
        mabiInchargeBhata: req.body.mabiInchargeBhata !== undefined ? parseFloat(req.body.mabiInchargeBhata) : undefined,
        otherBhata: req.body.otherBhata !== undefined ? parseFloat(req.body.otherBhata) : undefined,
        otherBhataLabel: req.body.otherBhataLabel,
        karmachariKoshSapati: req.body.karmachariKoshSapati !== undefined ? parseFloat(req.body.karmachariKoshSapati) : undefined,
        bimaKati: req.body.bimaKati !== undefined ? parseFloat(req.body.bimaKati) : undefined,
        peshkiKati: req.body.peshkiKati !== undefined ? parseFloat(req.body.peshkiKati) : undefined,
        peshki: req.body.peshki !== undefined ? parseFloat(req.body.peshki) : undefined,
        paidAmount: req.body.paidAmount !== undefined ? parseFloat(req.body.paidAmount) : undefined,
        paymentDateBs: req.body.paymentDateBs !== undefined ? req.body.paymentDateBs : undefined,
        paymentMethod: req.body.paymentMethod !== undefined ? req.body.paymentMethod : undefined,
        remarks: req.body.remarks,
        ...calc,
      },
      include: { teacher: true, academicYear: true, financialYear: true },
    });
    return res.json({ success: true, data: payroll, message: 'Payroll record updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/payroll/:id/pay — record full or partial salary disbursement
router.post('/:id/pay', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { amount, paymentDateBs, paymentMethod = 'CASH', remarks } = req.body;
    const addPayment = parseFloat(amount);
    if (isNaN(addPayment) || addPayment <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount is required.' });
    }

    const current = await prisma.payroll.findUnique({ where: { id }, include: { teacher: true } });
    if (!current) {
      return res.status(404).json({ success: false, message: 'Payroll record not found.' });
    }

    const newPaidAmount = +(current.paidAmount + addPayment).toFixed(2);
    const newRemaining = Math.max(0, +(current.khudPaaunuParne - newPaidAmount).toFixed(2));
    const newStatus = newRemaining <= 0 ? 'PAID' : 'PARTIAL';

    const updated = await prisma.payroll.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        bakiPaaunuParne: newRemaining,
        status: newStatus,
        paymentDateBs: paymentDateBs || new Date().toISOString().slice(0, 10),
        paymentMethod,
        remarks: remarks ? (current.remarks ? `${current.remarks} | ${remarks}` : remarks) : current.remarks,
      },
      include: { teacher: true, academicYear: true },
    });

    return res.json({
      success: true,
      data: updated,
      message: `Disbursement of Rs. ${addPayment.toLocaleString()} recorded. Remaining Due: Rs. ${newRemaining.toLocaleString()}. Status: ${newStatus}`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/payroll/:id/status
router.patch('/:id/status', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { status } = req.body;
    const p = await prisma.payroll.update({
      where: { id: parseInt(req.params.id) },
      data: { status },
    });
    return res.json({ success: true, data: p });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/payroll/:id
const deletePayrollHandler = async (req, res) => {
  try {
    await prisma.payroll.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ success: true, message: 'Payroll record deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), deletePayrollHandler);
router.post('/:id/delete', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), deletePayrollHandler);

// GET /api/payroll/salary-scales/list (active only)
router.get('/salary-scales/list', authenticate, async (req, res) => {
  try {
    const scales = await prisma.salaryScale.findMany({ where: { isActive: true }, orderBy: { id: 'asc' } });
    return res.json({ success: true, data: scales });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/payroll/salary-scales/all (all scales for admin management)
router.get('/salary-scales/all', authenticate, async (req, res) => {
  try {
    const scales = await prisma.salaryScale.findMany({ orderBy: { id: 'asc' } });
    return res.json({ success: true, data: scales });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/payroll/salary-scales (create)
router.post('/salary-scales', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { taha, shreni, moolTalab, gradeAmount, isActive = true } = req.body;
    const scale = await prisma.salaryScale.create({
      data: {
        taha,
        shreni,
        moolTalab: parseFloat(moolTalab),
        gradeAmount: parseFloat(gradeAmount || 0),
        isActive: Boolean(isActive),
      },
    });
    return res.status(201).json({ success: true, data: scale });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/payroll/salary-scales/:id (update existing scale)
router.put('/salary-scales/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { taha, shreni, moolTalab, gradeAmount, isActive } = req.body;
    const data = {};
    if (taha !== undefined) data.taha = taha;
    if (shreni !== undefined) data.shreni = shreni;
    if (moolTalab !== undefined) data.moolTalab = parseFloat(moolTalab);
    if (gradeAmount !== undefined) data.gradeAmount = parseFloat(gradeAmount);
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const scale = await prisma.salaryScale.update({
      where: { id: parseInt(req.params.id) },
      data,
    });
    return res.json({ success: true, data: scale });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/payroll/salary-scales/:id
router.delete('/salary-scales/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.salaryScale.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ success: true, message: 'Salary scale deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

