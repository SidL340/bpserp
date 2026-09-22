'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS, resolveFinancialYear, getFiscalYearFromBS, formatDateInput } from '@/lib/nepali-date';
import {
  Wallet,
  Plus,
  Printer,
  X,
  FileText,
  Calculator,
  CheckCircle2,
  Calendar,
  Building,
  Edit2,
  Trash2,
  UserCheck,
  Search,
  Check,
  CreditCard,
  Banknote,
  Clock,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PayrollPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<any>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
  const [monthFrom, setMonthFrom] = useState(todayBS().slice(0, 7));
  const [monthTo, setMonthTo] = useState(todayBS().slice(0, 7));
  const [selectedSlip, setSelectedSlip] = useState<any>(null);

  // Private School Calculation Form State
  const [monthsCount, setMonthsCount] = useState<number>(1);
  const [taha, setTaha] = useState('शिक्षक (Teacher)');
  const [shreni, setShreni] = useState('सामान्य');
  const [moolTalab, setMoolTalab] = useState<number>(22000);
  const [gradeNo, setGradeNo] = useState<number>(0);
  const [gradeAmount, setGradeAmount] = useState<number>(0);

  // Allowances
  const [mahangiGhata, setMahangiGhata] = useState<number>(0);
  const [praABhata, setPraABhata] = useState<number>(0);
  const [sahayakPraABhata, setSahayakPraABhata] = useState<number>(0);
  const [prabiInchargeBhata, setPrabiInchargeBhata] = useState<number>(0);
  const [mabiInchargeBhata, setMabiInchargeBhata] = useState<number>(0);
  const [otherBhata, setOtherBhata] = useState<number>(0);

  // Deductions
  const [karmachariKoshSapati, setKarmachariKoshSapati] = useState<number>(0);
  const [bimaKati, setBimaKati] = useState<number>(0);
  const [peshkiKati, setPeshkiKati] = useState<number>(0);

  // Private School Optional Checkboxes (All default false)
  const [includeEpf, setIncludeEpf] = useState<boolean>(false);
  const [includeSsk, setIncludeSsk] = useState<boolean>(false);
  const [includeBima, setIncludeBima] = useState<boolean>(false);
  const [includeTax, setIncludeTax] = useState<boolean>(false);

  // Special additions & payments
  const [includeChaadparba, setIncludeChaadparba] = useState<boolean>(false);
  const [peshki, setPeshki] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentDateBs, setPaymentDateBs] = useState<string>(todayBS());
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [remarks, setRemarks] = useState('');

  // Quick Disburse Modal
  const [paymentModalPayroll, setPaymentModalPayroll] = useState<any>(null);
  const [disburseAmount, setDisburseAmount] = useState<string>('');
  const [disburseDateBs, setDisburseDateBs] = useState<string>(todayBS());
  const [disburseMethod, setDisburseMethod] = useState<string>('CASH');
  const [disburseRemarks, setDisburseRemarks] = useState<string>('');

  // Fetch Teachers (Directly synced with Teacher Module)
  const { data: teachersData } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const res = await api.get('/teachers');
      return res.data?.data || [];
    },
  });

  // Fetch Salary Scales
  const { data: scalesData } = useQuery({
    queryKey: ['salary-scales-list'],
    queryFn: async () => {
      const res = await api.get('/payroll/salary-scales/list');
      return res.data?.data || [];
    },
  });

  // Fetch Active Academic Year
  const { data: schoolProfile } = useQuery({
    queryKey: ['school-profile'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
      return res.data?.data;
    },
  });

  // Fetch Financial Years (आर्थिक वर्षहरू)
  const { data: financialYearsData } = useQuery({
    queryKey: ['financial-years-all'],
    queryFn: async () => {
      const res = await api.get('/financial-years/all');
      return res.data?.data || [];
    },
  });
  const activeFinancialYear = financialYearsData?.find((f: any) => f.isActive) || financialYearsData?.[0];

  // Fetch Payroll History
  const { data: payrollsData, isLoading } = useQuery({
    queryKey: ['payrolls'],
    queryFn: async () => {
      const res = await api.get('/payroll');
      return res.data?.data || [];
    },
  });

  const activeYear = schoolProfile?.academicYears?.find((y: any) => y.isActive);
  const autoResolvedFY = resolveFinancialYear(monthFrom.length === 7 ? `${monthFrom}-01` : monthFrom, financialYearsData || []);

  // ── LIVE FORM FORMULA CALCULATIONS (Private School Engine) ──────────────────────────
  const gradeRakam = gradeNo * gradeAmount;
  const gradeSahitTalab = moolTalab + gradeRakam;
  const epfDed = includeEpf ? +(gradeSahitTalab * 0.10).toFixed(2) : 0;
  const ssk20Pct = includeSsk ? +(gradeSahitTalab * 0.20).toFixed(2) : 0;

  const jammaBhata = +(
    mahangiGhata +
    praABhata +
    sahayakPraABhata +
    prabiInchargeBhata +
    mabiInchargeBhata +
    otherBhata
  ).toFixed(2);

  const jammaTalabBhata = +(gradeSahitTalab + jammaBhata).toFixed(2);
  const totalMonths = monthsCount || 1;
  const traimasikTalan = +(jammaTalabBhata * totalMonths).toFixed(2);

  const bimaDed = includeBima ? (bimaKati || 0) : 0;
  const jammaKati = +(epfDed + karmachariKoshSapati + bimaDed + peshkiKati).toFixed(2);
  const bakiBeforeAdditions = +(traimasikTalan - jammaKati).toFixed(2);

  const chaadparbaKharcha = includeChaadparba ? gradeSahitTalab : 0;
  const kulRakam = +(bakiBeforeAdditions + chaadparbaKharcha + peshki).toFixed(2);

  const samajikSurakshaKar1Pct = includeTax ? +(kulRakam * 0.01).toFixed(2) : 0;
  const khudPaaunuParne = +(kulRakam - samajikSurakshaKar1Pct).toFixed(2);

  const livePaidAmount = paidAmount || 0;
  const liveRemainingDue = Math.max(0, +(khudPaaunuParne - livePaidAmount).toFixed(2));

  // Auto-detect teacher scale on teacher selection
  const handleTeacherChange = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    if (!teacherId) return;
    const teacher = teachersData?.find((t: any) => t.id.toString() === teacherId);
    if (teacher?.taha) {
      setTaha(teacher.taha);
      const matchedScale = scalesData?.find((s: any) =>
        s.taha.toLowerCase().includes(teacher.taha.toLowerCase()) ||
        teacher.taha.toLowerCase().includes(s.taha.toLowerCase())
      );
      if (matchedScale) {
        setMoolTalab(matchedScale.moolTalab);
        setGradeAmount(matchedScale.gradeAmount);
        setShreni(matchedScale.shreni || '');
      }
    }
  };

  const handleScaleSelect = (scaleId: string) => {
    const scale = scalesData?.find((s: any) => s.id.toString() === scaleId);
    if (scale) {
      setTaha(scale.taha);
      setShreni(scale.shreni || '');
      setMoolTalab(scale.moolTalab);
      setGradeAmount(scale.gradeAmount);
    }
  };

  // Handle Quick Generate from Teacher Card
  const handleQuickGenerateForTeacher = (teacher: any) => {
    setEditingPayroll(null);
    setSelectedTeacherId(teacher.id.toString());
    if (teacher.taha) {
      setTaha(teacher.taha);
      const matchedScale = scalesData?.find((s: any) =>
        s.taha.toLowerCase().includes(teacher.taha.toLowerCase()) ||
        teacher.taha.toLowerCase().includes(s.taha.toLowerCase())
      );
      if (matchedScale) {
        setMoolTalab(matchedScale.moolTalab);
        setGradeAmount(matchedScale.gradeAmount);
        setShreni(matchedScale.shreni || '');
      }
    }
    setIsModalOpen(true);
  };

  // Open Edit Modal & Populate State
  const handleOpenEditModal = (p: any) => {
    setEditingPayroll(p);
    setSelectedTeacherId(p.teacherId?.toString() || '');
    setMonthFrom(p.monthFrom || todayBS().slice(0, 7));
    setMonthTo(p.monthTo || todayBS().slice(0, 7));
    setTaha(p.taha || 'शिक्षक');
    setShreni(p.shreni || 'सामान्य');
    setMoolTalab(p.moolTalab || 0);
    setGradeNo(p.gradeNo || 0);
    setGradeAmount(p.gradeAmount || 0);
    setMahangiGhata(p.mahangiGhata || 0);
    setPraABhata(p.praABhata || 0);
    setSahayakPraABhata(p.sahayakPraABhata || 0);
    setPrabiInchargeBhata(p.prabiInchargeBhata || 0);
    setMabiInchargeBhata(p.mabiInchargeBhata || 0);
    setOtherBhata(p.otherBhata || 0);
    setKarmachariKoshSapati(p.karmachariKoshSapati || 0);
    setBimaKati(p.bimaKati || 0);
    setPeshkiKati(p.peshkiKati || 0);
    setIncludeChaadparba(Boolean(p.chaadparbaKharcha));
    setPeshki(p.peshki || 0);
    setMonthsCount(1);
    setPaidAmount(p.paidAmount || 0);
    setPaymentDateBs(p.paymentDateBs || todayBS());
    setPaymentMethod(p.paymentMethod || 'CASH');
    setIncludeEpf(Boolean(p.karmachari10Pct && p.karmachari10Pct > 0));
    setIncludeSsk(Boolean(p.ssk20Pct && p.ssk20Pct > 0));
    setIncludeBima(Boolean(p.bimaKati && p.bimaKati > 0));
    setIncludeTax(Boolean(p.samajikSurakshaKar1Pct && p.samajikSurakshaKar1Pct > 0));
    setRemarks(p.remarks || '');
    setIsModalOpen(true);
  };

  // Create Payroll Mutation
  const createPayrollMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTeacherId) throw new Error('Please select a teacher');
      const payload = {
        teacherId: parseInt(selectedTeacherId),
        academicYearId: activeYear?.id || 1,
        financialYearId: autoResolvedFY?.id || activeFinancialYear?.id,
        monthFrom,
        monthTo,
        taha,
        shreni,
        moolTalab,
        gradeNo,
        gradeAmount,
        mahangiGhata,
        praABhata,
        sahayakPraABhata,
        prabiInchargeBhata,
        mabiInchargeBhata,
        otherBhata,
        karmachariKoshSapati,
        bimaKati,
        peshkiKati,
        includeChaadparba,
        peshki,
        includeEpf,
        includeSsk,
        includeBima,
        includeTax,
        monthsCount,
        paidAmount,
        paymentDateBs,
        paymentMethod,
        remarks,
      };
      if (editingPayroll) {
        const res = await api.put(`/payroll/${editingPayroll.id}`, payload);
        return res.data;
      } else {
        const res = await api.post('/payroll', payload);
        return res.data;
      }
    },
    onSuccess: (data) => {
      toast.success(editingPayroll ? 'Payroll record updated successfully!' : 'Teacher Payroll generated & saved successfully!');
      setIsModalOpen(false);
      setEditingPayroll(null);
      setSelectedSlip(data.data);
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.message || err.response?.data?.message || 'Failed to save payroll');
    },
  });

  // Disburse / Record Payment Mutation
  const payMutation = useMutation({
    mutationFn: async ({ id, amount, paymentDateBs, paymentMethod, remarks }: any) => {
      const res = await api.post(`/payroll/${id}/pay`, {
        amount,
        paymentDateBs,
        paymentMethod,
        remarks,
      });
      return res.data;
    },
    onSuccess: (res) => {
      toast.success(res.message || 'Payment recorded successfully!');
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      setPaymentModalPayroll(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    },
  });

  // Delete Payroll Mutation (Proxy-Proof)
  const deletePayrollMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/payroll/${id}/delete`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Payroll record deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete payroll record.');
    },
  });

  const payrolls = payrollsData || [];

  // Filtered teachers list for quick selection
  const filteredTeachers = (teachersData || []).filter((t: any) =>
    t.fullName?.toLowerCase().includes(teacherSearchTerm.toLowerCase()) ||
    t.panNo?.includes(teacherSearchTerm)
  );

  const triggerPayrollSlipPrint = () => {
    if (!selectedSlip) return;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const p = selectedSlip;
    const teacherName = p.teacher?.fullName || p.teacherName || '—';

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Salary Slip - ${teacherName}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; font-size: 11px; }
            .card { border: 2px solid #1e3a5f; padding: 20px; border-radius: 8px; }
            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 12px; }
            .school-name { font-size: 17px; font-weight: 900; color: #1e3a5f; margin: 2px 0; }
            .badge { font-size: 11px; font-weight: 900; background: #eff6ff; color: #1e3a5f; display: inline-block; padding: 3px 12px; border-radius: 4px; uppercase; border: 1px solid #bfdbfe; margin-top: 4px; }
            .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; font-size: 10.5px; margin-bottom: 12px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 12px; }
            th { background: #1e3a5f; color: #fff; padding: 6px 4px; text-align: left; font-size: 9.5px; border: 1px solid #1e3a5f; }
            td { padding: 5px 4px; border-bottom: 1px solid #e2e8f0; }
            .footer-sig { margin-top: 40px; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; }
            .sig-box { width: 150px; text-align: center; border-top: 1px solid #333; padding-top: 3px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="school-name">${schoolProfile?.name || 'BRINDAWAN PUBLIC SCHOOL (बृन्दावन पब्लिक स्कूल)'}</div>
              <div style="font-size: 10px; color: #64748b;">${schoolProfile?.address || 'Brindawan, Rautahat, Madhesh Province, Nepal'} | Staff Salary & Allowance Voucher</div>
              <div class="badge">आर्थिक वर्ष: ${p.financialYear?.year || getFiscalYearFromBS(p.monthFrom || todayBS())} | PERIOD: ${p.monthFrom || ''} TO ${p.monthTo || ''}</div>
            </div>

            <div class="meta-grid">
              <div><strong>TEACHER NAME:</strong> ${teacherName}</div>
              <div><strong>DESIGNATION / TAHA:</strong> ${p.taha || '—'}</div>
              <div><strong>PAN NO:</strong> ${p.teacher?.panNo || 'N/A'}</div>
              <div><strong>PAYMENT METHOD:</strong> ${p.paymentMethod || 'CASH'} ${p.teacher?.bankAccountNo ? `(A/C: ${p.teacher.bankAccountNo})` : ''}</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>EARNING HEADS (निकासा शिर्षक)</th>
                  <th style="text-align: right; width: 120px;">AMOUNT (रू)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Basic Monthly Salary (मासिक तलब)</td><td style="text-align: right; font-family: monospace;">${(p.moolTalab || 0).toLocaleString()}</td></tr>
                ${p.gradeRakam > 0 ? `<tr><td>Grade Rakam (${p.gradeNo || 0} Grades) (ग्रेड रकम)</td><td style="text-align: right; font-family: monospace;">${(p.gradeRakam || 0).toLocaleString()}</td></tr>` : ''}
                ${p.mahangiGhata > 0 ? `<tr><td>Mahangi Bhata (महँगी भत्ता)</td><td style="text-align: right; font-family: monospace;">${(p.mahangiGhata || 0).toLocaleString()}</td></tr>` : ''}
                ${p.praABhata > 0 ? `<tr><td>Incharge / Special Allowance (इन्चार्ज/विशेष भत्ता)</td><td style="text-align: right; font-family: monospace;">${(p.praABhata || 0).toLocaleString()}</td></tr>` : ''}
                ${p.otherBhata > 0 ? `<tr><td>Other Allowances (अन्य भत्ता)</td><td style="text-align: right; font-family: monospace;">${(p.otherBhata || 0).toLocaleString()}</td></tr>` : ''}
                <tr style="background: #f8fafc; font-weight: bold;"><td>Total Gross Salary (जम्मा तलब भत्ता)</td><td style="text-align: right; font-family: monospace; font-size: 11px; color: #1e3a5f;">${(p.traimasikTalan || 0).toLocaleString()}</td></tr>
              </tbody>
            </table>

            <table>
              <thead>
                <tr>
                  <th>DEDUCTION HEADS (कट्टी विवरण)</th>
                  <th style="text-align: right; width: 120px;">AMOUNT (रू)</th>
                </tr>
              </thead>
              <tbody>
                ${p.karmachari10Pct > 0 ? `<tr><td>Karmachari Sanchaya Kosh (कर्मचारी सञ्चय कोष)</td><td style="text-align: right; font-family: monospace;">${(p.karmachari10Pct || 0).toLocaleString()}</td></tr>` : ''}
                ${p.karmachariKoshSapati > 0 ? `<tr><td>Advance / Loan Deduction (पेश्की/ऋण कट्टी)</td><td style="text-align: right; font-family: monospace;">${(p.karmachariKoshSapati || 0).toLocaleString()}</td></tr>` : ''}
                ${p.bimaKatti > 0 ? `<tr><td>Bima Katti (बीमा कट्टी)</td><td style="text-align: right; font-family: monospace;">${(p.bimaKatti || 0).toLocaleString()}</td></tr>` : ''}
                ${p.samajikSurakshaKar1Pct > 0 ? `<tr><td>Social Security Tax 1% (सामाजिक सुरक्षा कर)</td><td style="text-align: right; font-family: monospace;">${(p.samajikSurakshaKar1Pct || 0).toLocaleString()}</td></tr>` : ''}
                <tr style="background: #fff1f2; font-weight: bold; color: #9f1239;"><td>Total Deductions (जम्मा कट्टी)</td><td style="text-align: right; font-family: monospace;">${(p.jammaKati || 0).toLocaleString()}</td></tr>
              </tbody>
            </table>

            <div style="background: #f0fdf4; border: 1.5px solid #16a34a; padding: 10px 14px; border-radius: 6px; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #86efac; padding-bottom: 6px; margin-bottom: 6px;">
                <span style="font-size: 11px; font-weight: bold; color: #166534; text-transform: uppercase;">KHUD PAAUNU PARNE (NET SALARY):</span>
                <strong style="font-size: 16px; color: #166534; font-family: monospace; font-weight: 900;">रू ${(p.khudPaaunuParne || 0).toLocaleString()}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: #374151;">
                <div>PAID AMOUNT (हालसम्म भुक्तानी): <strong style="color: #047857; font-family: monospace;">रू ${(p.paidAmount || 0).toLocaleString()}</strong></div>
                <div>REMAINING BALANCE DUE (बाँकी रकम): <strong style="color: ${(p.khudPaaunuParne || 0) - (p.paidAmount || 0) > 0 ? '#b91c1c' : '#047857'}; font-family: monospace;">रू ${Math.max(0, (p.khudPaaunuParne || 0) - (p.paidAmount || 0)).toLocaleString()}</strong></div>
                <div>STATUS: <strong style="text-transform: uppercase; color: ${(p.khudPaaunuParne || 0) <= (p.paidAmount || 0) ? '#047857' : (p.paidAmount || 0) > 0 ? '#b45309' : '#b91c1c'}">${p.status || ((p.paidAmount || 0) >= (p.khudPaaunuParne || 0) ? 'PAID' : (p.paidAmount || 0) > 0 ? 'PARTIAL' : 'DUE')}</strong></div>
              </div>
            </div>

            <div class="footer-sig">
              <div class="sig-box">Employee Signature</div>
              <div class="sig-box">Accountant (लेखापाल)</div>
              <div class="sig-box">Principal / School Stamp</div>
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

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f]">
            Teacher & Staff Payroll (शिक्षक तलब तथा भत्ता निकासा)
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            नेपाल सरकारको नियमानुसार: ग्रेड, भत्ता, संचय कोष (१०%), पेश्की कट्टी, १% सामाजिक सुरक्षा कर र खुद भुक्तानी
          </p>
        </div>

        <button
          onClick={() => {
            setEditingPayroll(null);
            setSelectedTeacherId('');
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-4 py-2 text-xs font-bold text-white hover:bg-[#2a5280] shadow-2xs transition"
        >
          <Plus size={14} />
          <span>Generate Teacher Payroll (तलब तयार गर्नुहोस्)</span>
        </button>
      </div>

      {/* ── REGISTERED TEACHERS DIRECT QUICK SELECTION ────────────────────────── */}
      <div className="rounded-2xl border border-blue-100 bg-linear-to-r from-blue-50/70 to-indigo-50/50 p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <UserCheck className="text-blue-700" size={18} />
            <h2 className="text-sm font-bold text-[#1e3a5f]">
              Registered Teachers List (शिक्षक सूची) — Direct Payroll Generation
            </h2>
            <span className="rounded-full bg-blue-200 text-blue-900 px-2 py-0.5 text-[10px] font-black">
              {teachersData?.length || 0} Teachers
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search teacher by name/PAN..."
              value={teacherSearchTerm}
              onChange={(e) => setTeacherSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white pl-8 pr-3 py-1 text-xs focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {!teachersData || teachersData.length === 0 ? (
          <p className="text-xs text-gray-500 italic p-2">
            No active teachers registered yet. Add teachers in <strong className="text-blue-700">Teachers Page</strong> to manage payroll.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {filteredTeachers.map((t: any) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-gray-100 shadow-2xs hover:border-blue-300 transition"
              >
                <div className="overflow-hidden pr-2">
                  <p className="text-xs font-bold text-gray-900 truncate">{t.fullName}</p>
                  <p className="text-[10px] text-gray-500 truncate">{t.taha || t.post || 'Teacher'}</p>
                </div>
                <button
                  onClick={() => handleQuickGenerateForTeacher(t)}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 text-[10px] font-bold shrink-0 transition"
                >
                  <Plus size={11} />
                  <span>Payroll</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payroll Records Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#1e3a5f]">Generated Payroll History (निकासा विवरण)</h2>
          <span className="text-xs font-semibold text-gray-500">{payrolls.length} Total Payroll Slips</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-[#1e3a5f] text-white">
              <tr>
                <th className="px-4 py-3.5 font-bold uppercase">Teacher / Staff</th>
                <th className="px-4 py-3.5 font-bold uppercase">Designation</th>
                <th className="px-4 py-3.5 font-bold uppercase">Period</th>
                <th className="px-4 py-3.5 font-bold uppercase text-right">Net Salary (खुद रकम)</th>
                <th className="px-4 py-3.5 font-bold uppercase text-right">Paid (भुक्तानी)</th>
                <th className="px-4 py-3.5 font-bold uppercase text-right">Due (बाँकी)</th>
                <th className="px-4 py-3.5 font-bold uppercase text-center">Status</th>
                <th className="px-4 py-3.5 font-bold uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400">Loading payroll history...</td></tr>
              ) : payrolls.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    <Wallet size={28} className="mx-auto text-gray-300 mb-1" />
                    <p className="text-sm font-semibold text-gray-600">No payroll records generated yet</p>
                  </td>
                </tr>
              ) : (
                payrolls.map((p: any) => {
                  const paid = p.paidAmount || 0;
                  const net = p.khudPaaunuParne || 0;
                  const remaining = p.bakiPaaunuParne !== undefined ? p.bakiPaaunuParne : Math.max(0, net - paid);
                  const isPaid = p.status === 'PAID' || (remaining <= 0 && paid > 0);
                  const isPartial = p.status === 'PARTIAL' || (paid > 0 && remaining > 0);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3.5 font-bold text-gray-900">
                        {p.teacher?.fullName || '—'}
                        {p.teacher?.bankAccountNo && (
                          <p className="text-[10px] text-gray-400 font-mono font-normal">A/C: {p.teacher.bankAccountNo}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                          {p.teacher?.type === 'RASTRIYA' ? 'स्थायी' : 'करार / निजी'}
                        </span>
                        <p className="text-[10px] text-gray-500 mt-0.5">{p.taha}</p>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-gray-600">
                        {p.monthFrom} {p.monthTo && p.monthTo !== p.monthFrom ? `to ${p.monthTo}` : ''}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-extrabold text-slate-900 text-sm">
                        रू {net.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-700">
                        रू {paid.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-rose-600">
                        {remaining > 0 ? `रू ${remaining.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {isPaid ? (
                          <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-black border border-emerald-300">
                            PAID (सम्पन्न)
                          </span>
                        ) : isPartial ? (
                          <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-black border border-amber-300">
                            PARTIAL (आंशिक)
                          </span>
                        ) : (
                          <span className="rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-black border border-rose-300">
                            DUE (भुक्तानी बाँकी)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isPaid && (
                            <button
                              onClick={() => {
                                setPaymentModalPayroll(p);
                                setDisburseAmount(String(remaining > 0 ? remaining : net));
                                setDisburseDateBs(todayBS());
                                setDisburseMethod(p.paymentMethod || 'CASH');
                                setDisburseRemarks('');
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 text-[10px] font-extrabold shadow-2xs transition"
                              title="Disburse / Record Payment"
                            >
                              <Banknote size={12} />
                              <span>Pay</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedSlip(p)}
                            className="inline-flex items-center gap-1 rounded bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] px-2 py-1 text-[10px] font-extrabold shadow-2xs transition"
                            title="Print Pay Slip"
                          >
                            <Printer size={12} />
                            <span>Slip</span>
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 text-[10px] font-bold shadow-2xs transition"
                            title="Edit Payroll Record"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete payroll record for "${p.teacher?.fullName || 'Teacher'}"?`)) {
                                deletePayrollMutation.mutate(p.id);
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2 py-1 text-[10px] font-bold shadow-2xs transition"
                            title="Delete Payroll Record"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── GENERATE / EDIT PAYROLL MODAL ────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-[#1e3a5f]">
                  {editingPayroll ? 'Edit Staff Payroll Record (तलब संशोधन)' : 'Brindawan Public School Staff Payroll System (कर्मचारी मासिक तलब निकासा)'}
                </h3>
                <p className="text-xs text-gray-500">
                  {editingPayroll ? `Editing record #${editingPayroll.id}` : 'Select registered teacher or scale to auto-compute salary & deductions'}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Form Input Columns */}
              <div className="md:col-span-2 space-y-4">
                {/* 1. Teacher & Scale Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Select Teacher (शिक्षक)</label>
                    <select
                      value={selectedTeacherId}
                      onChange={(e) => handleTeacherChange(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white font-medium"
                    >
                      <option value="">-- Choose Registered Teacher --</option>
                      {teachersData?.map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.fullName} ({t.type === 'RASTRIYA' ? 'Full-Time' : 'Contract'} - {t.taha || 'General'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Scale Preset (तह/श्रेणी)</label>
                    <select
                      onChange={(e) => handleScaleSelect(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white"
                    >
                      <option value="">-- Select Scale Preset --</option>
                      {scalesData?.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.taha} ({s.shreni}) — Rs. {s.moolTalab}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Period & Duration Info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Month From (महिना)</label>
                    <input
                      type="text"
                      value={monthFrom}
                      onChange={(e) => setMonthFrom(e.target.value)}
                      placeholder="2083-01"
                      className="w-full rounded-lg border border-gray-300 p-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Duration (अवधि)</label>
                    <select
                      value={monthsCount}
                      onChange={(e) => setMonthsCount(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 p-2 text-xs bg-white font-medium"
                    >
                      <option value={1}>1 Month (मासिक)</option>
                      <option value={2}>2 Months (२ महिना)</option>
                      <option value={3}>3 Months (त्रैमासिक)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Agreed Monthly Salary (मासिक तलब)</label>
                    <input
                      type="number"
                      step="any"
                      value={moolTalab}
                      onChange={(e) => setMoolTalab(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 p-2 text-xs font-mono font-bold text-[#1e3a5f]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Grade No & Amt (Optional)</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        step="any"
                        placeholder="No"
                        value={gradeNo}
                        onChange={(e) => setGradeNo(Number(e.target.value))}
                        className="w-1/2 rounded-lg border border-gray-300 p-2 text-xs font-mono"
                      />
                      <input
                        type="number"
                        step="any"
                        placeholder="Amt"
                        value={gradeAmount}
                        onChange={(e) => setGradeAmount(Number(e.target.value))}
                        className="w-1/2 rounded-lg border border-gray-300 p-2 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Allowances Section */}
                <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100 space-y-2">
                  <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wide">
                    Allowances & Perks (भत्ता तथा थप सुविधाहरू)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="text-[11px] text-gray-600">Mahangi (महँगी)</label>
                      <input
                        type="number"
                        step="any"
                        value={mahangiGhata}
                        onChange={(e) => setMahangiGhata(Number(e.target.value))}
                        className="w-full rounded-md border border-gray-200 bg-white p-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-600">Pra-A (प्र.अ.)</label>
                      <input
                        type="number"
                        step="any"
                        value={praABhata}
                        onChange={(e) => setPraABhata(Number(e.target.value))}
                        className="w-full rounded-md border border-gray-200 bg-white p-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-600">Incharge Bhata</label>
                      <input
                        type="number"
                        step="any"
                        value={prabiInchargeBhata}
                        onChange={(e) => setPrabiInchargeBhata(Number(e.target.value))}
                        className="w-full rounded-md border border-gray-200 bg-white p-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-600">Other (यातायात/विशेष)</label>
                      <input
                        type="number"
                        step="any"
                        value={otherBhata}
                        onChange={(e) => setOtherBhata(Number(e.target.value))}
                        className="w-full rounded-md border border-gray-200 bg-white p-1.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Deductions Section */}
                <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-100 space-y-2">
                  <span className="text-xs font-extrabold text-rose-800 uppercase tracking-wide">
                    Private School Deductions (नियमित कट्टीहरू)
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[11px] text-gray-700 font-bold">Peshki Katti (पेश्की कट्टी):</label>
                      <input
                        type="number"
                        step="any"
                        value={peshkiKati}
                        onChange={(e) => setPeshkiKati(Number(e.target.value))}
                        placeholder="Advance deduction"
                        className="w-full rounded-md border border-gray-200 bg-white p-1.5 text-xs font-mono font-bold text-rose-700"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-700 font-bold">Absent / Loan (सापटी वा बिदा कट्टी):</label>
                      <input
                        type="number"
                        step="any"
                        value={karmachariKoshSapati}
                        onChange={(e) => setKarmachariKoshSapati(Number(e.target.value))}
                        placeholder="Absent/other deduction"
                        className="w-full rounded-md border border-gray-200 bg-white p-1.5 text-xs font-mono font-bold text-rose-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Private School Checkboxes for Gov Items */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      सरकारी वा ऐच्छिक सुविधा (Government / Optional Cuts — Checkbox):
                    </span>
                    <span className="text-[10px] text-gray-500 font-semibold">बोर्डिङ स्कूलमा प्रायः लागु हुँदैन (Unchecked)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                      <input
                        type="checkbox"
                        checked={includeEpf}
                        onChange={(e) => setIncludeEpf(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span>EPF (१०% कट्टी)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                      <input
                        type="checkbox"
                        checked={includeSsk}
                        onChange={(e) => setIncludeSsk(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span>SSK (२०% कोष)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                      <input
                        type="checkbox"
                        checked={includeBima}
                        onChange={(e) => setIncludeBima(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span>बीमा (Beema)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                      <input
                        type="checkbox"
                        checked={includeTax}
                        onChange={(e) => setIncludeTax(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span>१% कर (Tax)</span>
                    </label>
                  </div>
                  {includeBima && (
                    <div className="pt-1 flex items-center gap-2">
                      <span className="text-xs text-gray-600">Beema Amount (रू):</span>
                      <input
                        type="number"
                        value={bimaKati}
                        onChange={(e) => setBimaKati(Number(e.target.value))}
                        className="w-28 rounded border border-gray-300 p-1 text-xs font-mono"
                      />
                    </div>
                  )}
                </div>

                {/* Salary Disbursement Status on Creation */}
                <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-emerald-900 uppercase">
                      Salary Disbursement (तलब भुक्तानी विवरण):
                    </span>
                    <button
                      type="button"
                      onClick={() => setPaidAmount(khudPaaunuParne)}
                      className="text-[11px] font-bold text-emerald-700 underline hover:text-emerald-900"
                    >
                      Pay Full (रू. {khudPaaunuParne.toLocaleString()})
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <label className="text-[11px] font-bold text-gray-700 mb-1 block">Paid Amount (हाल भुक्तानी रू):</label>
                      <input
                        type="number"
                        min="0"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(Number(e.target.value))}
                        placeholder="0 = Due"
                        className="w-full rounded-md border border-gray-300 bg-white p-1.5 text-xs font-mono font-bold text-emerald-800"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-700 mb-1 block">Payment Method:</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full rounded-md border border-gray-300 bg-white p-1.5 text-xs"
                      >
                        <option value="CASH">नगद (Cash)</option>
                        <option value="BANK_TRANSFER">Bank Deposit / Transfer</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="ESEWA_KHALTI">eSewa / Khalti</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-700 mb-1 block">Payment Date (BS):</label>
                      <input
                        type="text"
                        value={paymentDateBs}
                        onChange={(e) => setPaymentDateBs(formatDateInput(e.target.value))}
                        className="w-full rounded-md border border-gray-300 bg-white p-1.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Remarks / Note</label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Optional remarks (e.g. Paid in cash, Remaining to be cleared next month)..."
                    className="w-full rounded-lg border border-gray-300 p-2 text-xs"
                  />
                </div>
              </div>

              {/* Live Preview Column */}
              <div className="bg-[#1e3a5f] text-white p-5 rounded-2xl flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-1.5 border-b border-blue-800 pb-2 mb-3">
                    <Calculator size={16} className="text-amber-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      Private School Payroll Summary
                    </h4>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-blue-900/60 pb-1">
                      <span className="text-gray-300">Basic Monthly:</span>
                      <span className="font-mono font-bold">Rs. {moolTalab.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between border-b border-blue-900/60 pb-1">
                      <span className="text-gray-300">Total Allowances:</span>
                      <span className="font-mono font-semibold text-emerald-300">+ Rs. {jammaBhata.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between border-b border-blue-900/60 pb-1 pt-1 font-bold text-amber-300">
                      <span>Total Gross ({monthsCount} Month):</span>
                      <span className="font-mono">Rs. {traimasikTalan.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between border-b border-blue-900/60 pb-1 text-rose-300">
                      <span>Total Deductions:</span>
                      <span className="font-mono">- Rs. {jammaKati.toLocaleString()}</span>
                    </div>

                    {includeTax && (
                      <div className="flex justify-between border-b border-blue-900/60 pb-1 text-gray-300">
                        <span>1% SST Tax:</span>
                        <span className="font-mono">- Rs. {samajikSurakshaKar1Pct.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="flex justify-between border-b border-blue-800/80 pt-2 pb-1 text-sm font-black text-emerald-300">
                      <span>Net Payable:</span>
                      <span className="font-mono">Rs. {khudPaaunuParne.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between border-b border-blue-900/60 pb-1 text-xs text-blue-200">
                      <span>Paid Now:</span>
                      <span className="font-mono font-bold text-white">Rs. {livePaidAmount.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between pb-1 text-xs font-bold text-amber-400">
                      <span>Remaining Balance Due:</span>
                      <span className="font-mono">Rs. {liveRemainingDue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-950/80 border border-emerald-500/40 p-3.5 rounded-xl">
                  <span className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider">
                    NET DISBURSEMENT STATUS:
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-xl font-black font-mono text-emerald-400">
                      Rs. {khudPaaunuParne.toLocaleString()}
                    </div>
                    <div>
                      {livePaidAmount >= khudPaaunuParne && khudPaaunuParne > 0 ? (
                        <span className="bg-emerald-500 text-white px-2 py-0.5 rounded text-[10px] font-black">
                          FULLY PAID
                        </span>
                      ) : livePaidAmount > 0 ? (
                        <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-[10px] font-black">
                          PARTIAL PAID
                        </span>
                      ) : (
                        <span className="bg-rose-500 text-white px-2 py-0.5 rounded text-[10px] font-black">
                          PAYMENT DUE
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => createPayrollMutation.mutate()}
                  disabled={createPayrollMutation.isPending}
                  className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white py-3 text-xs font-extrabold shadow-lg transition"
                >
                  {createPayrollMutation.isPending
                    ? 'Saving Payroll...'
                    : editingPayroll
                    ? 'Update Payroll Record (निकासा अपडेट)'
                    : 'Save & Issue Payroll (निकासा सेभ गर्नुहोस्)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── QUICK DISBURSE / PAY MODAL ────────────────────────────────────── */}
      {paymentModalPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1e3a5f]">
                  Record Salary Payment (तलब भुक्तानी)
                </h3>
                <p className="text-xs text-gray-500">
                  {paymentModalPayroll.teacher?.fullName || 'Teacher'} — {paymentModalPayroll.monthFrom}
                </p>
              </div>
              <button onClick={() => setPaymentModalPayroll(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {/* Current Summary */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border text-center text-xs">
              <div>
                <span className="text-gray-500 block text-[10px]">Net Salary</span>
                <strong className="text-[#1e3a5f] font-mono">
                  रू {(paymentModalPayroll.khudPaaunuParne || 0).toLocaleString()}
                </strong>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px]">Already Paid</span>
                <strong className="text-emerald-700 font-mono">
                  रू {(paymentModalPayroll.paidAmount || 0).toLocaleString()}
                </strong>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px]">Remaining Due</span>
                <strong className="text-rose-600 font-mono">
                  रू {Math.max(0, (paymentModalPayroll.khudPaaunuParne || 0) - (paymentModalPayroll.paidAmount || 0)).toLocaleString()}
                </strong>
              </div>
            </div>

            {/* Quick Fill Buttons */}
            {(() => {
              const net = paymentModalPayroll.khudPaaunuParne || 0;
              const alreadyPaid = paymentModalPayroll.paidAmount || 0;
              const remainingDue = Math.max(0, net - alreadyPaid);
              return (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDisburseAmount(String(remainingDue))}
                    className="flex-1 py-1 text-[11px] font-bold rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  >
                    Clear Full Due (रू {remainingDue.toLocaleString()})
                  </button>
                  {remainingDue > 0 && (
                    <button
                      type="button"
                      onClick={() => setDisburseAmount(String(Math.round(remainingDue / 2)))}
                      className="py-1 px-3 text-[11px] font-bold rounded-lg border border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100"
                    >
                      50% (रू {Math.round(remainingDue / 2).toLocaleString()})
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Inputs */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Payment Amount to Disburse (रू भुक्तानी रकम):
                </label>
                <input
                  type="number"
                  min="1"
                  value={disburseAmount}
                  onChange={(e) => setDisburseAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm font-mono font-bold text-emerald-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Payment Method:</label>
                  <select
                    value={disburseMethod}
                    onChange={(e) => setDisburseMethod(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2 bg-white"
                  >
                    <option value="CASH">नगद (Cash)</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="ESEWA_KHALTI">eSewa / Khalti</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Payment Date (BS):</label>
                  <input
                    type="text"
                    value={disburseDateBs}
                    onChange={(e) => setDisburseDateBs(formatDateInput(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 p-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Remarks / Transaction Ref:</label>
                <input
                  type="text"
                  value={disburseRemarks}
                  onChange={(e) => setDisburseRemarks(e.target.value)}
                  placeholder="e.g. Paid in cash / Cheque #12345"
                  className="w-full rounded-lg border border-gray-300 p-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setPaymentModalPayroll(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={payMutation.isPending || !disburseAmount || Number(disburseAmount) <= 0}
                onClick={() => {
                  payMutation.mutate({
                    id: paymentModalPayroll.id,
                    amount: Number(disburseAmount),
                    paymentDateBs: disburseDateBs,
                    paymentMethod: disburseMethod,
                    remarks: disburseRemarks,
                  });
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition disabled:opacity-50"
              >
                <Banknote size={14} />
                <span>{payMutation.isPending ? 'Processing...' : 'Confirm & Save Payment'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PRINT PAY SLIP MODAL ────────────────────────────────────────────── */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-[#1e3a5f]">Pay Slip Options</h3>
              <button onClick={() => setSelectedSlip(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
              <CheckCircle2 size={32} className="mx-auto text-emerald-600 mb-2" />
              <p className="text-sm font-bold text-emerald-900">
                Payroll Slip Ready for {selectedSlip.teacher?.fullName || 'Teacher'}
              </p>
              <p className="text-xs text-emerald-700 mt-1 font-mono">
                Net Pay: Rs. {(selectedSlip.khudPaaunuParne || 0).toLocaleString()}
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setSelectedSlip(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-300 text-gray-600"
              >
                Close
              </button>
              <button
                onClick={triggerPayrollSlipPrint}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1e3a5f] text-white hover:bg-[#2a5280]"
              >
                Print Official Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
