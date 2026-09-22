const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { sendSparrowSms } = require('../lib/sms');

const router = express.Router();

// Helper to generate next application number: BPS-ADM-2083-XXXX
async function generateApplicationNo() {
  const count = await prisma.admissionApplication.count();
  const year = '2083';
  const padded = String(count + 1).padStart(4, '0');
  return `BPS-ADM-${year}-${padded}`;
}

// ── 1. PUBLIC: SUBMIT ADMISSION APPLICATION ──────────────────────────────────
// POST /api/public/admission (or /api/admissions/public)
router.post('/public-apply', async (req, res) => {
  try {
    const {
      studentName,
      studentNameNepali,
      gender,
      dateOfBirthBs,
      dateOfBirthAd,
      bloodGroup,
      motherTongue,
      desiredClass,
      fatherName,
      fatherPhone,
      fatherOccupation,
      motherName,
      motherPhone,
      motherOccupation,
      guardianName,
      guardianContact,
      guardianRelation,
      guardianEmail,
      permanentAddress,
      temporaryAddress,
      needTransport,
      transportStop,
      previousSchool,
      previousClass,
      medicalNotes,
    } = req.body;

    if (!studentName || !desiredClass) {
      return res.status(400).json({
        success: false,
        message: 'Student Full Name and Applying Grade/Class are required.',
      });
    }

    const primaryContact = guardianContact || fatherPhone || motherPhone;
    if (!primaryContact) {
      return res.status(400).json({
        success: false,
        message: 'At least one contact phone number (Father, Mother, or Guardian) is required.',
      });
    }

    const applicationNo = await generateApplicationNo();
    const appliedDateBs = req.body.appliedDateBs || new Date().toISOString().slice(0, 10);

    const application = await prisma.admissionApplication.create({
      data: {
        applicationNo,
        studentName: studentName.trim(),
        studentNameNepali: studentNameNepali ? studentNameNepali.trim() : null,
        gender: gender || 'Male',
        dateOfBirthBs: dateOfBirthBs || null,
        dateOfBirthAd: dateOfBirthAd ? new Date(dateOfBirthAd) : null,
        bloodGroup: bloodGroup || null,
        motherTongue: motherTongue || 'Nepali',
        desiredClass: desiredClass.trim(),
        fatherName: fatherName ? fatherName.trim() : null,
        fatherPhone: fatherPhone ? fatherPhone.trim() : null,
        fatherOccupation: fatherOccupation || null,
        motherName: motherName ? motherName.trim() : null,
        motherPhone: motherPhone ? motherPhone.trim() : null,
        motherOccupation: motherOccupation || null,
        guardianName: guardianName ? guardianName.trim() : (fatherName || motherName || null),
        guardianContact: primaryContact.trim(),
        guardianRelation: guardianRelation || 'Parent',
        guardianEmail: guardianEmail ? guardianEmail.trim() : null,
        permanentAddress: permanentAddress ? permanentAddress.trim() : null,
        temporaryAddress: temporaryAddress ? temporaryAddress.trim() : null,
        needTransport: Boolean(needTransport),
        transportStop: transportStop || null,
        previousSchool: previousSchool || null,
        previousClass: previousClass || null,
        medicalNotes: medicalNotes || null,
        status: 'PENDING',
        appliedDateBs,
      },
    });

    // Create system notice for administration
    await prisma.notice.create({
      data: {
        title: `New Online Admission: ${application.studentName} (${application.desiredClass})`,
        body: `Application No: ${application.applicationNo}\nGrade: ${application.desiredClass}\nContact: ${primaryContact}\nParent: ${application.guardianName || application.fatherName || 'N/A'}\nApplied: ${appliedDateBs}`,
        type: 'GENERAL',
        targetRole: 'ADMIN',
        isAutomatic: true,
        postedDateBs: appliedDateBs,
      },
    }).catch(() => {});

    // Send SMS confirmation to parent if SMS enabled
    if (primaryContact) {
      sendSparrowSms(
        primaryContact,
        `Dear Parent, Admission Application for ${application.studentName} at Brindawan Public School was received successfully. Ref: ${application.applicationNo}. Thank you!`
      ).catch(() => {});
    }

    return res.status(201).json({
      success: true,
      message: 'Admission application submitted successfully!',
      data: application,
    });
  } catch (err) {
    console.error('Admission submit error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 2. PUBLIC: TRACK ADMISSION APPLICATION STATUS ────────────────────────────
// GET /api/admissions/track?query=...
router.get('/track', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, message: 'Application number or phone number required.' });
    }
    const clean = query.trim();
    const app = await prisma.admissionApplication.findFirst({
      where: {
        OR: [
          { applicationNo: { equals: clean } },
          { guardianContact: { equals: clean } },
          { fatherPhone: { equals: clean } },
          { motherPhone: { equals: clean } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!app) {
      return res.status(404).json({ success: false, message: 'No application found with the provided details.' });
    }

    return res.json({ success: true, data: app });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 3. ADMIN: LIST ALL APPLICATIONS ──────────────────────────────────────────
// GET /api/admissions
router.get('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { status, desiredClass, search, page = 1, limit = 50 } = req.query;
    const where = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (desiredClass && desiredClass !== 'ALL') {
      where.desiredClass = { contains: desiredClass };
    }
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { studentName: { contains: q } },
        { applicationNo: { contains: q } },
        { guardianContact: { contains: q } },
        { fatherName: { contains: q } },
      ];
    }

    const [total, applications, statsPending, statsApproved, statsAdmitted, statsTotal] = await Promise.all([
      prisma.admissionApplication.count({ where }),
      prisma.admissionApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.admissionApplication.count({ where: { status: 'PENDING' } }),
      prisma.admissionApplication.count({ where: { status: 'APPROVED' } }),
      prisma.admissionApplication.count({ where: { status: 'ADMITTED' } }),
      prisma.admissionApplication.count(),
    ]);

    return res.json({
      success: true,
      data: applications,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      stats: {
        total: statsTotal,
        pending: statsPending,
        approved: statsApproved,
        admitted: statsAdmitted,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 4. ADMIN: UPDATE APPLICATION STATUS ──────────────────────────────────────
// PUT /api/admissions/:id/status
router.put('/:id/status', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, adminRemarks } = req.body;

    const updated = await prisma.admissionApplication.update({
      where: { id },
      data: {
        status,
        adminRemarks: adminRemarks || null,
      },
    });

    return res.json({ success: true, data: updated, message: `Application marked as ${status}.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 5. ADMIN: ONE-CLICK CONVERT APPLICATION TO ENROLLED STUDENT ──────────────
// POST /api/admissions/:id/admit
router.post('/:id/admit', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      rollNo,
      customStudentId,
      section = 'A',
      admissionChargeType = 'CHARGEABLE', // 'CHARGEABLE' | 'FREE'
      admissionFeeAmount,
      transportFeeAmount,
      admissionDateBs,
      scholarshipType = 'NONE',
      discountPercent = 0,
      customMonthlyFee,
      discountRemarks,
    } = req.body;

    const app = await prisma.admissionApplication.findUnique({ where: { id } });
    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    if (app.status === 'ADMITTED' && app.enrolledStudentId) {
      return res.status(400).json({ success: false, message: 'This applicant is already enrolled as a student.' });
    }

    // Find matching class
    const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
    const academicYearId = activeYear ? activeYear.id : 1;

    let targetClass = await prisma.class.findFirst({
      where: {
        name: { contains: app.desiredClass.trim() },
        academicYearId,
      },
    });

    // Fallback: search without academicYearId
    if (!targetClass) {
      targetClass = await prisma.class.findFirst({
        where: { name: { contains: app.desiredClass.trim() } },
      });
    }

    if (!targetClass) {
      return res.status(400).json({
        success: false,
        message: `Class "${app.desiredClass}" not found in system. Please verify class list first.`,
      });
    }

    // Auto-generate student ID: e.g. 320160000 + count
    const studentCount = await prisma.student.count();
    const studentId = customStudentId || String(320160000 + studentCount + 1);
    const defaultPass = 'Student@2081';
    const passwordHash = await bcrypt.hash(defaultPass, 10);
    const effectiveAdmissionDateBs = admissionDateBs || app.appliedDateBs || new Date().toISOString().slice(0, 10);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User account
      const user = await tx.user.create({
        data: {
          username: studentId,
          passwordHash,
          role: 'STUDENT',
          isActive: true,
        },
      });

      // 2. Create Student record
      const student = await tx.student.create({
        data: {
          userId: user.id,
          studentId,
          emisId: studentId,
          fullName: app.studentName,
          fullNameNepali: app.studentNameNepali || null,
          gender: app.gender,
          dateOfBirthBs: app.dateOfBirthBs || null,
          dateOfBirthAd: app.dateOfBirthAd || null,
          bloodGroup: app.bloodGroup || null,
          address: app.permanentAddress || app.temporaryAddress || 'Brindaban Municipality, Nepal',
          fatherName: app.fatherName || null,
          motherName: app.motherName || null,
          guardianName: app.guardianName || app.fatherName || app.studentName,
          guardianContact: app.guardianContact || app.fatherPhone || app.motherPhone || null,
          previousSchool: app.previousSchool || null,
          admissionDateBs: effectiveAdmissionDateBs,
          scholarshipType: scholarshipType || 'NONE',
          discountPercent: discountPercent !== undefined ? parseFloat(discountPercent) : 0,
          customMonthlyFee: customMonthlyFee !== undefined && customMonthlyFee !== '' ? parseFloat(customMonthlyFee) : null,
          discountRemarks: discountRemarks || null,
        },
      });

      // 3. Create Class Enrollment
      await tx.classEnrollment.create({
        data: {
          studentId: student.id,
          classId: targetClass.id,
          rollNo: rollNo ? parseInt(rollNo) : (studentCount + 1),
          isActive: true,
        },
      });

      // 4. Admission Fee Due (Chargeable vs Free/Waived)
      const isChargeable = admissionChargeType !== 'FREE';
      if (isChargeable) {
        let admissionHead = await tx.feeHead.findFirst({
          where: { name: { contains: 'Admission' }, isActive: true },
        });
        const feeAmount = admissionFeeAmount !== undefined && admissionFeeAmount !== ''
          ? parseFloat(admissionFeeAmount)
          : (admissionHead?.amount || 2000);

        if (!admissionHead) {
          admissionHead = await tx.feeHead.create({
            data: {
              name: 'Admission Fee',
              nameNepali: 'भर्ना शुल्क',
              amount: feeAmount,
              isActive: true,
            },
          });
        }
        if (feeAmount > 0) {
          await tx.studentFeeDue.create({
            data: {
              studentId: student.id,
              feeHeadId: admissionHead.id,
              amount: feeAmount,
              dueDateBs: effectiveAdmissionDateBs,
              remarks: `Admission Fee for ${targetClass.name} (Admitted: ${effectiveAdmissionDateBs})`,
            },
          }).catch(() => {});
        }
      }

      // 5. Transportation Fee Due if applicable
      const transAmount = transportFeeAmount ? parseFloat(transportFeeAmount) : 0;
      if (transAmount > 0) {
        let transportHead = await tx.feeHead.findFirst({
          where: { name: { contains: 'Transport' }, isActive: true },
        });
        if (!transportHead) {
          transportHead = await tx.feeHead.create({
            data: {
              name: 'Transportation Fee',
              nameNepali: 'यातायात शुल्क',
              amount: transAmount,
              isActive: true,
            },
          });
        }
        await tx.studentFeeDue.create({
          data: {
            studentId: student.id,
            feeHeadId: transportHead.id,
            amount: transAmount,
            dueDateBs: effectiveAdmissionDateBs,
            remarks: `Monthly Transportation Fee (${app.transportStop || 'Bus Route'})`,
          },
        }).catch(() => {});
      }

      // 6. Update application
      await tx.admissionApplication.update({
        where: { id: app.id },
        data: {
          status: 'ADMITTED',
          enrolledStudentId: student.id,
          adminRemarks: `Admitted into ${targetClass.name} with Roll No: ${rollNo || (studentCount + 1)} (${isChargeable ? 'Chargeable' : 'Free Admission'})`,
        },
      });

      return { student, user, defaultPass, targetClass };
    });

    return res.status(201).json({
      success: true,
      message: `Student "${result.student.fullName}" enrolled successfully into ${result.targetClass.name}!`,
      data: {
        student: result.student,
        class: result.targetClass,
        credentials: {
          username: result.student.studentId,
          password: result.defaultPass,
        },
      },
    });
  } catch (err) {
    console.error('Admission admit error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
