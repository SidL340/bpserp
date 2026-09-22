'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  School,
  ArrowLeft,
  Send,
  Search,
  Printer,
  CheckCircle2,
  Clock,
  XCircle,
  User,
  Phone,
  MapPin,
  Sparkles,
  Bus,
  Award,
  AlertCircle,
  Receipt,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import api from '@/lib/api';
import { todayBS, formatDateInput, bsToAD } from '@/lib/nepali-date';

interface ApplicationData {
  id: number;
  applicationNo: string;
  studentName: string;
  studentNameNepali?: string;
  gender: string;
  desiredClass: string;
  dateOfBirthBs?: string;
  dateOfBirthAd?: string;
  bloodGroup?: string;
  motherTongue?: string;
  fatherName?: string;
  fatherPhone?: string;
  motherName?: string;
  motherPhone?: string;
  guardianName?: string;
  guardianContact: string;
  guardianRelation?: string;
  guardianEmail?: string;
  permanentAddress?: string;
  temporaryAddress?: string;
  needTransport: boolean;
  transportStop?: string;
  previousSchool?: string;
  previousClass?: string;
  medicalNotes?: string;
  status: 'PENDING' | 'APPROVED' | 'ADMITTED' | 'REJECTED';
  adminRemarks?: string;
  appliedDateBs?: string;
  createdAt: string;
}

export default function PublicAdmissionPage() {
  const [activeTab, setActiveTab] = useState<'apply' | 'track'>('apply');

  // Application Form State
  const [form, setForm] = useState({
    studentName: '',
    studentNameNepali: '',
    desiredClass: 'Play Group',
    gender: 'Male',
    dateOfBirthBs: '',
    dateOfBirthAd: '',
    bloodGroup: 'Unknown',
    motherTongue: 'Nepali',
    admissionDateBs: todayBS(),
    admissionChargeType: 'CHARGEABLE' as 'CHARGEABLE' | 'FREE',
    fatherName: '',
    fatherPhone: '',
    fatherOccupation: '',
    motherName: '',
    motherPhone: '',
    motherOccupation: '',
    guardianName: '',
    guardianContact: '',
    guardianRelation: 'Father',
    guardianEmail: '',
    permanentAddress: 'Brindaban Municipality-02, Rautahat',
    temporaryAddress: '',
    needTransport: false,
    transportStop: 'Brindaban Chowk / Ward 2 (वडा २ चोक)',
    transportFee: 800,
    previousSchool: '',
    previousClass: '',
    medicalNotes: '',
    appliedDateBs: todayBS(),
  });

  const [manualAdEdited, setManualAdEdited] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedApplication, setSubmittedApplication] = useState<ApplicationData | null>(null);

  const classFeeRates: Record<string, number> = {
    'Play Group': 1500,
    'Nursery': 1500,
    'LKG': 1500,
    'UKG / KG': 1500,
    'Class 1': 2000,
    'Class 2': 2000,
    'Class 3': 2000,
    'Class 4': 2000,
    'Class 5': 2000,
  };

  const transportStopOptions = [
    { name: 'Brindaban Chowk / Ward 2 (वडा २ चोक)', fee: 800 },
    { name: 'Pipra Chowk (पिपरा बजार)', fee: 1000 },
    { name: 'Madhopur Road (माधोपुर सडक खण्ड)', fee: 1200 },
    { name: 'Garuda Highway Crossing (गरुडा राजमार्ग)', fee: 1500 },
    { name: 'Other School Van Stop (अन्य स्टेशन)', fee: 1000 },
  ];

  // Tracking State
  const [trackQuery, setTrackQuery] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [trackedApplication, setTrackedApplication] = useState<ApplicationData | null>(null);
  const [trackError, setTrackError] = useState('');

  const classOptions = [
    'Play Group',
    'Nursery',
    'LKG',
    'UKG / KG',
    'Class 1',
    'Class 2',
    'Class 3',
    'Class 4',
    'Class 5',
  ];

  const handleDobBsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDateInput(e.target.value);
    setForm((prev) => {
      const updated = { ...prev, dateOfBirthBs: formatted };
      if (!manualAdEdited) {
        const ad = bsToAD(formatted);
        if (ad) updated.dateOfBirthAd = ad;
      }
      return updated;
    });
  };

  const handleDobAdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setManualAdEdited(true);
    setForm((prev) => ({ ...prev, dateOfBirthAd: e.target.value }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentName.trim()) {
      toast.error('Please enter student full name');
      return;
    }
    const primaryPhone = form.guardianContact || form.fatherPhone || form.motherPhone;
    if (!primaryPhone) {
      toast.error('Please provide at least one contact phone number (Father, Mother, or Guardian)');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...form,
        guardianContact: form.guardianContact || primaryPhone,
        guardianName: form.guardianName || form.fatherName || form.motherName || 'Parent',
      };
      const res = await api.post('/admissions/public-apply', payload);
      if (res.data?.success && res.data?.data) {
        setSubmittedApplication(res.data.data);
        toast.success('Application submitted successfully! Please save your Application Slip.');
      } else {
        toast.error(res.data?.message || 'Failed to submit application.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Network error while submitting application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackQuery.trim()) {
      toast.error('Please enter application reference number or registered phone number.');
      return;
    }
    setIsTracking(true);
    setTrackError('');
    setTrackedApplication(null);

    try {
      const res = await api.get(`/admissions/track?query=${encodeURIComponent(trackQuery.trim())}`);
      if (res.data?.success && res.data?.data) {
        setTrackedApplication(res.data.data);
      } else {
        setTrackError('No application found with the provided details.');
      }
    } catch (err: any) {
      setTrackError(err.response?.data?.message || 'Application not found. Please check your reference or phone number.');
    } finally {
      setIsTracking(false);
    }
  };

  const printSlip = (app: ApplicationData) => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Admission Slip - ${app.applicationNo}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; font-size: 13px; line-height: 1.6; }
            .slip-card { border: 2px solid #1e3a5f; padding: 24px; border-radius: 8px; position: relative; max-width: 800px; margin: auto; }
            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 14px; margin-bottom: 18px; }
            .school-name { font-size: 22px; font-weight: 900; color: #1e3a5f; margin: 0; text-transform: uppercase; }
            .school-sub { font-size: 13px; font-weight: 700; color: #b45309; }
            .school-meta { font-size: 11px; color: #4b5563; margin-top: 4px; }
            .slip-badge { font-size: 13px; font-weight: 900; background: #fef3c7; color: #92400e; display: inline-block; padding: 4px 18px; border-radius: 9999px; margin-top: 8px; border: 1px solid #fde68a; letter-spacing: 1px; }
            .meta-bar { display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; margin-bottom: 16px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; font-size: 13px; }
            .item-label { color: #64748b; font-weight: 600; font-size: 11px; text-transform: uppercase; }
            .item-value { font-weight: bold; color: #0f172a; }
            .checklist { margin-top: 20px; padding: 14px; background: #f1f5f9; border-radius: 6px; border: 1px dashed #94a3b8; }
            .checklist-title { font-weight: bold; color: #1e3a5f; margin-bottom: 6px; font-size: 12px; }
            .checklist ul { margin: 0; padding-left: 18px; font-size: 11.5px; color: #334155; }
            .footer-sig { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; text-align: center; }
            .sig-box { width: 180px; border-top: 1px solid #333; padding-top: 6px; }
          </style>
        </head>
        <body>
          <div class="slip-card">
            <div class="header">
              <div class="school-name">BRINDAWAN PUBLIC SCHOOL</div>
              <div class="school-sub">बृन्दावन पब्लिक स्कूल, रौतहट</div>
              <div class="school-meta">Brindaban Municipality-02, Rautahat, Madhesh Province, Nepal • Phone: +977 9845000000 • EMIS Code: BPS-320160</div>
              <div class="slip-badge">ONLINE ADMISSION APPLICATION ACKNOWLEDGMENT SLIP (आवेदन पावती पत्र)</div>
            </div>

            <div class="meta-bar">
              <div>Application Ref No: <strong style="color: #1e3a5f;">${app.applicationNo}</strong></div>
              <div>Applied Date: <strong>${app.appliedDateBs || todayBS()} BS</strong></div>
              <div>Status: <strong>${app.status}</strong></div>
            </div>

            <div class="grid">
              <div>
                <div class="item-label">Student Name</div>
                <div class="item-value">${app.studentName} ${app.studentNameNepali ? `(${app.studentNameNepali})` : ''}</div>
              </div>
              <div>
                <div class="item-label">Applying For Class / Grade</div>
                <div class="item-value" style="color: #1e3a5f; font-size: 15px;">${app.desiredClass}</div>
              </div>
              <div>
                <div class="item-label">Gender / Blood Group</div>
                <div class="item-value">${app.gender} | ${app.bloodGroup || 'Not Specified'}</div>
              </div>
              <div>
                <div class="item-label">Date of Birth</div>
                <div class="item-value">${app.dateOfBirthBs || '—'} B.S.</div>
              </div>
              <div>
                <div class="item-label">Father's Name & Phone</div>
                <div class="item-value">${app.fatherName || '—'} (${app.fatherPhone || '—'})</div>
              </div>
              <div>
                <div class="item-label">Mother's Name & Phone</div>
                <div class="item-value">${app.motherName || '—'} (${app.motherPhone || '—'})</div>
              </div>
              <div>
                <div class="item-label">Guardian / Primary Contact</div>
                <div class="item-value">${app.guardianName || '—'} (${app.guardianContact}) [${app.guardianRelation || 'Parent'}]</div>
              </div>
              <div>
                <div class="item-label">School Van Transportation</div>
                <div class="item-value">${app.needTransport ? `Yes (${app.transportStop || 'Required'})` : 'Not Required'}</div>
              </div>
              <div style="grid-column: span 2;">
                <div class="item-label">Address</div>
                <div class="item-value">${app.permanentAddress || 'Brindaban Municipality-02, Rautahat'}</div>
              </div>
            </div>

            <div class="checklist">
              <div class="checklist-title">📋 REQUIRED DOCUMENTS FOR PHYSICAL VERIFICATION & INTERVIEW:</div>
              <ul>
                <li>Printed copy of this Application Acknowledgment Slip</li>
                <li>Photocopy of Student's Official Birth Certificate (जन्म दर्ता प्रमाणपत्र)</li>
                <li>Two (2) recent passport-sized color photographs of the student</li>
                <li>Previous school Character / Transfer Certificate & Grade Sheet (if applicable for Class 1 to 5)</li>
                <li>Photocopy of Parent's Citizenship Card (नागरिकता प्रमाणपत्र)</li>
              </ul>
            </div>

            <div class="footer-sig">
              <div class="sig-box">Parent / Guardian Signature</div>
              <div class="sig-box">School Administration Seal</div>
              <div class="sig-box">Admission Officer / Principal</div>
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
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-amber-400 selection:text-slate-900">
      <Toaster position="top-right" />

      {/* Top Navbar */}
      <header className="bg-[#0f1d2e] text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-bold"
            >
              <ArrowLeft size={16} />
              <span>Back to Home</span>
            </Link>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1e3a5f] border-2 border-amber-400 flex items-center justify-center shrink-0">
                <School className="text-amber-300" size={20} />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                  BRINDAWAN PUBLIC SCHOOL
                </h1>
                <p className="text-xs font-nepali font-bold text-amber-400">
                  बृन्दावन पब्लिक स्कूल · अनलाइन भर्ना पोर्टल
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="bg-[#1e3a5f] hover:bg-[#284d7a] text-amber-300 border border-amber-400/40 font-bold px-3.5 py-1.5 rounded-xl text-xs transition"
            >
              🔐 ERP Login
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[#0d1e33] via-[#1e3a5f] to-[#0d1e33] text-white py-10 px-4 text-center">
        <div className="max-w-3xl mx-auto space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
            <Sparkles size={14} />
            <span>Academic Session 2083-84 · Admissions Open</span>
          </span>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            Student Online Admission Portal
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Welcome to Brindawan Public School. Enroll your child in our child-centered, English medium environment from Play Group to Class 5.
          </p>

          {/* Tab Switcher */}
          <div className="inline-flex p-1 bg-black/30 backdrop-blur-md rounded-2xl border border-white/10 mt-4">
            <button
              onClick={() => setActiveTab('apply')}
              className={`px-6 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'apply'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Send size={14} />
              <span>Apply for Admission (नयाँ भर्ना)</span>
            </button>
            <button
              onClick={() => setActiveTab('track')}
              className={`px-6 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'track'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Search size={14} />
              <span>Track Application (आवेदन स्थिति)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* ── TAB 1: APPLY FOR ADMISSION ────────────────────────────────────────── */}
        {activeTab === 'apply' && (
          <div>
            {submittedApplication ? (
              /* Success Slip Card */
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-10 space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 size={36} />
                </div>
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    Application Submitted Successfully!
                  </span>
                  <h3 className="text-2xl font-black text-[#1e3a5f] mt-3">
                    Thank You, {submittedApplication.studentName}!
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Your application has been received by Brindawan Public School Administration.
                  </p>
                </div>

                {/* Slip Details Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left max-w-xl mx-auto space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <span className="text-xs text-slate-500 font-bold uppercase">Application Reference No:</span>
                    <span className="text-base font-black text-[#1e3a5f] font-mono bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                      {submittedApplication.applicationNo}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500">Student Name:</span>
                      <p className="font-bold text-slate-900">{submittedApplication.studentName}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Applying Grade:</span>
                      <p className="font-bold text-slate-900">{submittedApplication.desiredClass}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Primary Contact:</span>
                      <p className="font-bold text-slate-900">{submittedApplication.guardianContact}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">School Van Transport:</span>
                      <p className="font-bold text-slate-900">
                        {submittedApplication.needTransport ? `Yes (${submittedApplication.transportStop || 'Required'})` : 'No'}
                      </p>
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900">
                    💡 <b>Next Step:</b> Please print this acknowledgment slip and visit the school administration office along with the child and original documents for physical document verification.
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                  <button
                    onClick={() => printSlip(submittedApplication)}
                    className="px-6 py-3 rounded-xl bg-[#1e3a5f] hover:bg-[#284d7a] text-white font-black text-xs transition shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Printer size={16} />
                    <span>Print Application Slip (पावती पत्र प्रिन्ट)</span>
                  </button>
                  <button
                    onClick={() => {
                      setSubmittedApplication(null);
                      setForm((prev) => ({
                        ...prev,
                        studentName: '',
                        studentNameNepali: '',
                        fatherName: '',
                        motherName: '',
                        guardianName: '',
                      }));
                    }}
                    className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                  >
                    Submit Another Application
                  </button>
                </div>
              </div>
            ) : (
              /* Application Form */
              <form onSubmit={handleApplySubmit} className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="bg-[#1e3a5f] text-white p-6 sm:p-8">
                  <h3 className="text-lg sm:text-xl font-black">
                    Student Admission Application Form (विद्यार्थी भर्ना आवेदन फारम)
                  </h3>
                  <p className="text-xs text-blue-200 mt-1">
                    Please provide accurate information as per official birth certificate and guardian credentials.
                  </p>
                </div>

                <div className="p-6 sm:p-10 space-y-8">
                  {/* Section 1: Student Information */}
                  <div>
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-[#1e3a5f] font-black text-sm uppercase tracking-wide">
                      <User size={18} className="text-amber-500" />
                      <span>1. Student Information (विद्यार्थीको विवरण)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Student Full Name (English) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          name="studentName"
                          value={form.studentName}
                          onChange={handleInputChange}
                          placeholder="e.g. Aarav Kumar Raut"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Student Name (नेपालीमा)
                        </label>
                        <input
                          type="text"
                          name="studentNameNepali"
                          value={form.studentNameNepali}
                          onChange={handleInputChange}
                          placeholder="उदा. आरभ कुमार राउत"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-nepali focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Applying For Grade / Class <span className="text-rose-500">*</span>
                        </label>
                        <select
                          name="desiredClass"
                          value={form.desiredClass}
                          onChange={handleInputChange}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-[#1e3a5f] bg-blue-50/50 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          {classOptions.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Gender <span className="text-rose-500">*</span>
                        </label>
                        <select
                          name="gender"
                          value={form.gender}
                          onChange={handleInputChange}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="Male">Male (छात्र)</option>
                          <option value="Female">Female (छात्रा)</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-700">
                            DOB in B.S. (जन्म मिति वि.सं.)
                          </label>
                          <span className="text-[10px] text-amber-600 font-semibold font-mono">YYYYMMDD</span>
                        </div>
                        <input
                          type="text"
                          name="dateOfBirthBs"
                          value={form.dateOfBirthBs}
                          onChange={handleDobBsChange}
                          placeholder="उदा. 20760410"
                          maxLength={10}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-700">
                            DOB in A.D. (ई.सं.)
                          </label>
                          <span className="text-[10px] text-blue-600 font-semibold">Auto-sync / Editable</span>
                        </div>
                        <input
                          type="date"
                          name="dateOfBirthAd"
                          value={form.dateOfBirthAd}
                          onChange={handleDobAdChange}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Date of Admission (भर्ना मिति B.S.)
                        </label>
                        <input
                          type="text"
                          name="admissionDateBs"
                          value={form.admissionDateBs}
                          onChange={(e) => setForm(prev => ({ ...prev, admissionDateBs: formatDateInput(e.target.value) }))}
                          placeholder="2083-01-10"
                          maxLength={10}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Blood Group (रक्त समूह)
                        </label>
                        <select
                          name="bloodGroup"
                          value={form.bloodGroup}
                          onChange={handleInputChange}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="Unknown">Unknown (अज्ञात / थाहा नभएको)</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Mother Tongue (मातृभाषा)
                        </label>
                        <input
                          type="text"
                          name="motherTongue"
                          value={form.motherTongue}
                          onChange={handleInputChange}
                          placeholder="e.g. Nepali / Maithili / Bhojpuri"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      {/* Class Admission Fee Setup Preview */}
                      <div className="lg:col-span-3 bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-xs text-amber-950">
                            <Receipt size={15} className="text-amber-600" />
                            <span>Admission Fee for {form.desiredClass} (भर्ना शुल्क):</span>
                          </div>
                          <p className="text-[11px] text-amber-800 mt-0.5">
                            Class Standard: <b>रू {classFeeRates[form.desiredClass] || 2000}</b> (Choose Free if student is on scholarship/campaign waiver)
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, admissionChargeType: 'CHARGEABLE' }))}
                            className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${form.admissionChargeType === 'CHARGEABLE' ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs' : 'bg-white text-slate-700 border-slate-300'}`}
                          >
                            <span>Chargeable (सशुल्क रू {classFeeRates[form.desiredClass] || 2000})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, admissionChargeType: 'FREE' }))}
                            className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${form.admissionChargeType === 'FREE' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white text-slate-700 border-slate-300'}`}
                          >
                            <span>Free / Waived (निःशुल्क भर्ना)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Parent / Guardian Information */}
                  <div>
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-[#1e3a5f] font-black text-sm uppercase tracking-wide">
                      <Phone size={18} className="text-amber-500" />
                      <span>2. Parent & Guardian Information (अभिभावक विवरण)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Father's Full Name
                        </label>
                        <input
                          type="text"
                          name="fatherName"
                          value={form.fatherName}
                          onChange={handleInputChange}
                          placeholder="Father Name"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Father's Phone Number
                        </label>
                        <input
                          type="tel"
                          name="fatherPhone"
                          value={form.fatherPhone}
                          onChange={handleInputChange}
                          placeholder="e.g. 9845XXXXXX"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Father's Occupation
                        </label>
                        <input
                          type="text"
                          name="fatherOccupation"
                          value={form.fatherOccupation}
                          onChange={handleInputChange}
                          placeholder="e.g. Business / Service / Agriculture"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Mother's Full Name
                        </label>
                        <input
                          type="text"
                          name="motherName"
                          value={form.motherName}
                          onChange={handleInputChange}
                          placeholder="Mother Name"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Mother's Phone Number
                        </label>
                        <input
                          type="tel"
                          name="motherPhone"
                          value={form.motherPhone}
                          onChange={handleInputChange}
                          placeholder="Mother Phone"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Primary Guardian Phone (SMS Alert Number) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          name="guardianContact"
                          value={form.guardianContact}
                          onChange={handleInputChange}
                          placeholder="Primary contact for ERP SMS"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-blue-400 bg-blue-50/30 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Guardian Relation
                        </label>
                        <select
                          name="guardianRelation"
                          value={form.guardianRelation}
                          onChange={handleInputChange}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="Father">Father (बुबा)</option>
                          <option value="Mother">Mother (आमा)</option>
                          <option value="Uncle">Uncle</option>
                          <option value="Grandparent">Grandparent</option>
                          <option value="Other">Other Guardian</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Guardian Email (Optional)
                        </label>
                        <input
                          type="email"
                          name="guardianEmail"
                          value={form.guardianEmail}
                          onChange={handleInputChange}
                          placeholder="name@example.com"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Address & Transportation */}
                  <div>
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-[#1e3a5f] font-black text-sm uppercase tracking-wide">
                      <MapPin size={18} className="text-amber-500" />
                      <span>3. Address & Van Transportation (ठेगाना तथा यातायात)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Permanent Address (स्थायी ठेगाना)
                        </label>
                        <input
                          type="text"
                          name="permanentAddress"
                          value={form.permanentAddress}
                          onChange={handleInputChange}
                          placeholder="Municipality-Ward, District"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Temporary / Current Address (हालको बसोबास)
                        </label>
                        <input
                          type="text"
                          name="temporaryAddress"
                          value={form.temporaryAddress}
                          onChange={handleInputChange}
                          placeholder="Current Residence"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2 bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="needTransport"
                            name="needTransport"
                            checked={form.needTransport}
                            onChange={handleInputChange}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                          />
                          <label htmlFor="needTransport" className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                            <Bus size={15} className="text-amber-600" />
                            <span>Require School Van / Transportation Service? (विद्यालय गाडी सुविधा आवश्यक छ?)</span>
                          </label>
                        </div>

                        {form.needTransport && (
                          <div className="mt-3 pl-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Pickup / Drop Route & Station (स्टेशन):
                              </label>
                              <select
                                name="transportStop"
                                value={form.transportStop}
                                onChange={(e) => {
                                  const opt = transportStopOptions.find(o => o.name === e.target.value);
                                  setForm(prev => ({ ...prev, transportStop: e.target.value, transportFee: opt?.fee || 1000 }));
                                }}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                              >
                                {transportStopOptions.map((opt) => (
                                  <option key={opt.name} value={opt.name}>
                                    {opt.name} — रू {opt.fee}/महिना
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">
                                Estimated Transportation Fee (मासिक गाडी शुल्क):
                              </label>
                              <div className="px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50 text-xs font-mono font-bold text-amber-900">
                                रू {form.transportFee} / Month
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Previous Education & Health Notes */}
                  <div>
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-[#1e3a5f] font-black text-sm uppercase tracking-wide">
                      <Award size={18} className="text-amber-500" />
                      <span>4. Academic Background & Health (शैक्षिक पृष्ठभूमी)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Previous School Attended (अघिल्लो विद्यालय)
                        </label>
                        <input
                          type="text"
                          name="previousSchool"
                          value={form.previousSchool}
                          onChange={handleInputChange}
                          placeholder="School name if transferred"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Last Class Passed / GPA
                        </label>
                        <input
                          type="text"
                          name="previousClass"
                          value={form.previousClass}
                          onChange={handleInputChange}
                          placeholder="e.g. LKG / Grade A"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Special Health / Medical Notes (कुनै विशेष स्वास्थ्य समस्या वा एलर्जी भए उल्लेख गर्नुहोस्)
                        </label>
                        <textarea
                          rows={2}
                          name="medicalNotes"
                          value={form.medicalNotes}
                          onChange={handleInputChange}
                          placeholder="Allergies, chronic conditions, or special care instructions..."
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Declaration & Submit Button */}
                  <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-[11px] text-slate-500">
                      By submitting this form, I certify that the details provided are true and correct to the best of my knowledge.
                    </p>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                          <span>Submitting Application...</span>
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          <span>Submit Application (फारम पेश गर्नुहोस्)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ── TAB 2: TRACK APPLICATION STATUS ─────────────────────────────────── */}
        {activeTab === 'track' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Search Box */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-[#1e3a5f]">
                  Track Your Admission Application
                </h3>
                <p className="text-xs text-slate-500">
                  Enter your Application Number (e.g. <span className="font-mono font-bold">BPS-ADM-2083-0001</span>) or Registered Primary Phone Number.
                </p>
              </div>

              <form onSubmit={handleTrackSubmit} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={trackQuery}
                  onChange={(e) => setTrackQuery(e.target.value)}
                  placeholder="Application No (BPS-ADM-...) or Phone Number"
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={isTracking}
                  className="px-6 py-3 rounded-xl bg-[#1e3a5f] hover:bg-[#284d7a] text-white font-black text-xs transition flex items-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  {isTracking ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search size={16} />
                  )}
                  <span>Track Status</span>
                </button>
              </form>

              {trackError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{trackError}</span>
                </div>
              )}
            </div>

            {/* Tracking Result Card */}
            {trackedApplication && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Application Number</span>
                    <h4 className="text-lg font-black text-[#1e3a5f] font-mono">
                      {trackedApplication.applicationNo}
                    </h4>
                  </div>
                  <div>
                    {trackedApplication.status === 'PENDING' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        <Clock size={13} />
                        <span>Under Review (प्रक्रियामा)</span>
                      </span>
                    )}
                    {trackedApplication.status === 'APPROVED' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                        <CheckCircle2 size={13} />
                        <span>Approved (स्वीकृत)</span>
                      </span>
                    )}
                    {trackedApplication.status === 'ADMITTED' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">
                        <Award size={13} />
                        <span>Enrolled / Admitted (भर्ना सम्पन्न)</span>
                      </span>
                    )}
                    {trackedApplication.status === 'REJECTED' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
                        <XCircle size={13} />
                        <span>Not Approved (अस्वीकृत)</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Applicant Name:</span>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">{trackedApplication.studentName}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Applied Grade:</span>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">{trackedApplication.desiredClass}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Contact Number:</span>
                    <p className="font-bold text-slate-800 mt-0.5">{trackedApplication.guardianContact}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Applied Date:</span>
                    <p className="font-bold text-slate-800 mt-0.5">{trackedApplication.appliedDateBs || '2083 BS'}</p>
                  </div>
                  {trackedApplication.needTransport && (
                    <div className="col-span-2">
                      <span className="text-slate-400">Transportation Stop:</span>
                      <p className="font-bold text-slate-800 mt-0.5">{trackedApplication.transportStop || 'Brindaban area'}</p>
                    </div>
                  )}
                  {trackedApplication.adminRemarks && (
                    <div className="col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-slate-500 font-bold">School Administration Remarks:</span>
                      <p className="text-slate-700 mt-1">{trackedApplication.adminRemarks}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-200">
                  <button
                    onClick={() => printSlip(trackedApplication)}
                    className="px-5 py-2.5 rounded-xl bg-[#1e3a5f] hover:bg-[#284d7a] text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer"
                  >
                    <Printer size={15} />
                    <span>Print Application Slip</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
