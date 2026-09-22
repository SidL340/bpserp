'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS, formatDateInput } from '@/lib/nepali-date';
import {
  UserPlus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Award,
  Eye,
  Check,
  X,
  Printer,
  Bus,
  ExternalLink,
  GraduationCap,
  Users,
  Building,
  RefreshCw,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

interface Application {
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
  fatherOccupation?: string;
  motherName?: string;
  motherPhone?: string;
  motherOccupation?: string;
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
  enrolledStudentId?: number;
  appliedDateBs?: string;
  createdAt: string;
}

export default function AdminAdmissionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [admitModalApp, setAdmitModalApp] = useState<Application | null>(null);
  const [admitRollNo, setAdmitRollNo] = useState('1');
  const [admitSection, setAdmitSection] = useState('A');
  const [admitChargeType, setAdmitChargeType] = useState<'CHARGEABLE' | 'FREE'>('CHARGEABLE');
  const [admitFeeAmount, setAdmitFeeAmount] = useState('2000');
  const [admitTransportFee, setAdmitTransportFee] = useState('0');
  const [admitDateBs, setAdmitDateBs] = useState(todayBS());
  const [statusRemark, setStatusRemark] = useState('');

  // Fetch applications list with stats
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-admissions', search, statusFilter, classFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (classFilter !== 'ALL') params.append('desiredClass', classFilter);
      params.append('limit', '100');

      const res = await api.get(`/admissions?${params.toString()}`);
      return res.data;
    },
  });

  const applications: Application[] = data?.data || [];
  const stats = data?.stats || { total: 0, pending: 0, approved: 0, admitted: 0 };

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, remarks }: { id: number; status: string; remarks?: string }) => {
      const res = await api.put(`/admissions/${id}/status`, {
        status,
        adminRemarks: remarks,
      });
      return res.data;
    },
    onSuccess: (res) => {
      toast.success(res.message || 'Status updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-admissions'] });
      setSelectedApp(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update status.');
    },
  });

  // Admit / Enroll mutation
  const admitMutation = useMutation({
    mutationFn: async ({
      id,
      rollNo,
      section,
      admissionChargeType,
      admissionFeeAmount,
      transportFeeAmount,
      admissionDateBs,
    }: {
      id: number;
      rollNo: string;
      section: string;
      admissionChargeType: 'CHARGEABLE' | 'FREE';
      admissionFeeAmount: number;
      transportFeeAmount: number;
      admissionDateBs: string;
    }) => {
      const res = await api.post(`/admissions/${id}/admit`, {
        rollNo,
        section,
        admissionChargeType,
        admissionFeeAmount,
        transportFeeAmount,
        admissionDateBs,
      });
      return res.data;
    },
    onSuccess: (res) => {
      toast.success(
        `🎉 Student Enrolled Successfully! Student ID: ${res.data?.student?.studentId}. Login credentials generated.`,
        { duration: 6000 }
      );
      queryClient.invalidateQueries({ queryKey: ['admin-admissions'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setAdmitModalApp(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to enroll student.');
    },
  });

  const handleStatusChange = (id: number, status: 'APPROVED' | 'REJECTED') => {
    updateStatusMutation.mutate({ id, status, remarks: statusRemark });
  };

  const handleEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!admitModalApp) return;
    admitMutation.mutate({
      id: admitModalApp.id,
      rollNo: admitRollNo,
      section: admitSection,
      admissionChargeType: admitChargeType,
      admissionFeeAmount: parseFloat(admitFeeAmount) || 0,
      transportFeeAmount: parseFloat(admitTransportFee) || 0,
      admissionDateBs: admitDateBs || todayBS(),
    });
  };

  const printAdmissionSlip = (app: Application) => {
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
              <div class="slip-badge">STUDENT ADMISSION APPLICATION RECORD</div>
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
    <div className="space-y-6 pb-12">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 text-[#1e3a5f]">
              <UserPlus size={22} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-[#1e3a5f]">
                Online Admission Management (अनलाइन भर्ना व्यवस्थापन)
              </h1>
              <p className="text-xs text-gray-500 font-nepali">
                नयाँ विद्यार्थी आवेदन समीक्षा, स्वीकृति र सिधै छात्र/छात्रा भर्ना दर्ता
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition"
            title="Refresh list"
          >
            <RefreshCw size={15} />
          </button>
          <Link
            href="/admission"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-sm transition"
          >
            <ExternalLink size={14} />
            <span>Open Public Portal (सार्वजनिक पोर्टल)</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-400 uppercase">Total Applications</span>
          <p className="text-2xl font-black text-[#1e3a5f] mt-1">{stats.total}</p>
          <span className="text-[10px] text-gray-400">All submissions</span>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-700 uppercase">Pending Review</span>
          <p className="text-2xl font-black text-amber-600 mt-1">{stats.pending}</p>
          <span className="text-[10px] text-amber-600 font-medium">Awaiting evaluation</span>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase">Approved</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{stats.approved}</p>
          <span className="text-[10px] text-emerald-600 font-medium">Ready for enrollment</span>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-blue-700 uppercase">Enrolled Students</span>
          <p className="text-2xl font-black text-blue-600 mt-1">{stats.admitted}</p>
          <span className="text-[10px] text-blue-600 font-medium">Admitted to classes</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, application no, father or guardian contact..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 outline-none bg-white"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending (प्रक्रियामा)</option>
              <option value="APPROVED">Approved (स्वीकृत)</option>
              <option value="ADMITTED">Admitted (भर्ना भएको)</option>
              <option value="REJECTED">Rejected (अस्वीकृत)</option>
            </select>

            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 outline-none bg-white"
            >
              <option value="ALL">All Grades / Wings</option>
              <option value="Play Group">Play Group</option>
              <option value="Nursery">Nursery</option>
              <option value="LKG">LKG</option>
              <option value="UKG">UKG / KG</option>
              <option value="Class 1">Class 1</option>
              <option value="Class 2">Class 2</option>
              <option value="Class 3">Class 3</option>
              <option value="Class 4">Class 4</option>
              <option value="Class 5">Class 5</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs text-gray-700">
          <thead className="bg-[#1e3a5f] text-white">
            <tr>
              <th className="p-3.5 font-bold uppercase">Application No</th>
              <th className="p-3.5 font-bold uppercase">Student Name</th>
              <th className="p-3.5 font-bold uppercase">Applied Class</th>
              <th className="p-3.5 font-bold uppercase">Guardian Contact</th>
              <th className="p-3.5 font-bold uppercase">Van / Transport</th>
              <th className="p-3.5 font-bold uppercase">Date (B.S.)</th>
              <th className="p-3.5 font-bold uppercase">Status</th>
              <th className="p-3.5 font-bold uppercase text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-400">
                  Loading applications...
                </td>
              </tr>
            ) : applications.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-400">
                  No admission applications found.
                </td>
              </tr>
            ) : (
              applications.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50 transition">
                  <td className="p-3.5 font-mono font-bold text-[#1e3a5f]">
                    {app.applicationNo}
                  </td>
                  <td className="p-3.5">
                    <div className="font-bold text-gray-900">{app.studentName}</div>
                    {app.studentNameNepali && (
                      <div className="text-[10px] text-gray-400 font-nepali">{app.studentNameNepali}</div>
                    )}
                  </td>
                  <td className="p-3.5">
                    <span className="bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded text-[11px] font-bold">
                      {app.desiredClass}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="font-bold text-gray-800">{app.guardianContact}</div>
                    <div className="text-[10px] text-gray-400">
                      {app.guardianName || app.fatherName} ({app.guardianRelation || 'Parent'})
                    </div>
                  </td>
                  <td className="p-3.5">
                    {app.needTransport ? (
                      <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">
                        <Bus size={11} />
                        <span>{app.transportStop || 'Required'}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400 text-[11px]">No</span>
                    )}
                  </td>
                  <td className="p-3.5 font-mono text-gray-600">
                    {app.appliedDateBs || app.createdAt.slice(0, 10)}
                  </td>
                  <td className="p-3.5">
                    {app.status === 'PENDING' && (
                      <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                        PENDING
                      </span>
                    )}
                    {app.status === 'APPROVED' && (
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        APPROVED
                      </span>
                    )}
                    {app.status === 'ADMITTED' && (
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                        ADMITTED
                      </span>
                    )}
                    {app.status === 'REJECTED' && (
                      <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                        REJECTED
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-700 transition"
                        title="View Details"
                      >
                        <Eye size={15} />
                      </button>

                      <button
                        onClick={() => printAdmissionSlip(app)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-700 transition"
                        title="Print Slip"
                      >
                        <Printer size={15} />
                      </button>

                      {app.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(app.id, 'APPROVED')}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition"
                            title="Approve Application"
                          >
                            <Check size={15} />
                          </button>
                          <button
                            onClick={() => handleStatusChange(app.id, 'REJECTED')}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                            title="Reject Application"
                          >
                            <X size={15} />
                          </button>
                        </>
                      )}

                      {app.status !== 'ADMITTED' && (
                        <button
                          onClick={() => {
                            setAdmitModalApp(app);
                            setAdmitRollNo('1');
                            setAdmitSection('A');
                            setAdmitChargeType('CHARGEABLE');
                            const cls = (app.desiredClass || '').toLowerCase();
                            const fee = cls.includes('nursery') || cls.includes('kg') || cls.includes('play') ? '1500' : '2000';
                            setAdmitFeeAmount(fee);
                            setAdmitTransportFee(app.needTransport ? '1000' : '0');
                            setAdmitDateBs(todayBS());
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#1e3a5f] hover:bg-[#284d7a] text-white font-bold text-[11px] transition shadow-xs flex items-center gap-1"
                          title="Enroll Student"
                        >
                          <GraduationCap size={13} />
                          <span>Admit</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── DETAIL MODAL ──────────────────────────────────────────────────────── */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-400">Application Review</span>
                <h3 className="text-lg font-black text-[#1e3a5f]">{selectedApp.studentName}</h3>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Application No</span>
                <span className="font-mono font-bold text-slate-800 text-sm">{selectedApp.applicationNo}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Applying Grade</span>
                <span className="font-bold text-[#1e3a5f] text-sm">{selectedApp.desiredClass}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Gender & DOB</span>
                <span className="font-bold text-slate-800">{selectedApp.gender} · {selectedApp.dateOfBirthBs || '—'} BS</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Blood Group & Tongue</span>
                <span className="font-bold text-slate-800">{selectedApp.bloodGroup || '—'} · {selectedApp.motherTongue || 'Nepali'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Father Details</span>
                <span className="font-bold text-slate-800">{selectedApp.fatherName || '—'} ({selectedApp.fatherPhone || '—'})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Mother Details</span>
                <span className="font-bold text-slate-800">{selectedApp.motherName || '—'} ({selectedApp.motherPhone || '—'})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Primary Guardian Contact</span>
                <span className="font-bold text-slate-800">{selectedApp.guardianContact} ({selectedApp.guardianRelation || 'Parent'})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">School Van Transportation</span>
                <span className="font-bold text-slate-800">
                  {selectedApp.needTransport ? `Yes (${selectedApp.transportStop || 'Required'})` : 'No'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Address</span>
                <span className="font-medium text-slate-800">{selectedApp.permanentAddress || 'Brindaban Municipality-02, Rautahat'}</span>
              </div>
              {selectedApp.previousSchool && (
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Previous Education</span>
                  <span className="font-medium text-slate-800">{selectedApp.previousSchool} (Passed: {selectedApp.previousClass || 'N/A'})</span>
                </div>
              )}
              {selectedApp.medicalNotes && (
                <div className="col-span-2 bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-900">
                  <span className="text-[10px] uppercase font-bold text-amber-700 block">Medical Notes</span>
                  <span>{selectedApp.medicalNotes}</span>
                </div>
              )}
            </div>

            {/* Remarks Input & Actions */}
            <div className="pt-2 border-t border-gray-100 space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Administration Remarks / Notes:
                </label>
                <input
                  type="text"
                  value={statusRemark}
                  onChange={(e) => setStatusRemark(e.target.value)}
                  placeholder="e.g. Documents verified, eligible for discount, interview conducted..."
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedApp.id, 'REJECTED')}
                  className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100"
                >
                  Reject Application
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedApp.id, 'APPROVED')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                >
                  Approve Application
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ONE-CLICK ENROLL STUDENT MODAL ────────────────────────────────────── */}
      {admitModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-600">Student Enrollment</span>
                <h3 className="text-lg font-black text-[#1e3a5f]">Direct Student Admission</h3>
              </div>
              <button
                onClick={() => setAdmitModalApp(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEnrollSubmit} className="space-y-4">
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-200/60 space-y-1.5 text-xs">
                <div>
                  <span className="text-gray-500">Student:</span>{' '}
                  <b className="text-gray-900">{admitModalApp.studentName}</b>
                </div>
                <div>
                  <span className="text-gray-500">Class:</span>{' '}
                  <b className="text-[#1e3a5f]">{admitModalApp.desiredClass}</b>
                </div>
                <div>
                  <span className="text-gray-500">Guardian Contact:</span>{' '}
                  <b className="text-gray-900">{admitModalApp.guardianContact}</b>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Admission Date (BS):
                  </label>
                  <input
                    type="text"
                    required
                    value={admitDateBs}
                    onChange={(e) => setAdmitDateBs(formatDateInput(e.target.value))}
                    placeholder="YYYY-MM-DD"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Section:
                  </label>
                  <select
                    value={admitSection}
                    onChange={(e) => setAdmitSection(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold outline-none bg-white"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Assign Roll Number:
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={admitRollNo}
                  onChange={(e) => setAdmitRollNo(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold outline-none"
                />
              </div>

              {/* Admission Charge Type */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="text-xs font-bold text-gray-800 flex items-center justify-between">
                  <span>Admission Charge (भर्ना शुल्क):</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-800">
                      <input
                        type="radio"
                        name="chargeType"
                        checked={admitChargeType === 'CHARGEABLE'}
                        onChange={() => setAdmitChargeType('CHARGEABLE')}
                      />
                      Chargeable (सशुल्क)
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-blue-800">
                      <input
                        type="radio"
                        name="chargeType"
                        checked={admitChargeType === 'FREE'}
                        onChange={() => setAdmitChargeType('FREE')}
                      />
                      Free (निःशुल्क)
                    </label>
                  </div>
                </div>

                {admitChargeType === 'CHARGEABLE' ? (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-gray-500 font-semibold">Amount (रु.):</span>
                    <input
                      type="number"
                      min="0"
                      value={admitFeeAmount}
                      onChange={(e) => setAdmitFeeAmount(e.target.value)}
                      className="w-32 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-slate-800 bg-white"
                    />
                    <span className="text-[10px] text-gray-400">Class rate auto-filled</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-blue-700 font-semibold pt-1">
                    ✨ भर्ना निःशुल्क (Free Admission) — No admission fee due will be created.
                  </p>
                )}
              </div>

              {/* Transportation Option */}
              {admitModalApp.needTransport && (
                <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                    <span className="flex items-center gap-1.5">
                      <Bus size={14} className="text-amber-600" />
                      School Bus Stop: <u>{admitModalApp.transportStop || 'Assigned Stop'}</u>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Monthly Transport Fee (रु.):</span>
                    <input
                      type="number"
                      min="0"
                      value={admitTransportFee}
                      onChange={(e) => setAdmitTransportFee(e.target.value)}
                      className="w-32 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold bg-white"
                    />
                    <span className="text-[10px] text-gray-400">Monthly bus due</span>
                  </div>
                </div>
              )}

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900">
                ✅ <b>Automatic Enrollment:</b> Generates Student ID, login credentials, enrolls in {admitModalApp.desiredClass}, and assigns Roll No.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdmitModalApp(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={admitMutation.isPending}
                  className="px-6 py-2.5 rounded-xl bg-[#1e3a5f] hover:bg-[#284d7a] text-white text-xs font-black shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {admitMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <GraduationCap size={15} />
                  )}
                  <span>Confirm Enrollment (भर्ना सम्पन्न)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
