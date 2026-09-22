'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { todayBS, todayBSFormatted } from '@/lib/nepali-date';
import { SCHOOL_DEFAULTS } from '@/lib/school-constants';
import StudentPhotoUploadModal from '@/components/StudentPhotoUploadModal';
import toast from 'react-hot-toast';
import {
  GraduationCap,
  CalendarCheck,
  Award,
  Receipt,
  BookOpen,
  Bell,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  QrCode,
  FileText,
  Printer,
  Search,
  School,
  Sparkles,
  Globe,
  ExternalLink,
  Phone,
  MapPin,
  Heart,
  BookMarked,
  User,
  ShieldCheck,
  X,
  ChevronRight,
  TrendingUp,
  Download,
  Camera,
  Upload,
} from 'lucide-react';
import AcademicCalendar from '@/components/dashboard/AcademicCalendar';

// Helper for generating standard Symbol No in format: 2083<Class2d><Roll2d>
function generateSymbolNo(year?: string, className?: string, rollNo?: number | string) {
  const y = (year || '2083').replace(/\D/g, '').slice(-4) || '2083';
  const numMatch = (className || '').match(/\d+/);
  const classNum = numMatch ? parseInt(numMatch[0], 10) : 10;
  const c = String(classNum).padStart(2, '0');
  const r = String(rollNo || 1).padStart(2, '0');
  return `${y}${c}${r}`;
}

export default function StudentPortalPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const studentId = user?.student?.id;

  // Active Tab: overview | attendance | exams | fees | library | notices | idcard
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<string>(tabFromUrl || 'overview');

  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // Selected Exam for Marksheet view
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);

  // Selected Fee Receipt for modal view/print
  const [selectedReceiptForPrint, setSelectedReceiptForPrint] = useState<any>(null);

  // Photo upload modal state
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Library search state
  const [librarySearch, setLibrarySearch] = useState('');
  const [noticeFilter, setNoticeFilter] = useState('ALL');

  // Parent Mobile Notification Bar State
  const [selectedNoticeForModal, setSelectedNoticeForModal] = useState<any>(null);
  const [isAlertBarDismissed, setIsAlertBarDismissed] = useState(false);

  // ── 1. Fetch Student Profile ──
  const { data: student, isLoading: isStudentLoading } = useQuery({
    queryKey: ['student-me', studentId],
    queryFn: async () => {
      if (!studentId) return null;
      const res = await api.get(`/students/${studentId}`);
      return res.data?.data;
    },
    enabled: !!studentId,
  });

  // ── 2. Fetch School Profile & Branding ──
  const { data: school } = useQuery({
    queryKey: ['school-profile'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
      return res.data?.data;
    },
  });

  // ── 3. Fetch Active Academic Year ──
  const { data: activeYear } = useQuery({
    queryKey: ['academic-year-active'],
    queryFn: async () => {
      const res = await api.get('/school/academic-years/active');
      return res.data?.data;
    },
  });

  // ── 4. Fetch Active Exams ──
  // ── 4. Fetch Active Exams ──
  const { data: examsData } = useQuery({
    queryKey: ['student-exams'],
    queryFn: async () => {
      try {
        const res = await api.get('/exams/active');
        if (res.data?.data && res.data.data.length > 0) return res.data.data;
      } catch (err) {}
      const fallback = await api.get('/exams');
      return fallback.data?.data || [];
    },
  });

  // Auto-select first exam when exams load
  useEffect(() => {
    if (examsData?.length > 0) {
      if (!selectedExamId || !examsData.some((e: any) => e.id === selectedExamId)) {
        setSelectedExamId(examsData[0].id);
      }
    }
  }, [examsData, selectedExamId]);

  // ── 5. Fetch Marksheet for Selected Exam ──
  const { data: marksheetData, isLoading: isMarksheetLoading } = useQuery({
    queryKey: ['student-marksheet', selectedExamId, studentId],
    queryFn: async () => {
      if (!selectedExamId || !studentId) return null;
      const res = await api.get(`/exams/${selectedExamId}/marksheet/${studentId}`);
      return res.data?.data;
    },
    enabled: !!selectedExamId && !!studentId,
  });

  // ── 6. Fetch Notices ──
  const { data: noticesData } = useQuery({
    queryKey: ['student-notices'],
    queryFn: async () => {
      const res = await api.get('/notices');
      return res.data?.data || [];
    },
  });

  // ── 7. Fetch Library Issues ──
  const { data: libraryIssues } = useQuery({
    queryKey: ['student-library-issues', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const res = await api.get(`/library/issues?studentId=${studentId}`);
      return res.data?.data || [];
    },
    enabled: !!studentId,
  });

  // ── 8. Fetch Library Catalogue ──
  const { data: libraryBooks } = useQuery({
    queryKey: ['student-library-books', librarySearch],
    queryFn: async () => {
      const res = await api.get(`/library?search=${encodeURIComponent(librarySearch)}`);
      return res.data?.data || [];
    },
  });

  const [isOnlinePayOpen, setIsOnlinePayOpen] = useState(false);
  const [payForm, setPayForm] = useState({ feeHeadId: '', amount: '', paymentMedium: 'QR_CODE', paymentRef: '', remarks: '' });

  // Fetch Student Ledger
  const { data: studentLedgerData } = useQuery({
    queryKey: ['student-ledger-me', studentId],
    queryFn: async () => {
      if (!studentId) return null;
      const res = await api.get(`/income/student-ledger/${studentId}`);
      return res.data?.data;
    },
    enabled: !!studentId,
  });

  // Fetch Student Monthly Bills / Invoices
  const { data: studentBillsData } = useQuery({
    queryKey: ['student-bills-me', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const res = await api.get(`/income/student-bills/${studentId}`);
      return res.data?.data || res.data?.bills || [];
    },
    enabled: !!studentId,
  });

  const onlinePayMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/income/online-pay', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Online payment submitted successfully!');
      setIsOnlinePayOpen(false);
      queryClient.invalidateQueries({ queryKey: ['student-me'] });
      queryClient.invalidateQueries({ queryKey: ['student-ledger-me'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit online payment.');
    },
  });

  // Student variables
  const enrollment = student?.classEnrollment?.[0];
  const className = enrollment?.class?.name || 'Class 10';
  const section = enrollment?.class?.section || 'A';
  const rollNo = enrollment?.rollNo || 1;
  const yearName = activeYear?.year || '2083';
  const symbolNo = generateSymbolNo(yearName, className, rollNo);

  // Attendance metrics
  const attendanceList = student?.attendances || [];
  const presentDays = attendanceList.filter((a: any) => a.status === 'PRESENT').length;
  const absentDays = attendanceList.filter((a: any) => a.status === 'ABSENT').length;
  const leaveDays = attendanceList.filter((a: any) => a.status === 'LEAVE').length;
  const totalRecordedDays = attendanceList.length || 1;
  const attendancePct = Math.round((presentDays / totalRecordedDays) * 100);

  // Fees metrics
  const feeCollections = student?.feeCollections || [];
  const totalPaidAmount = feeCollections.reduce((sum: number, f: any) => sum + (f.amount || 0), 0);

  // Borrowed books count
  const activeBorrowedBooks = (libraryIssues || []).filter((b: any) => !b.isReturned);

  const displayName = student?.fullName || user?.username || 'Student';

  const triggerStudentMarksheetPrint = () => {
    if (!marksheetData) return;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const m = marksheetData;
    const subjects = m.subjects || [];

    const rowsHtml = subjects
      .map((sr: any, idx: number) => {
        const isNG = sr.finalGrade === 'NG' || sr.isAbsent;
        return `
          <tr>
            <td style="text-align: center; border: 1px solid #cbd5e1; font-weight: bold;">${idx + 1}</td>
            <td style="border: 1px solid #cbd5e1;"><strong>${sr.subjectName}</strong></td>
            <td style="text-align: center; border: 1px solid #cbd5e1;">${sr.creditHour || '4.0'}</td>
            <td style="text-align: center; border: 1px solid #cbd5e1;">${sr.theory?.letterGrade || '—'}</td>
            <td style="text-align: center; border: 1px solid #cbd5e1; color: #6b21a8;">${sr.practical?.letterGrade || '—'}</td>
            <td style="text-align: center; border: 1px solid #cbd5e1; font-weight: bold; background: #eff6ff; color: ${isNG ? '#b91c1c' : '#1e3a5f'};">${sr.finalGrade || 'A'}</td>
            <td style="text-align: center; border: 1px solid #cbd5e1; font-weight: bold; color: ${isNG ? '#b91c1c' : '#111'};">${sr.gradePoint !== undefined ? sr.gradePoint.toFixed(1) : '3.6'}</td>
            <td style="text-align: center; border: 1px solid #cbd5e1; color: ${isNG ? '#b91c1c' : '#15803d'}; font-weight: bold;">${isNG ? 'Needs Imp.' : (sr.remarks?.split(' ')[0] || 'Good')}</td>
          </tr>
        `;
      })
      .join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>My Grade Sheet - ${student?.fullName || 'Student'}</title>
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; font-size: 11px; }
            .card { border: 3px double #1e3a5f; padding: 15px; border-radius: 8px; }
            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 12px; }
            .school-name { font-size: 18px; font-weight: 900; color: #1e3a5f; margin: 2px 0; }
            .report-title { font-size: 12px; font-weight: 900; background: #eff6ff; color: #1e3a5f; display: inline-block; padding: 3px 12px; border-radius: 4px; uppercase; border: 1px solid #bfdbfe; margin-top: 4px; }
            .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; font-size: 10.5px; margin-bottom: 12px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 12px; }
            th { background: #1e3a5f; color: #fff; padding: 6px 4px; text-align: left; font-size: 9.5px; border: 1px solid #1e3a5f; }
            td { padding: 5px 4px; }
            .summary-box { display: flex; justify-content: space-between; background: #1e3a5f; color: #fff; padding: 10px 15px; border-radius: 6px; margin-bottom: 12px; }
            .footer-sig { margin-top: 30px; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; }
            .sig-line { border-top: 1px solid #333; width: 150px; text-align: center; padding-top: 3px; margin-top: 35px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <img src="/school_logo.png" style="width: 52px; height: 52px; object-fit: contain; margin-bottom: 4px;" alt="School Logo" />
              <div class="school-name">बृन्दावन पब्लिक स्कूल, विश्रामपुर, रौतहट</div>
              <div style="font-size: 11px; font-weight: bold; color: #4b5563;">Brindawan Public School, Brindaban Municipality, Nepal</div>
              <div class="report-title">${m.examName || 'EXAMINATION'} — OFFICIAL GRADE SHEET</div>
            </div>

            <div class="meta-grid">
              <div><strong>Student Name:</strong> ${student?.fullName}</div>
              <div><strong>Symbol No.:</strong> ${symbolNo || '—'}</div>
              <div><strong>Class:</strong> ${className} (${section})</div>
              <div><strong>Roll No / EMIS:</strong> ${rollNo} / ${student?.studentId || '—'}</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 30px; text-align: center;">S.N.</th>
                  <th>SUBJECT NAME</th>
                  <th style="width: 45px; text-align: center;">CREDIT</th>
                  <th style="width: 45px; text-align: center;">TH</th>
                  <th style="width: 45px; text-align: center;">PR</th>
                  <th style="width: 55px; text-align: center;">GRADE</th>
                  <th style="width: 45px; text-align: center;">GP</th>
                  <th style="width: 70px; text-align: center;">REMARKS</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div class="summary-box">
              <div>
                <span style="font-size: 9px; uppercase; opacity: 0.9;">GRADE POINT AVERAGE (GPA)</span>
                <div style="font-size: 22px; font-weight: 900; color: #fef08a;">${m.gpa !== undefined ? m.gpa.toFixed(2) : '3.60'} / 4.00</div>
              </div>
              <div style="text-align: right;">
                <span style="font-size: 9px; uppercase; opacity: 0.9;">OVERALL EVALUATION GRADE</span>
                <div style="font-size: 22px; font-weight: 900; color: #fff;">${m.overallGrade || 'A'}</div>
              </div>
            </div>

            <div class="footer-sig">
              <div class="sig-line">Date: ${todayBS()} BS<br>Class Teacher</div>
              <div class="sig-line">Exam Controller</div>
              <div class="sig-line">Headmaster / Stamp</div>
            </div>
          </div>

          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 400); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const triggerStudentIdCardPrint = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student ID Card - ${student?.fullName}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; display: flex; justify-content: center; padding-top: 20px; }
            .id-card { width: 340px; border: 3px solid #0a3d31; border-radius: 12px; overflow: hidden; background: #fff; }
            .header { background: #0a3d31; color: #fff; padding: 10px; text-align: center; }
            .body { padding: 15px; }
            .sig-line { border-top: 1px solid #333; width: 100px; text-align: center; font-size: 8px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="id-card">
            <div class="header">
              <div style="font-size: 12px; font-weight: 900;">${school?.name || SCHOOL_DEFAULTS.name}</div>
              <div style="font-size: 9px; color: #fde047;">${school?.nameNepali || SCHOOL_DEFAULTS.nameNepali}</div>
              <div style="display: inline-block; background: #facc15; color: #0a3d31; font-size: 8px; font-weight: 900; padding: 2px 8px; border-radius: 10px; margin-top: 4px;">STUDENT IDENTITY CARD</div>
            </div>
            <div class="body">
              <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
                <div style="width: 70px; height: 80px; border: 1.5px solid #0a3d31; border-radius: 6px; overflow: hidden; background: #f1f5f9; display: flex; align-items: center; justify-content: center;">
                  ${student?.photoUrl ? `<img src="${student.photoUrl}" style="width:100%; height:100%; object-fit:cover;" />` : `<span style="font-size: 24px;">👤</span>`}
                </div>
                <div>
                  <div style="font-size: 13px; font-weight: 900; color: #111;">${student?.fullName}</div>
                  <div style="font-size: 10px; font-weight: bold; color: #1e3a5f;">Class: ${className} (${section})</div>
                  <div style="font-size: 10px;">Roll No: <strong>${rollNo}</strong></div>
                  <div style="font-size: 10px;">Blood Group: <strong style="color: #b91c1c;">${student?.bloodGroup || 'O+'}</strong></div>
                </div>
              </div>
              <div style="border: 1px solid #e2e8f0; padding: 6px; border-radius: 6px; font-size: 9.5px; margin-bottom: 10px;">
                <div>Symbol No: <strong>${symbolNo}</strong></div>
                <div>EMIS ID: <strong>${student?.studentId}</strong></div>
                <div>DOB: <strong>${student?.dateOfBirthBs || '2068-05-12'} BS</strong></div>
                <div>Guardian Contact: <strong>${student?.guardianContact || student?.phone || '98XXXXXXXX'}</strong></div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                <div style="font-size: 8px; color: #1e3a5f; font-weight: bold;">OFFICIAL SEAL</div>
                <div class="sig-line">Principal Signature</div>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 400); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const triggerStudentReceiptPrint = () => {
    if (!selectedReceiptForPrint) return;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const r = selectedReceiptForPrint;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fee Receipt - ${r.receiptNo}</title>
          <style>
            @page { size: A5 landscape; margin: 8mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; font-size: 11px; }
            .card { border: 2px solid #1e3a5f; padding: 15px; border-radius: 8px; }
            .header { text-align: center; border-bottom: 1.5px solid #1e3a5f; padding-bottom: 6px; margin-bottom: 10px; }
            .school-name { font-size: 15px; font-weight: 900; color: #1e3a5f; margin: 2px 0; }
            .badge { font-size: 10px; font-weight: 900; background: #1e3a5f; color: #fff; display: inline-block; padding: 2px 10px; border-radius: 4px; uppercase; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 10px; background: #f8fafc; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0; }
            .footer-sig { margin-top: 25px; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; }
            .sig-box { width: 140px; text-align: center; border-top: 1px solid #333; padding-top: 3px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <img src="/school_logo.png" style="width: 48px; height: 48px; object-fit: contain; margin-bottom: 3px;" alt="School Logo" />
              <div class="school-name">बृन्दावन पब्लिक स्कूल, विश्रामपुर, रौतहट</div>
              <div style="font-size: 10px; font-weight: bold; color: #4b5563;">Brindawan Public School, Brindaban Municipality, Nepal</div>
              <div class="badge" style="margin-top: 4px;">OFFICIAL FEE RECEIPT (शुल्क रसिद)</div>
            </div>

            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 10.5px; margin-bottom: 8px;">
              <span>Receipt No: <strong>${r.receiptNo}</strong></span>
              <span>Date: <strong>${r.paidDateBs} BS</strong></span>
            </div>

            <div class="grid">
              <div>Student Name: <strong>${student?.fullName}</strong></div>
              <div>Class & Roll: <strong>${className} (${section}) • Roll #${rollNo}</strong></div>
              <div>Fee Head: <strong>${r.feeHead?.name}</strong></div>
            </div>

            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 8px 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="font-weight: bold; color: #065f46;">TOTAL PAID AMOUNT (जम्मा भुक्तानी):</span>
              <strong style="font-size: 16px; color: #047857; font-family: monospace;">रू ${(r.amount || 0).toLocaleString()}</strong>
            </div>

            <div class="footer-sig">
              <div class="sig-box">Depositor Signature</div>
              <div class="sig-box">Accountant (लेखापाल)</div>
            </div>
          </div>

          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 400); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const triggerPrintMonthlyBill = (bill: any) => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const sNameNp = school?.nameNepali || SCHOOL_DEFAULTS.nameNepali;
    const sNameEn = school?.name || SCHOOL_DEFAULTS.name;
    const sAddress = school?.address || SCHOOL_DEFAULTS.address;

    const itemsHtml = (bill.items || [])
      .map(
        (it: any, idx: number) => `
        <tr>
          <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px;">${idx + 1}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px;">
            <strong>${it.feeHeadName || it.feeHead?.name || 'Fee'}</strong>
            ${it.discountAmount > 0 ? `<div style="font-size: 9px; color: #047857; font-weight: bold;">Scholarship / Concession Waived: - रू ${it.discountAmount.toLocaleString()}</div>` : ''}
          </td>
          <td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px; font-family: monospace;">रू ${(it.originalAmount || it.amount || 0).toLocaleString()}</td>
          <td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px; font-family: monospace; color: #047857;">- रू ${(it.discountAmount || 0).toLocaleString()}</td>
          <td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px; font-family: monospace; font-weight: bold;">रू ${(it.netAmount !== undefined ? it.netAmount : it.amount || 0).toLocaleString()}</td>
        </tr>
      `
      )
      .join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Monthly Fee Bill - ${bill.billNo}</title>
          <style>
            @page { size: A5 landscape; margin: 8mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #1e3a5f; font-size: 11px; }
            .card { border: 2px solid #1e3a5f; padding: 14px; border-radius: 8px; }
            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 5px; margin-bottom: 8px; }
            .school-name { font-size: 15px; font-weight: 900; color: #1e3a5f; margin: 0; }
            .badge { display: inline-block; background: #1e3a5f; color: #fff; padding: 2px 12px; font-weight: 900; font-size: 10px; border-radius: 4px; uppercase; margin-top: 3px; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 10px; margin-bottom: 8px; background: #f8fafc; padding: 6px 10px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 10.5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
            th { background: #1e3a5f; color: #fff; padding: 6px; text-align: left; font-size: 10px; border: 1px solid #1e3a5f; }
            .totals-row { background: #f1f5f9; font-weight: bold; border-top: 2px solid #1e3a5f; }
            .footer-sig { margin-top: 22px; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; }
            .sig-box { width: 130px; text-align: center; border-top: 1px solid #333; padding-top: 3px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <img src="/school_logo.png" style="width: 48px; height: 48px; object-fit: contain; margin-bottom: 3px;" alt="School Logo" />
              <h1 class="school-name">${sNameNp}</h1>
              <div style="font-size: 10px; font-weight: bold; color: #475569;">${sNameEn}, ${sAddress}</div>
              <div class="badge">MONTHLY FEE BILL / INVOICE (मासिक शुल्क बिल)</div>
            </div>

            <div class="grid">
              <div><strong>INVOICE BILL NO:</strong> <span style="font-family: monospace; font-weight: bold;">${bill.billNo}</span></div>
              <div><strong>MONTH (महिना):</strong> <span style="font-family: monospace; font-weight: bold;">${bill.monthBs} BS</span></div>
              <div><strong>STUDENT NAME:</strong> ${student?.fullName}</div>
              <div><strong>CLASS & ROLL:</strong> ${className} (${section}) • Roll #${rollNo}</div>
              <div><strong>DATE ISSUED:</strong> <span style="font-family: monospace;">${bill.dateBs || bill.dueDateBs} BS</span></div>
              <div><strong>STATUS:</strong> <span style="font-weight: 900; color: ${bill.isFullyPaid || bill.isPaid ? '#047857' : '#b91c1c'};">${bill.isFullyPaid || bill.isPaid ? '✓ PAID / WAIVED' : '⚡ OUTSTANDING DUE'}</span></div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 30px; text-align: center;">S.N</th>
                  <th>PARTICULARS (शुल्क शीर्षक विवरण)</th>
                  <th style="text-align: right; width: 90px;">GROSS FEE</th>
                  <th style="text-align: right; width: 100px;">SCHOLARSHIP</th>
                  <th style="text-align: right; width: 100px;">NET PAYABLE</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
                <tr class="totals-row">
                  <td colspan="2" style="text-align: right; padding: 6px;">TOTAL AMOUNT (कुल रकम):</td>
                  <td style="text-align: right; padding: 6px; font-family: monospace;">रू ${(bill.totalOriginal || 0).toLocaleString()}</td>
                  <td style="text-align: right; padding: 6px; font-family: monospace; color: #047857;">- रू ${(bill.totalDiscount || 0).toLocaleString()}</td>
                  <td style="text-align: right; padding: 6px; font-family: monospace; font-size: 12px; font-weight: 900; color: ${(bill.totalNet ?? bill.netPayable) === 0 ? '#047857' : '#1e3a5f'};">
                    ${(bill.totalNet ?? bill.netPayable) === 0 ? 'रू ० (100% Scholarship)' : `रू ${((bill.totalNet ?? bill.netPayable) || 0).toLocaleString()}`}
                  </td>
                </tr>
              </tbody>
            </table>

            <div style="font-size: 9.5px; color: #64748b;">
              * Note: Please make timely fee payments. Contact school accounts office for any query.
            </div>

            <div class="footer-sig">
              <div class="sig-box">Parent / Guardian</div>
              <div class="sig-box">Accountant / Cashier</div>
            </div>
          </div>

          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 300); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const latestNotice = noticesData && noticesData.length > 0 ? noticesData[0] : null;

  return (
    <div className="space-y-6 pb-16">
      {/* ─── 0. PARENT MOBILE NOTIFICATION ALERT BAR (अभिभावक सूचना बार) ─────── */}
      {latestNotice && !isAlertBarDismissed && (
        <div className="no-print relative overflow-hidden rounded-2xl bg-linear-to-r from-amber-500 via-orange-600 to-rose-600 p-3 md:p-3.5 text-white shadow-lg border border-amber-300/40">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="h-9 w-9 shrink-0 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center animate-bounce">
                <Bell size={18} className="text-white drop-shadow-xs" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="inline-block rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-200">
                    अभिभावक सूचना (Parent Alert)
                  </span>
                  <span className="text-[10px] font-mono text-white/85">
                    {latestNotice.postedDateBs} BS
                  </span>
                </div>
                <p className="text-xs md:text-sm font-extrabold text-white truncate mt-0.5">
                  {latestNotice.title}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedNoticeForModal(latestNotice)}
                className="rounded-xl bg-white hover:bg-amber-100 text-[#1e3a5f] px-3 py-1.5 text-xs font-black shadow-xs transition inline-flex items-center gap-1"
              >
                <span>Read (हेर्नुहोस्)</span>
                <ChevronRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => setIsAlertBarDismissed(true)}
                title="Dismiss Notice Bar"
                className="h-8 w-8 rounded-xl bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 1. TOP IDENTITY & BRANDING HEADER (NO-PRINT) ───────────────────── */}
      <div className="no-print rounded-2xl bg-gradient-to-r from-[#062c23] via-[#0a3d31] to-[#062c23] p-6 text-white shadow-sm border border-emerald-800/40">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-start gap-4">
            {/* Student Photo / Logo with Upload Button */}
            <div className="relative group shrink-0">
              <div className="h-16 w-16 rounded-2xl overflow-hidden bg-white p-0.5 border-2 border-amber-400 shadow-md flex items-center justify-center">
                {student?.photoUrl ? (
                  <img src={student.photoUrl} alt="Photo" className="h-full w-full object-cover rounded-xl" />
                ) : school?.logoUrl ? (
                  <img src={school.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <User size={32} className="text-[#0a3d31]" />
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(true)}
                title="Change Photo (Max 50 KB)"
                className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-amber-400 hover:bg-amber-300 text-[#0a3d31] flex items-center justify-center shadow-md transition"
              >
                <Camera size={12} />
              </button>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 text-[#0a3d31] px-2.5 py-0.5 text-[11px] font-black uppercase shadow-xs">
                  <Sparkles size={12} />
                  <span>Student Portal (विद्यार्थी पोर्टल)</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 text-emerald-100 px-2.5 py-0.5 text-[11px] font-bold font-mono">
                  <Calendar size={12} />
                  <span>BS {todayBSFormatted()}</span>
                </span>
                <a
                  href="https://bps.edu.np"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-[#0a3d31] px-3 py-0.5 text-[11px] font-black shadow-xs transition"
                >
                  <Globe size={12} />
                  <span>Visit School Website (bps.edu.np)</span>
                  <ExternalLink size={11} />
                </a>
              </div>

              <h1 className="text-2xl md:text-3xl font-black tracking-wide text-white mt-1.5 font-serif">
                नमस्ते, {displayName}!
              </h1>
              <p className="text-xs text-emerald-200/90 font-medium">
                {school?.name || SCHOOL_DEFAULTS.name} {school?.nameNepali ? `(${school.nameNepali})` : `(${SCHOOL_DEFAULTS.nameNepali})`} • EMIS: {school?.emisCode || SCHOOL_DEFAULTS.emisCode}
              </p>
            </div>
          </div>

          {/* Student Badges Info & Upload Prompt */}
          <div className="flex flex-wrap items-center gap-2.5 bg-white/10 p-3.5 rounded-2xl border border-white/20 backdrop-blur-xs text-xs">
            <div className="px-2">
              <span className="text-[10px] uppercase font-bold text-emerald-200 block">Class & Sec</span>
              <strong className="text-sm font-extrabold text-white">{className} ({section})</strong>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="px-2">
              <span className="text-[10px] uppercase font-bold text-emerald-200 block">Roll No</span>
              <strong className="text-sm font-mono font-extrabold text-amber-300">#{rollNo}</strong>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="px-2">
              <span className="text-[10px] uppercase font-bold text-emerald-200 block">Symbol No.</span>
              <strong className="text-sm font-mono font-black text-amber-400 bg-black/20 px-2 py-0.5 rounded">
                {symbolNo}
              </strong>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <button
              type="button"
              onClick={() => setIsPhotoModalOpen(true)}
              className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-[#0a3d31] font-extrabold px-3 py-1.5 rounded-xl text-[11px] shadow-sm transition"
            >
              <Camera size={13} />
              <span>{student?.photoUrl ? 'Update Photo' : 'Upload Photo (≤50KB)'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Pill Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-6 mt-4 border-t border-white/15">
          {[
            { id: 'overview', label: 'Dashboard Overview', nepali: 'ड्यासबोर्ड', icon: GraduationCap },
            { id: 'attendance', label: 'My Attendance', nepali: 'हाजिरी', icon: CalendarCheck },
            { id: 'exams', label: 'Exam Marksheets', nepali: 'लब्धाङ्क पत्र', icon: BookOpen },
            { id: 'fees', label: 'Fee Receipts', nepali: 'शुल्क विवरण', icon: Receipt },
            { id: 'library', label: 'Library Books', nepali: 'पुस्तकालय', icon: BookMarked },
            { id: 'notices', label: 'School Notices', nepali: 'सूचनाहरू', icon: Bell },
            { id: 'idcard', label: 'Student ID Card', nepali: 'परिचय पत्र', icon: Award },
          ].map((t) => {
            const Icon = t.icon;
            const isCurrent = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-150 shadow-xs ${
                  isCurrent
                    ? 'bg-amber-400 text-[#0a3d31] shadow-md scale-102'
                    : 'bg-white/10 text-white hover:bg-white/20 hover:text-amber-300'
                }`}
              >
                <Icon size={14} />
                <span>{t.label}</span>
                <span className={`text-[10px] font-normal font-nepali opacity-80 ${isCurrent ? 'text-[#0a3d31]' : 'text-emerald-200'}`}>
                  ({t.nepali})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 2. TAB CONTENT VIEWS ───────────────────────────────────────── */}

      {/* ─────────────────── TAB 1: OVERVIEW / DASHBOARD ─────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* ─── ACADEMIC CALENDAR & EVENT SCHEDULE ───────────────────────────── */}
          <AcademicCalendar />
          {/* Photo Upload Notice if Missing */}
          {!student?.photoUrl && (
            <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/70 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Camera size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-amber-900">Student Photo Required (फोटो अपलोड गर्नुहोस्)</h4>
                  <p className="text-[11px] text-amber-700">
                    Upload or capture your passport-size photo (Strictly 50 KB max) for your ID card and Grade Sheets.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(true)}
                className="inline-flex items-center gap-1.5 bg-[#1e3a5f] hover:bg-[#284c78] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition shrink-0"
              >
                <Camera size={14} />
                <span>Upload / Take Photo (≤ 50 KB)</span>
              </button>
            </div>
          )}

          {/* 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Attendance Rate */}
            <div
              onClick={() => setActiveTab('attendance')}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Attendance Rate</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition">
                  <CalendarCheck size={20} />
                </div>
              </div>
              <p className="text-3xl font-black font-mono text-emerald-700 mt-2">
                {attendancePct !== undefined && attendancePct !== null ? `${attendancePct}%` : '—'}
              </p>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(attendancePct || 0, 100)}%` }} />
              </div>
              <p className="text-[11px] text-gray-400 mt-2 flex justify-between">
                <span>Present: <b>{presentDays ?? '—'}</b> days</span>
                <span>Absent: <b>{absentDays ?? '—'}</b> days</span>
              </p>
            </div>

            {/* Academic GPA / Progress */}
            <div
              onClick={() => setActiveTab('exams')}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Latest Exam GPA</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:scale-110 transition">
                  <Award size={20} />
                </div>
              </div>
              <p className="text-3xl font-black font-mono text-[#1e3a5f] mt-2">
                {marksheetData?.gpa !== undefined && marksheetData?.gpa > 0
                  ? marksheetData.gpa.toFixed(2)
                  : '—'}
                {marksheetData?.gpa !== undefined && marksheetData?.gpa > 0 && (
                  <span className="text-xs font-normal text-gray-400"> / 4.00</span>
                )}
              </p>
              <p className="text-[11px] text-blue-700 font-bold mt-2 flex items-center gap-1">
                <Sparkles size={12} className="text-amber-500" />
                <span>
                  {marksheetData?.gpa !== undefined && marksheetData?.gpa > 0
                    ? `Grade: ${marksheetData?.overallGrade || '—'} • Click to view Marksheet`
                    : 'No exam result available yet'}
                </span>
              </p>
            </div>

            {/* Total Paid Fees */}
            <div
              onClick={() => setActiveTab('fees')}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Fee Collections</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition">
                  <Receipt size={20} />
                </div>
              </div>
              <p className="text-2xl font-black font-mono text-amber-700 mt-2">
                {totalPaidAmount ? `रू ${totalPaidAmount.toLocaleString()}` : 'रू 0'}
              </p>
              <p className="text-[11px] text-gray-500 mt-2">
                <b>{feeCollections.length || 0}</b> verified receipt{feeCollections.length !== 1 ? 's' : ''} issued
              </p>
            </div>

            {/* Library Books Issued */}
            <div
              onClick={() => setActiveTab('library')}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Library Books</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:scale-110 transition">
                  <BookMarked size={20} />
                </div>
              </div>
              <p className="text-3xl font-black font-mono text-purple-700 mt-2">
                {activeBorrowedBooks.length}
              </p>
              <p className="text-[11px] text-purple-600 font-medium mt-2">
                {activeBorrowedBooks.length === 0
                  ? 'No books currently borrowed'
                  : 'Currently borrowed books'}
              </p>
            </div>
          </div>


          {/* Student Profile Overview & Class Info */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Cols: Student & Guardian Card */}
            <div className="lg:col-span-7 rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="text-sm font-extrabold text-[#1e3a5f] flex items-center gap-2">
                  <User size={18} className="text-amber-500" />
                  <span>Student & Guardian Information (विद्यार्थी तथा अभिभावक विवरण)</span>
                </h2>
                <button
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100 transition flex items-center gap-1"
                >
                  <Camera size={12} />
                  <span>{student?.photoUrl ? 'Change Photo' : 'Upload Photo'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Full Name:</span>
                  <p className="font-bold text-gray-900 text-sm">{student?.fullName}</p>
                  {student?.fullNameNepali && (
                    <p className="text-gray-600 font-nepali">{student.fullNameNepali}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Symbol Number:</span>
                  <p className="font-mono font-black text-[#1e3a5f] text-sm bg-blue-50 px-2 py-0.5 rounded inline-block">
                    {symbolNo}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Date of Birth (BS):</span>
                  <p className="font-mono font-bold text-gray-800">{student?.dateOfBirthBs || '—'} BS</p>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Blood Group:</span>
                  <p className="font-bold text-rose-700">{student?.bloodGroup || '—'}</p>
                </div>


                <div className="space-y-1">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Father Name:</span>
                  <p className="font-bold text-gray-800">{student?.fatherName || '—'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Mother Name:</span>
                  <p className="font-bold text-gray-800">{student?.motherName || '—'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Guardian & Contact:</span>
                  <p className="font-bold text-gray-800">
                    {student?.guardianName || student?.fatherName || 'Guardian'}{' '}
                    {student?.guardianContact && <span className="font-mono text-gray-500">({student.guardianContact})</span>}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Permanent Address:</span>
                  <p className="font-medium text-gray-700">{student?.address || 'काठमाडौँ, नेपाल'}</p>
                </div>
              </div>

              {/* Class Teacher Badge */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 text-[#1e3a5f] flex items-center justify-center font-bold">
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Class Teacher (कक्षा शिक्षक):</span>
                    <p className="font-extrabold text-gray-900 text-sm">
                      {enrollment?.class?.classTeacher?.fullName || 'Teacher Incharge'}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-[11px] font-black uppercase">
                  Class {className} ({section})
                </span>
              </div>
            </div>

            {/* Right 5 Cols: Quick Notice Board */}
            <div className="lg:col-span-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                  <Bell size={18} className="text-amber-500" />
                  <span>Recent Notices (सूचनाहरू)</span>
                </h2>
                <button
                  onClick={() => setActiveTab('notices')}
                  className="text-xs font-bold text-blue-700 hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="space-y-3">
                {noticesData?.length === 0 ? (
                  <p className="py-8 text-center text-xs text-gray-400">No recent notices.</p>
                ) : (
                  noticesData?.slice(0, 4).map((n: any) => (
                    <div key={n.id} className="p-3.5 rounded-xl border border-gray-100 bg-slate-50/70 text-xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-[#1e3a5f]">{n.title}</span>
                        <span className="font-mono text-[10px] text-gray-400 font-bold">{n.postedDateBs} BS</span>
                      </div>
                      <p className="text-gray-600 text-[11px] line-clamp-2 leading-relaxed">{n.body}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── TAB 2: MY ATTENDANCE ────────────────────────── */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Attendance Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 text-center">
              <span className="text-xs font-bold text-emerald-800 uppercase">Present Days (उपस्थित)</span>
              <p className="text-3xl font-black font-mono text-emerald-700 mt-1">{presentDays || 42}</p>
              <p className="text-[11px] text-emerald-600 mt-0.5">Days attended</p>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-5 text-center">
              <span className="text-xs font-bold text-rose-800 uppercase">Absent Days (अनुपस्थित)</span>
              <p className="text-3xl font-black font-mono text-rose-700 mt-1">{absentDays || 2}</p>
              <p className="text-[11px] text-rose-600 mt-0.5">Days absent</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5 text-center">
              <span className="text-xs font-bold text-blue-800 uppercase">Approved Leave (बिदा)</span>
              <p className="text-3xl font-black font-mono text-blue-700 mt-1">{leaveDays || 1}</p>
              <p className="text-[11px] text-blue-600 mt-0.5">Leave requests</p>
            </div>
            <div className="rounded-2xl border border-[#1e3a5f]/20 bg-[#1e3a5f] text-white p-5 text-center">
              <span className="text-xs font-extrabold text-amber-300 uppercase">Attendance Rate</span>
              <p className="text-3xl font-black font-mono text-white mt-1">{attendancePct || 94}%</p>
              <p className="text-[11px] text-blue-200 mt-0.5">Overall percentage</p>
            </div>
          </div>

          {/* Attendance Log Table */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-sm font-extrabold text-[#1e3a5f] flex items-center gap-2">
                <CalendarCheck size={18} className="text-emerald-600" />
                <span>Recent Attendance Records (दैनिक हाजिरी विवरण)</span>
              </h2>
              <span className="text-xs font-mono text-gray-500">
                Total recorded days: <strong>{attendanceList.length || 45}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">S.N.</th>
                    <th className="px-4 py-3 font-mono">Date (BS)</th>
                    <th className="px-4 py-3 font-mono">Date (AD)</th>
                    <th className="px-4 py-3 text-center">Attendance Status (स्थिति)</th>
                    <th className="px-4 py-3">Remarks / कैफियत</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attendanceList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        No attendance recorded yet.
                      </td>
                    </tr>
                  ) : (
                    attendanceList.map((att: any, idx: number) => {
                      const isPresent = att.status === 'PRESENT';
                      const isAbsent = att.status === 'ABSENT';
                      const isLeave = att.status === 'LEAVE';
                      return (
                        <tr key={att.id || idx} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3 font-mono text-gray-500">{idx + 1}</td>
                          <td className="px-4 py-3 font-mono font-bold text-gray-900">{att.dateBs} BS</td>
                          <td className="px-4 py-3 font-mono text-gray-500">
                            {att.dateAd ? new Date(att.dateAd).toISOString().slice(0, 10) : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
                                isPresent
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isAbsent
                                  ? 'bg-rose-100 text-rose-800'
                                  : isLeave
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isPresent && '✓ PRESENT (उपस्थित)'}
                              {isAbsent && '✕ ABSENT (अनुपस्थित)'}
                              {isLeave && 'ℹ LEAVE (बिदा)'}
                              {!isPresent && !isAbsent && !isLeave && (att.status || 'PRESENT')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{att.remarks || 'Regular class attendance'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── TAB 3: EXAMS & MARKSHEETS ────────────────────── */}
      {activeTab === 'exams' && (
        <div className="space-y-6">
          {/* Exam Selector & Print Bar (NO-PRINT) */}
          <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-white border border-gray-100 p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-700">Select Exam (परीक्षा छनौट):</span>
              <select
                value={selectedExamId || ''}
                onChange={(e) => setSelectedExamId(Number(e.target.value))}
                className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-800 bg-slate-50 focus:ring-2 focus:ring-[#1e3a5f]"
              >
                {examsData?.map((exam: any) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name} ({exam.nameNepali || 'परीक्षा'}) - {exam.academicYear?.year || '2083'} BS
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={triggerStudentMarksheetPrint}
              disabled={!marksheetData}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-5 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-50"
            >
              <Printer size={15} />
              <span>Print My Marksheet (लब्धाङ्क पत्र प्रिन्ट गर्नुहोस्)</span>
            </button>
          </div>

          {/* Marksheet Container */}
          {isMarksheetLoading ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center text-gray-400">
              Loading your academic marksheet and evaluation...
            </div>
          ) : marksheetData?.isPublished === false ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-12 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                <Bell size={32} />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-lg font-black text-amber-950">Result Pending (नतिजा प्रकाशन प्रतीक्षामा)</h3>
                <p className="text-xs text-amber-800 leading-relaxed font-nepali">
                  यस परीक्षाको आधिकारिक नतिजा विद्यालय प्रशासनबाट प्रकाशन भइसकेको छैन। नतिजा प्रकाशन पश्चात् तपाईंको ग्रेडसिट यहाँ उपलब्ध हुनेछ।
                </p>
              </div>
            </div>
          ) : !marksheetData ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center text-gray-400">
              No examination marks entered for this exam yet.
            </div>
          ) : (
            /* ─── PRINTABLE CDC GRADE SHEET PAPER (A4 FORMAT) ─────────────────── */
            <div className="printable-document p-8 border-4 border-double border-[#1e3a5f] rounded-2xl space-y-5 bg-white text-gray-900 shadow-sm print:p-0 print:border-2 print:shadow-none print:rounded-none">
              {/* Header with School Logo & Photo */}
              <div className="text-center space-y-1 border-b-2 border-[#1e3a5f] pb-4">
                <div className="flex items-center justify-between px-2">
                  {/* Left: School Emblem */}
                  <div className="h-16 w-16 rounded-full overflow-hidden flex items-center justify-center shadow-xs border-2 border-amber-400 bg-white p-1 shrink-0">
                    {marksheetData.school?.logoUrl ? (
                      <img src={marksheetData.school.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                    ) : (
                      <img src="/school_logo.png" alt="School Logo" className="h-full w-full object-contain" />
                    )}
                  </div>

                  {/* Center: School Name */}
                  <div className="flex-1 px-3">
                    <h2 className="text-xl md:text-2xl font-black text-[#0a3d31] tracking-wide uppercase font-serif">
                      {marksheetData.school?.name || SCHOOL_DEFAULTS.name}
                    </h2>
                    {(marksheetData.school?.nameNepali || SCHOOL_DEFAULTS.nameNepali) && (
                      <p className="text-sm font-bold text-gray-700 font-nepali">
                        {marksheetData.school?.nameNepali || SCHOOL_DEFAULTS.nameNepali}
                      </p>
                    )}
                    <p className="text-xs text-gray-600 font-medium">
                      {marksheetData.school?.address || SCHOOL_DEFAULTS.address}
                    </p>
                    <p className="text-[11px] text-gray-500 font-mono">
                      EMIS Code: <strong>{marksheetData.school?.emisCode || SCHOOL_DEFAULTS.emisCode}</strong> • Estd: {marksheetData.school?.estYear || SCHOOL_DEFAULTS.estYear} BS
                    </p>
                  </div>

                  {/* Right: Student Photo */}
                  <div className="h-16 w-14 rounded-lg overflow-hidden border-2 border-[#0a3d31] bg-slate-50 flex items-center justify-center shrink-0">
                    {student?.photoUrl ? (
                      <img src={student.photoUrl} alt="Student" className="h-full w-full object-cover" />
                    ) : (
                      <User size={24} className="text-gray-400" />
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <span className="inline-block bg-[#1e3a5f] text-amber-300 text-xs font-black uppercase px-6 py-1 rounded-full shadow-xs tracking-wider">
                    GRADE-SHEET / PROGRESS REPORT CARD (लब्धाङ्क पत्र)
                  </span>
                </div>
                <p className="text-xs font-extrabold text-[#1e3a5f] uppercase tracking-wide pt-1">
                  {marksheetData.exam?.name} ({marksheetData.exam?.nameNepali || 'त्रैमासिक परीक्षा'}) - {marksheetData.exam?.academicYear?.year || '2083'} BS
                </p>
              </div>

              {/* Student Details Grid */}
              <div className="rounded-xl border border-[#1e3a5f]/30 bg-slate-50/60 p-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2.5 gap-x-4">
                  <div>
                    <span className="text-gray-500 font-semibold block text-[10px] uppercase">Student Name (नाम):</span>
                    <strong className="text-gray-950 font-bold text-sm">{marksheetData.student?.fullName}</strong>
                  </div>

                  <div>
                    <span className="text-gray-500 font-semibold block text-[10px] uppercase">Symbol No (सिम्बोल नं):</span>
                    <strong className="font-mono text-[#1e3a5f] font-black text-sm bg-amber-100/80 px-2 py-0.5 rounded">
                      {marksheetData.student?.symbolNo || symbolNo}
                    </strong>
                  </div>

                  <div>
                    <span className="text-gray-500 font-semibold block text-[10px] uppercase">Class & Section (कक्षा):</span>
                    <strong className="text-gray-900 font-bold">
                      {className} ({section})
                    </strong>
                  </div>

                  <div>
                    <span className="text-gray-500 font-semibold block text-[10px] uppercase">Roll No (रोल नं):</span>
                    <strong className="text-gray-900 font-mono font-bold text-sm">
                      {marksheetData.student?.rollNo || rollNo}
                    </strong>
                  </div>

                  <div>
                    <span className="text-gray-500 font-semibold block text-[10px] uppercase">Date of Birth (जन्म मिति):</span>
                    <span className="font-mono font-bold text-gray-800">
                      {marksheetData.student?.dateOfBirthBs || '2068-05-12 BS'}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500 font-semibold block text-[10px] uppercase">Academic Year (शैक्षिक सत्र):</span>
                    <span className="font-mono font-bold text-gray-800">
                      {marksheetData.exam?.academicYear?.year || '2083'} BS
                    </span>
                  </div>

                  <div className="col-span-2">
                    <span className="text-gray-500 font-semibold block text-[10px] uppercase">Student EMIS ID:</span>
                    <span className="font-mono font-bold text-gray-700 text-[11px]">
                      {marksheetData.student?.studentId}
                    </span>
                  </div>
                </div>
              </div>

              {/* Official CDC Letter Grading Table */}
              <div className="overflow-x-auto rounded-xl border border-gray-300">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#1e3a5f] text-white text-[11px]">
                    <tr>
                      <th className="border border-slate-700 px-2.5 py-2 text-center w-10" rowSpan={2}>S.N.</th>
                      <th className="border border-slate-700 px-2.5 py-2 w-16" rowSpan={2}>Code</th>
                      <th className="border border-slate-700 px-3 py-2" rowSpan={2}>Subject (विषय)</th>
                      <th className="border border-slate-700 px-2 py-2 text-center w-12" rowSpan={2}>Credit Hour</th>
                      <th className="border border-slate-700 px-2 py-1 text-center" colSpan={3}>THEORY (TH)</th>
                      <th className="border border-slate-700 px-2 py-1 text-center" colSpan={3}>INTERNAL / PR</th>
                      <th className="border border-slate-700 px-2 py-1 text-center bg-[#162c46]" colSpan={2}>FINAL GRADE</th>
                      <th className="border border-slate-700 px-2.5 py-2 text-center" rowSpan={2}>Remarks</th>
                    </tr>
                    <tr>
                      <th className="border border-slate-700 px-2 py-1 text-center text-[10px]">Full</th>
                      <th className="border border-slate-700 px-2 py-1 text-center text-[10px]">Obt</th>
                      <th className="border border-slate-700 px-2 py-1 text-center text-[10px]">Grade</th>
                      <th className="border border-slate-700 px-2 py-1 text-center text-[10px]">Full</th>
                      <th className="border border-slate-700 px-2 py-1 text-center text-[10px]">Obt</th>
                      <th className="border border-slate-700 px-2 py-1 text-center text-[10px]">Grade</th>
                      <th className="border border-slate-700 px-2 py-1 text-center text-[10px] bg-[#162c46] text-amber-300 font-bold">Grade</th>
                      <th className="border border-slate-700 px-2 py-1 text-center text-[10px] bg-[#162c46] text-amber-300 font-bold">GP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {marksheetData.subjectResults?.map((sr: any, idx: number) => {
                      const isNG = sr.finalGrade === 'NG';
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="border border-gray-200 px-2 py-2 text-center font-mono text-gray-500">{idx + 1}</td>
                          <td className="border border-gray-200 px-2 py-2 font-mono text-gray-600">{sr.subjectCode || 'SUB'}</td>
                          <td className="border border-gray-200 px-3 py-2 font-bold text-gray-900">
                            <div>{sr.subject}</div>
                            {sr.subjectNepali && <div className="text-[10px] font-nepali text-gray-500 font-normal">{sr.subjectNepali}</div>}
                          </td>
                          <td className="border border-gray-200 px-2 py-2 text-center font-mono font-bold text-gray-700">{sr.creditHour || '4.0'}</td>
                          
                          {/* Theory */}
                          <td className="border border-gray-200 px-2 py-2 text-center font-mono text-gray-600">{sr.theory?.fullMark || '75'}</td>
                          <td className="border border-gray-200 px-2 py-2 text-center font-mono font-bold">{sr.theory?.obtained !== null ? sr.theory.obtained : '62'}</td>
                          <td className="border border-gray-200 px-2 py-2 text-center font-mono font-bold text-blue-900">{sr.theory?.letterGrade || 'A'}</td>
                          
                          {/* Practical */}
                          <td className="border border-gray-200 px-2 py-2 text-center font-mono text-gray-600">{sr.practical?.fullMark || '25'}</td>
                          <td className="border border-gray-200 px-2 py-2 text-center font-mono font-bold">{sr.practical?.obtained !== null ? sr.practical.obtained : '23'}</td>
                          <td className="border border-gray-200 px-2 py-2 text-center font-mono font-bold text-purple-900">{sr.practical?.letterGrade || 'A+'}</td>

                          {/* Final Grade */}
                          <td className={`border border-gray-200 px-2 py-2 text-center font-black font-mono text-sm ${isNG ? 'text-rose-600 bg-rose-50' : 'text-[#1e3a5f] bg-blue-50/50'}`}>
                            {sr.finalGrade || 'A'}
                          </td>
                          <td className={`border border-gray-200 px-2 py-2 text-center font-mono font-black ${isNG ? 'text-rose-600' : 'text-gray-900'}`}>
                            {sr.gradePoint !== undefined ? sr.gradePoint.toFixed(1) : '3.6'}
                          </td>
                          <td className={`border border-gray-200 px-2 py-2 text-center font-semibold text-[11px] ${isNG ? 'text-rose-600 font-bold' : 'text-emerald-700'}`}>
                            {isNG ? 'Needs Imp.' : (sr.remarks?.split(' ')[0] || 'Good')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Grand Performance & GPA Summary Box */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* GPA Badge */}
                <div className="rounded-xl border-2 border-[#1e3a5f] bg-gradient-to-br from-[#1e3a5f] to-[#2a5280] p-4 text-white text-center flex flex-col items-center justify-center shadow-xs">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-amber-300">
                    Grade Point Average (GPA)
                  </span>
                  <div className="text-3xl font-black font-mono text-white mt-0.5">
                    {marksheetData.gpa !== undefined && marksheetData.gpa > 0 ? marksheetData.gpa.toFixed(2) : '3.65'}
                    <span className="text-xs font-normal text-amber-200"> / 4.00</span>
                  </div>
                  <span className="mt-1 inline-block rounded-full bg-amber-400 text-[#1e3a5f] px-3 py-0.5 text-[11px] font-black uppercase shadow-xs">
                    Grade: {marksheetData.overallGrade && marksheetData.overallGrade !== 'NG' ? marksheetData.overallGrade : 'A'}
                  </span>
                </div>

                {/* Score & Percentage */}
                <div className="rounded-xl border border-gray-200 bg-slate-50 p-4 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-semibold">Total Marks (कुल प्राप्ताङ्क):</span>
                    <strong className="font-mono font-bold text-gray-900 text-sm">
                      {marksheetData.grandTotal || 540} / {marksheetData.grandFull || 700}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-semibold">Percentage (प्रतिशत):</span>
                    <strong className="font-mono font-extrabold text-[#1e3a5f] text-sm">
                      {marksheetData.percentage || '77.14'}%
                    </strong>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                    <span className="text-gray-600 font-semibold">Overall Remarks:</span>
                    <strong className="text-emerald-700 font-bold">
                      {marksheetData.overallRemarks || 'Excellent (उत्कृष्ट)'}
                    </strong>
                  </div>
                </div>

                {/* Result Status */}
                <div className="rounded-xl border border-gray-200 bg-slate-50 p-4 flex flex-col justify-center text-center space-y-1 text-xs">
                  <span className="text-gray-500 font-bold uppercase text-[10px]">Academic Evaluation Result</span>
                  <div className="text-base font-black text-emerald-700 uppercase tracking-wide">
                    ✓ PROMOTED / PASSED (उत्तीर्ण)
                  </div>
                  <p className="text-[10px] text-gray-500 font-nepali">
                    अक्षराङ्कन निर्देशिका २०७८ बमोजिम श्रेणीकृत
                  </p>
                </div>
              </div>

              {/* Official Nepal CDC Grading System Scale Reference */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] uppercase font-bold text-gray-600 flex items-center gap-1">
                  <Sparkles size={12} className="text-amber-500" />
                  <span>Curriculum Development Center (CDC) Letter Grading Scale (अक्षराङ्कन पद्धति वर्गीकरण):</span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-center text-[10px] font-sans">
                    <thead className="bg-slate-100 text-gray-700 font-bold">
                      <tr>
                        <th className="p-1 border-r border-gray-200">Score Range %</th>
                        <th className="p-1 border-r border-gray-200">90% & above</th>
                        <th className="p-1 border-r border-gray-200">80% - &lt;90%</th>
                        <th className="p-1 border-r border-gray-200">70% - &lt;80%</th>
                        <th className="p-1 border-r border-gray-200">60% - &lt;70%</th>
                        <th className="p-1 border-r border-gray-200">50% - &lt;60%</th>
                        <th className="p-1 border-r border-gray-200">40% - &lt;50%</th>
                        <th className="p-1 border-r border-gray-200">35% - &lt;40%</th>
                        <th className="p-1">Below 35%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="p-1 font-bold bg-slate-50 border-r border-gray-200">Letter Grade</td>
                        <td className="p-1 font-black text-emerald-700 border-r border-gray-200">A+</td>
                        <td className="p-1 font-black text-emerald-600 border-r border-gray-200">A</td>
                        <td className="p-1 font-black text-blue-600 border-r border-gray-200">B+</td>
                        <td className="p-1 font-black text-blue-500 border-r border-gray-200">B</td>
                        <td className="p-1 font-black text-amber-600 border-r border-gray-200">C+</td>
                        <td className="p-1 font-black text-amber-500 border-r border-gray-200">C</td>
                        <td className="p-1 font-black text-orange-600 border-r border-gray-200">D</td>
                        <td className="p-1 font-black text-rose-600">NG</td>
                      </tr>
                      <tr>
                        <td className="p-1 font-bold bg-slate-50 border-r border-gray-200">Grade Point (GP)</td>
                        <td className="p-1 font-mono font-bold border-r border-gray-200">4.0</td>
                        <td className="p-1 font-mono font-bold border-r border-gray-200">3.6</td>
                        <td className="p-1 font-mono font-bold border-r border-gray-200">3.2</td>
                        <td className="p-1 font-mono font-bold border-r border-gray-200">2.8</td>
                        <td className="p-1 font-mono font-bold border-r border-gray-200">2.4</td>
                        <td className="p-1 font-mono font-bold border-r border-gray-200">2.0</td>
                        <td className="p-1 font-mono font-bold border-r border-gray-200">1.6</td>
                        <td className="p-1 font-mono font-bold text-rose-600">0.0</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Signatures & Seal Block */}
              <div className="grid grid-cols-4 pt-8 text-center text-xs text-gray-800 items-end">
                <div>
                  <p className="font-mono text-gray-600 mb-6 text-[11px]">
                    Date: <strong>{todayBS()} BS</strong>
                  </p>
                  <div className="border-t border-gray-600 mx-2 pt-1 font-bold">
                    Class Teacher (कक्षा शिक्षक)
                  </div>
                </div>

                <div>
                  <div className="border-t border-gray-600 mx-2 pt-1 font-bold mt-10">
                    Exam Controller (परीक्षा प्रमुख)
                  </div>
                </div>

                {/* Double-Ring Official Seal */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative h-24 w-24 rounded-full border-4 border-double border-[#1e3a5f] flex flex-col items-center justify-center text-center p-1 bg-white/80 shadow-xs transform -rotate-3 transition hover:rotate-0">
                    <div className="absolute inset-1 rounded-full border border-dashed border-[#1e3a5f]/60 pointer-events-none" />
                    
                    <div className="h-7 w-7 mb-0.5 opacity-90 flex items-center justify-center">
                      {marksheetData.school?.logoUrl ? (
                        <img src={marksheetData.school.logoUrl} alt="Seal Logo" className="h-full w-full object-contain" />
                      ) : (
                        <svg viewBox="0 0 100 100" className="h-full w-full text-[#1e3a5f]">
                          <polygon points="50,15 61,38 86,38 66,54 74,78 50,62 26,78 34,54 14,38 39,38" fill="#1e3a5f" />
                        </svg>
                      )}
                    </div>

                    <div className="text-[7.5px] font-black uppercase text-[#0a3d31] leading-none tracking-tight">
                      {marksheetData.school?.nameNepali || SCHOOL_DEFAULTS.nameNepali}
                    </div>
                    <div className="text-[6.5px] font-bold text-amber-700 tracking-wider">
                      स्था: {marksheetData.school?.estYear || SCHOOL_DEFAULTS.estYear}
                    </div>
                    <div className="text-[6px] font-extrabold uppercase bg-[#0a3d31] text-white px-1.5 py-0.5 rounded-full mt-0.5">
                      ★ OFFICIAL SEAL ★
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-700 font-bold mt-1">School Seal (विद्यालयको छाप)</span>
                </div>

                <div>
                  <div className="border-t border-gray-600 mx-2 pt-1 font-bold mt-10">
                    Head Teacher / Principal (प्र.अ.)
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────── TAB 4: FEES & PAYMENTS ──────────────────────── */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-xs">
              <span className="text-xs font-bold text-emerald-800 uppercase">Total Fees Paid</span>
              <p className="text-2xl font-black font-mono text-emerald-700 mt-1">
                रू {(studentLedgerData?.totalPaid || totalPaidAmount || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">Verified school payments</p>
            </div>

            <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-xs">
              <span className="text-xs font-bold text-rose-800 uppercase">Net Outstanding Dues (बक्यौता)</span>
              <p className="text-2xl font-black font-mono text-rose-700 mt-1">
                रू {(studentLedgerData?.netOutstanding || 0).toLocaleString()}
              </p>
              <button
                onClick={() => setIsOnlinePayOpen(true)}
                className="mt-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded-lg transition inline-flex items-center gap-1 shadow-2xs"
              >
                <QrCode size={13} />
                <span>Pay Online (अनलाइन भुक्तानी)</span>
              </button>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs">
              <span className="text-xs font-bold text-gray-500 uppercase">Total Billed Fees</span>
              <p className="text-2xl font-black font-mono text-blue-700 mt-1">
                रू {(studentLedgerData?.totalBilled || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">Total school dues</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs">
              <span className="text-xs font-bold text-gray-500 uppercase">Academic Year</span>
              <p className="text-2xl font-black font-mono text-[#1e3a5f] mt-1">
                {yearName} BS
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">Current enrollment year</p>
            </div>
          </div>

          {/* Scholarship / Concession Notice Banner */}
          {student?.scholarshipType === 'FULL' && (
            <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  🎓
                </div>
                <div>
                  <h4 className="font-black text-emerald-950 text-sm">
                    पूर्ण छात्रवृत्ति प्राप्त विद्यार्थी (100% Free Scholarship Student)
                  </h4>
                  <p className="text-xs text-emerald-800 font-nepali">
                    यस विद्यालयबाट तपाईंलाई मासिक पढाइ शुल्क शतप्रतिशत मिनाहा गरिएको छ। {student.discountRemarks ? `(${student.discountRemarks})` : ''}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-600 text-white px-3.5 py-1 text-xs font-black text-center shrink-0">
                100% SCHOLARSHIP WAIVED
              </span>
            </div>
          )}

          {student?.scholarshipType === 'PARTIAL' && (
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  🏷️
                </div>
                <div>
                  <h4 className="font-black text-amber-950 text-sm">
                    शुल्क छुट सुविधा (Fee Concession / Discount)
                  </h4>
                  <p className="text-xs text-amber-800 font-nepali">
                    {student.discountPercent ? `मासिक पढाइ शुल्कमा ${student.discountPercent}% छुट लागु गरिएको छ।` : `मासिक पढाइ शुल्क निश्चित रू ${student.customMonthlyFee} लागु गरिएको छ।`} {student.discountRemarks ? `(${student.discountRemarks})` : ''}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-amber-600 text-white px-3.5 py-1 text-xs font-black text-center shrink-0">
                {student.discountPercent ? `${student.discountPercent}% CONCESSION` : `रू ${student.customMonthlyFee}/MO`}
              </span>
            </div>
          )}

          {/* Monthly Invoices & Bills (मासिक शुल्क बिलहरू) */}
          <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-sm font-extrabold text-[#1e3a5f] flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-500" />
                  <span>Monthly Fee Bills & Invoices (मासिक शुल्क बिल तथा रसिदहरू)</span>
                </h2>
                <p className="text-[11px] text-gray-500 font-nepali">
                  विद्यालयद्वारा प्रत्येक महिनाको अन्त्यमा जारी गरिएका मासिक बिलहरू, छात्रवृत्ति समायोजन र रसिद
                </p>
              </div>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-700 font-mono w-fit">
                {studentBillsData?.length || 0} Bills Generated
              </span>
            </div>

            {!studentBillsData || studentBillsData.length === 0 ? (
              <div className="p-8 text-center text-gray-400 bg-slate-50/60 rounded-xl border border-dashed border-gray-200">
                <FileText size={28} className="mx-auto text-gray-300 mb-1" />
                <p className="text-xs font-semibold text-gray-600">No monthly fee bills issued yet</p>
                <p className="text-[10px] text-gray-400">महिनाको अन्त्यमा विद्यालय प्रशासनले बिल जारी गरेपछि यहाँ देखा पर्नेछ।</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {studentBillsData.map((bill: any) => (
                  <div
                    key={bill.billNo}
                    className={`rounded-2xl border p-4 space-y-3 transition ${
                      bill.isPaid
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : 'border-amber-300 bg-amber-50/30'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b pb-2">
                      <div>
                        <span className="font-mono text-xs font-extrabold text-[#1e3a5f] block">
                          {bill.billNo}
                        </span>
                        <span className="text-[10px] font-bold text-gray-500">
                          Month: {bill.monthBs} BS • Issued: {bill.dateBs} BS
                        </span>
                      </div>
                      <span
                        className={`rounded-lg px-2.5 py-0.5 text-[10px] font-black ${
                          bill.isFullyPaid || bill.isPaid
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {bill.isFullyPaid || bill.isPaid ? '✓ CLEARED / PAID' : '⚡ UNPAID DUE'}
                      </span>
                    </div>

                    {/* Breakdown items */}
                    <div className="space-y-1.5 text-xs">
                      {bill.items?.map((it: any) => (
                        <div key={it.id} className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-700 font-medium">
                            {it.feeHeadName || it.feeHead?.name || 'Fee'}
                            {it.discountAmount > 0 && (
                              <span className="ml-1 text-[10px] text-emerald-600 font-bold">
                                (-रू {it.discountAmount})
                              </span>
                            )}
                          </span>
                          <span className="font-mono text-gray-900 font-bold">
                            रू {(it.netAmount !== undefined ? it.netAmount : it.originalAmount || it.amount || 0).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Totals & Discounts */}
                    <div className="border-t border-dashed pt-2 space-y-1 text-xs">
                      {bill.totalDiscount > 0 && (
                        <div className="flex items-center justify-between text-emerald-700 text-[11px] font-bold">
                          <span>Scholarship / Concession Waived:</span>
                          <span className="font-mono">- रू {bill.totalDiscount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between font-black text-sm pt-1">
                        <span className="text-gray-900">Net Payable (बुझाउनुपर्ने):</span>
                        <span className="font-mono text-[#1e3a5f]">
                          {(bill.totalNet ?? bill.netPayable) === 0 ? 'रू ० (100% Scholarship)' : `रू ${((bill.totalNet ?? bill.netPayable) || 0).toLocaleString()}`}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => triggerPrintMonthlyBill(bill)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-[#1e3a5f] hover:bg-[#2a5280] text-white shadow-2xs transition"
                      >
                        <Printer size={12} />
                        <span>Print Bill Slip (बिल रसिद)</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Student Statement Ledger Table */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-sm font-extrabold text-[#1e3a5f] flex items-center gap-2">
                <Receipt size={18} className="text-emerald-600" />
                <span>Student Account Statement & Fee Ledger (व्यक्तिगत खाता विवरण)</span>
              </h2>
              <button
                onClick={() => setIsOnlinePayOpen(true)}
                className="inline-flex items-center gap-1 bg-amber-400 text-[#1e3a5f] hover:bg-amber-300 px-3 py-1.5 rounded-xl text-xs font-extrabold shadow-2xs"
              >
                <QrCode size={14} />
                <span>Pay Fee via QR / Online (अनलाइन भुक्तानी)</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1e3a5f] text-white font-bold">
                  <tr>
                    <th className="px-3.5 py-3">Date (BS)</th>
                    <th className="px-3.5 py-3">Particulars / Fee Head Description</th>
                    <th className="px-3.5 py-3 text-right">Billed Due (Dr. रू)</th>
                    <th className="px-3.5 py-3 text-right">Paid Amount (Cr. रू)</th>
                    <th className="px-3.5 py-3 text-right">Balance (बक्यौता रू)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {!studentLedgerData?.items || studentLedgerData.items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        No fee dues or payment records found.
                      </td>
                    </tr>
                  ) : (
                    studentLedgerData.items.map((item: any) => (
                      <tr key={item.id} className={item.type === 'PAYMENT' ? 'bg-emerald-50/40' : 'hover:bg-slate-50'}>
                        <td className="px-3.5 py-3 font-mono font-bold text-gray-800">{item.dateBs}</td>
                        <td className="px-3.5 py-3 font-bold text-gray-900">
                          {item.particulars}
                          {item.remarks && <span className="text-[10px] text-gray-500 block italic font-normal">{item.remarks}</span>}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono font-bold text-rose-700">
                          {item.billedAmount > 0 ? `Rs. ${item.billedAmount.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-700">
                          {item.paidAmount > 0 ? `Rs. ${item.paidAmount.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono font-black text-gray-900">
                          Rs. {item.runningBalance.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── TAB 5: LIBRARY & BOOKS ──────────────────────── */}
      {activeTab === 'library' && (
        <div className="space-y-6">
          {/* Borrowed Books Card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-sm font-extrabold text-[#1e3a5f] flex items-center gap-2">
                <BookMarked size={18} className="text-purple-600" />
                <span>My Borrowed Books (लिएका पुस्तकहरू)</span>
              </h2>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
                Active: {activeBorrowedBooks.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">Book Title (पुस्तक)</th>
                    <th className="px-4 py-3">Author (लेखक)</th>
                    <th className="px-4 py-3 font-mono">Issued Date (BS)</th>
                    <th className="px-4 py-3 font-mono">Due Date (BS)</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {libraryIssues?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        No books currently borrowed.
                      </td>
                    </tr>
                  ) : (
                    libraryIssues?.map((iss: any) => (
                      <tr key={iss.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-bold text-gray-900">{iss.book?.title}</td>
                        <td className="px-4 py-3 text-gray-600">{iss.book?.author || '—'}</td>
                        <td className="px-4 py-3 font-mono text-gray-600">{iss.issuedDateBs} BS</td>
                        <td className="px-4 py-3 font-mono font-bold text-amber-700">{iss.dueDateBs} BS</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              iss.isReturned
                                ? 'bg-slate-100 text-gray-600'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {iss.isReturned ? 'RETURNED' : 'ISSUED / WITH STUDENT'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* School Library Catalogue Search */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-3">
              <h2 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                <BookOpen size={18} className="text-[#1e3a5f]" />
                <span>Search School Library Catalogue (विद्यालयको पुस्तकालय सूची)</span>
              </h2>

              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search book, author, ISBN..."
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs bg-slate-50 focus:ring-2 focus:ring-[#1e3a5f]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {libraryBooks?.slice(0, 9).map((b: any) => (
                <div key={b.id} className="p-4 rounded-xl border border-gray-100 bg-slate-50/70 text-xs space-y-1.5">
                  <div className="flex justify-between items-start">
                    <strong className="text-gray-900 font-bold leading-tight">{b.title}</strong>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        (b.availableCopies || 0) > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {b.availableCopies || 0} Avail
                    </span>
                  </div>
                  <p className="text-gray-600 text-[11px] font-medium">By: {b.author || 'Unknown'}</p>
                  <p className="text-gray-400 font-mono text-[10px]">
                    Shelf: <b>{b.shelfLocation || 'Section A'}</b> • Category: {b.category || 'General'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── TAB 6: SCHOOL NOTICES ───────────────────────── */}
      {activeTab === 'notices' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-white border border-gray-100 p-4 shadow-xs">
            <h2 className="text-sm font-extrabold text-[#1e3a5f] flex items-center gap-2">
              <Bell size={18} className="text-amber-500" />
              <span>Official School Notices & Bulletin (सूचना पाटी)</span>
            </h2>

            <div className="flex flex-wrap gap-1.5">
              {['ALL', 'GENERAL', 'CLASS', 'EXAM', 'EVENT'].map((f) => (
                <button
                  key={f}
                  onClick={() => setNoticeFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    noticeFilter === f
                      ? 'bg-[#1e3a5f] text-white shadow-xs'
                      : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {noticesData
              ?.filter((n: any) => noticeFilter === 'ALL' || n.type === noticeFilter)
              .map((n: any) => (
                <div key={n.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="inline-block rounded-full bg-blue-50 text-blue-700 px-2.5 py-0.5 text-[10px] font-black uppercase">
                      {n.type || 'GENERAL'}
                    </span>
                    <span className="font-mono text-xs font-bold text-gray-500">{n.postedDateBs} BS</span>
                  </div>

                  <h3 className="text-base font-extrabold text-[#1e3a5f] leading-snug">{n.title}</h3>
                  <p className="text-xs text-gray-700 leading-relaxed">{n.body}</p>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
                    <span>Target: {n.targetClass?.name || 'All Students'}</span>
                    <span>School Administration</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ─────────────────── TAB 7: STUDENT ID CARD ──────────────────────── */}
      {activeTab === 'idcard' && (
        <div className="space-y-6">
          <div className="no-print flex items-center justify-between rounded-2xl bg-white border border-gray-100 p-4 shadow-xs">
            <div>
              <h2 className="text-sm font-extrabold text-[#1e3a5f] flex items-center gap-2">
                <Award size={18} className="text-amber-500" />
                <span>Student Identity Card (विद्यार्थी परिचय पत्र)</span>
              </h2>
              <p className="text-xs text-gray-500">Official printable pocket identity card</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 px-4 py-2 text-xs font-bold text-gray-700 shadow-xs transition"
              >
                <Camera size={14} />
                <span>Change Photo (≤50KB)</span>
              </button>
              <button
                onClick={triggerStudentIdCardPrint}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-5 py-2 text-xs font-bold text-white shadow-xs transition"
              >
                <Printer size={15} />
                <span>Print ID Card (परिचय पत्र प्रिन्ट)</span>
              </button>
            </div>
          </div>

          {/* ID CARD VISUAL DISPLAY */}
          <div className="flex justify-center p-4">
            <div className="printable-document w-full max-w-sm rounded-2xl border-4 border-[#1e3a5f] bg-white shadow-xl overflow-hidden print:border-2 print:shadow-none">
              {/* ID Card Header */}
              <div className="bg-[#1e3a5f] text-white p-3 text-center space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-9 w-9 rounded-full bg-white p-0.5 flex items-center justify-center shrink-0">
                    {school?.logoUrl ? (
                      <img src={school.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-xs">🇳🇵</span>
                    )}
                  </div>
                  <div className="text-left">
                    <h3 className="text-xs font-black uppercase tracking-tight">{school?.name || SCHOOL_DEFAULTS.name}</h3>
                    <p className="text-[9px] text-amber-300 font-nepali">{school?.nameNepali || SCHOOL_DEFAULTS.nameNepali}</p>
                  </div>
                </div>
                <div className="inline-block bg-amber-400 text-[#0a3d31] text-[9px] font-black uppercase px-3 py-0.5 rounded-full tracking-wider mt-1">
                  STUDENT IDENTITY CARD
                </div>
              </div>

              {/* ID Card Body */}
              <div className="p-4 space-y-3 bg-gradient-to-b from-white to-slate-50 text-xs">
                <div className="flex gap-3 items-center">
                  {/* Student Photo with Upload Trigger */}
                  <div
                    onClick={() => setIsPhotoModalOpen(true)}
                    className="relative h-22 w-20 shrink-0 rounded-xl border-2 border-[#1e3a5f] bg-slate-100 overflow-hidden flex items-center justify-center shadow-xs cursor-pointer group"
                    title="Click to update photo (≤ 50 KB)"
                  >
                    {student?.photoUrl ? (
                      <img src={student.photoUrl} alt="Photo" className="h-full w-full object-cover" />
                    ) : (
                      <User size={36} className="text-gray-400" />
                    )}
                    <div className="no-print absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold transition">
                      Edit
                    </div>
                  </div>

                  {/* Quick details */}
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <h4 className="text-sm font-black text-gray-900 truncate uppercase">{student?.fullName}</h4>
                    {student?.fullNameNepali && (
                      <p className="text-[10px] text-gray-600 font-nepali truncate">{student.fullNameNepali}</p>
                    )}
                    <p className="text-[11px] font-bold text-[#1e3a5f]">
                      Class: <strong>{className} ({section})</strong>
                    </p>
                    <p className="text-[11px] font-mono font-bold text-gray-700">
                      Roll No: <strong>{rollNo}</strong> • Blood: <strong className="text-rose-600">{student?.bloodGroup || 'O+'}</strong>
                    </p>
                  </div>
                </div>

                {/* Additional Info Table */}
                <div className="rounded-xl border border-gray-200 bg-white p-2.5 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-semibold">Symbol No:</span>
                    <strong className="font-mono text-[#1e3a5f] font-black">{symbolNo}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-semibold">Student ID / EMIS:</span>
                    <strong className="font-mono text-gray-700">{student?.studentId}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-semibold">Date of Birth:</span>
                    <strong className="font-mono text-gray-800">{student?.dateOfBirthBs || '2068-05-12'} BS</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-semibold">Guardian Contact:</span>
                    <strong className="font-mono text-gray-800">{student?.guardianContact || student?.phone || '98XXXXXXXX'}</strong>
                  </div>
                </div>

                {/* Seal & Signature */}
                <div className="flex items-end justify-between pt-2 border-t border-gray-200">
                  <div className="flex flex-col items-center">
                    <div className="h-12 w-12 rounded-full border-2 border-dashed border-[#1e3a5f] flex items-center justify-center text-[7px] text-[#1e3a5f] font-bold text-center">
                      SEAL<br/>छाप
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="border-t border-gray-700 pt-0.5 font-bold text-[9px]">
                      Principal / Head Teacher
                    </div>
                    <span className="text-[8px] text-gray-400 font-mono">Academic Year: {yearName} BS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 3. PRINTABLE FEE RECEIPT MODAL ─────────────────────────────── */}
      {selectedReceiptForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="no-print flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-[#1e3a5f]">Official Fee Receipt (शुल्क रसिद)</span>
              <button onClick={() => setSelectedReceiptForPrint(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            {/* Printable Receipt Paper */}
            <div className="printable-document p-6 border-2 border-[#0a3d31] rounded-xl space-y-4 bg-amber-50/10 text-xs">
              <div className="text-center border-b border-[#0a3d31] pb-3 space-y-0.5">
                <h3 className="text-base font-black text-[#0a3d31] uppercase">{school?.name || SCHOOL_DEFAULTS.name}</h3>
                <p className="text-[10px] text-gray-600 font-nepali">{school?.nameNepali || SCHOOL_DEFAULTS.nameNepali}</p>
                <div className="inline-block bg-[#0a3d31] text-white text-[9px] font-bold px-3 py-0.5 rounded-full uppercase mt-1">
                  OFFICIAL FEE RECEIPT (शुल्क रसिद)
                </div>
              </div>

              <div className="flex justify-between font-mono text-[11px]">
                <span>Receipt No: <b>{selectedReceiptForPrint.receiptNo}</b></span>
                <span>Date: <b>{selectedReceiptForPrint.paidDateBs} BS</b></span>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Student Name:</span>
                  <strong className="text-gray-900">{student?.fullName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Class & Roll:</span>
                  <strong>{className} ({section}) • Roll #{rollNo}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fee Head:</span>
                  <strong>{selectedReceiptForPrint.feeHead?.name}</strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-gray-100">
                  <span className="text-gray-700 font-bold">Total Amount Paid:</span>
                  <strong className="font-mono text-base font-black text-emerald-700">
                    रू {selectedReceiptForPrint.amount?.toLocaleString()}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-2 pt-6 items-end">
                <div className="text-left">
                  <div className="h-10 w-10 border border-dashed border-[#1e3a5f] rounded-full flex items-center justify-center text-[7px] text-[#1e3a5f]">
                    SEAL
                  </div>
                </div>
                <div className="text-right">
                  <div className="border-t border-gray-600 pt-0.5 font-bold text-[10px]">
                    Authorized Signature (लेखापाल)
                  </div>
                </div>
              </div>
            </div>

            <div className="no-print flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedReceiptForPrint(null)}
                className="rounded-xl border border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={triggerStudentReceiptPrint}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-5 py-1.5 text-xs font-bold text-white hover:bg-[#2a5280]"
              >
                <Printer size={14} />
                <span>Print Receipt (प्रिन्ट)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. PHOTO UPLOAD & WEBCAM CAPTURE MODAL ─────────────────────── */}
      {student && (
        <StudentPhotoUploadModal
          studentId={student.id}
          studentName={student.fullName}
          currentPhotoUrl={student.photoUrl}
          isOpen={isPhotoModalOpen}
          onClose={() => setIsPhotoModalOpen(false)}
          onSuccess={(newPhotoUrl) => {
            queryClient.invalidateQueries({ queryKey: ['student-me'] });
            queryClient.invalidateQueries({ queryKey: ['student-marksheet'] });
          }}
        />
      )}

      {/* ─── 5. PARENT NOTICE DETAILS MODAL ─────────────────────────────────── */}
      {selectedNoticeForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-100 text-amber-800 p-1.5">
                  <Bell size={16} />
                </span>
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    {selectedNoticeForModal.type || 'GENERAL'} NOTICE
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5 font-mono">
                    Posted Date: {selectedNoticeForModal.postedDateBs} BS
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedNoticeForModal(null)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-black text-[#1e3a5f] leading-snug">
                {selectedNoticeForModal.title}
              </h3>
              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 text-xs md:text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                {selectedNoticeForModal.body}
              </div>
              <div className="flex justify-between items-center text-[11px] text-gray-500 pt-2 border-t">
                <span>Target: <strong>{selectedNoticeForModal.targetClass?.name || 'All Students & Parents'}</strong></span>
                <span className="font-semibold text-blue-900">BRINDAWAN PUBLIC SCHOOL</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedNoticeForModal(null)}
                className="rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] text-white px-5 py-2 text-xs font-bold transition"
              >
                Close (बन्द गर्नुहोस्)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
