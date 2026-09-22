'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS, bsToAD, formatDateInput } from '@/lib/nepali-date';
import {
  Users,
  Plus,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Eye,
  Trash2,
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  Building,
  KeyRound,
  Sparkles,
  Bus,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/auth-store';

export default function StudentsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [page, setPage] = useState(1);

  // Modals & New Student Form States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [dobBs, setDobBs] = useState('');
  const [dobAd, setDobAd] = useState('');
  const [manualAdEdited, setManualAdEdited] = useState(false);
  const [admissionDateBs, setAdmissionDateBs] = useState(todayBS());
  const [bloodGroup, setBloodGroup] = useState('Unknown');
  const [admissionChargeType, setAdmissionChargeType] = useState<'CHARGEABLE' | 'FREE'>('CHARGEABLE');
  const [admissionFeeAmount, setAdmissionFeeAmount] = useState('2000');
  const [needTransport, setNeedTransport] = useState(false);
  const [transportStop, setTransportStop] = useState('');
  const [transportFeeAmount, setTransportFeeAmount] = useState('1000');

  // Scholarship & Concession States
  const [scholarshipType, setScholarshipType] = useState<'NONE' | 'FULL' | 'PARTIAL'>('NONE');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [customMonthlyFee, setCustomMonthlyFee] = useState('');
  const [discountRemarks, setDiscountRemarks] = useState('');

  // Quick Edit Scholarship Modal State
  const [scholarshipModalStudent, setScholarshipModalStudent] = useState<any>(null);
  const [editSchType, setEditSchType] = useState<'NONE' | 'FULL' | 'PARTIAL'>('NONE');
  const [editDiscountPercent, setEditDiscountPercent] = useState('0');
  const [editCustomMonthlyFee, setEditCustomMonthlyFee] = useState('');
  const [editDiscountRemarks, setEditDiscountRemarks] = useState('');

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importClassId, setImportClassId] = useState('');

  const resetAddForm = () => {
    setDobBs('');
    setDobAd('');
    setManualAdEdited(false);
    setAdmissionDateBs(todayBS());
    setBloodGroup('Unknown');
    setAdmissionChargeType('CHARGEABLE');
    setAdmissionFeeAmount('2000');
    setNeedTransport(false);
    setTransportStop('');
    setTransportFeeAmount('1000');
    setScholarshipType('NONE');
    setDiscountPercent('0');
    setCustomMonthlyFee('');
    setDiscountRemarks('');
  };

  const handleDobBsChange = (val: string) => {
    const formatted = formatDateInput(val);
    setDobBs(formatted);
    if (!manualAdEdited) {
      const converted = bsToAD(formatted);
      if (converted) setDobAd(converted);
    }
  };

  // Fetch classes for dropdown filter
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  // Fetch students (All at once)
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['students', search, selectedClass],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedClass) params.append('classId', selectedClass);
      params.append('limit', 'all');
      const res = await api.get(`/students?${params.toString()}`);
      return res.data;
    },
  });

  // Add single student mutation
  const addStudentMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await api.post('/students', formData);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Student created! Login ID: ${data.credentials?.username}`);
      setIsAddModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create student');
    },
  });

  // Bulk import mutation
  const bulkImportMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await api.post('/students/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: (data) => {
      const { created, skipped, errors } = data.results || {};
      toast.success(`Import complete! Added: ${created}, Skipped: ${skipped}`);
      if (errors?.length > 0) {
        toast.error(`${errors.length} rows had issues`);
      }
      setIsImportModalOpen(false);
      setImportFile(null);
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to import Excel');
    },
  });

  const handleBulkImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      toast.error('Please select an Excel file (.xlsx)');
      return;
    }
    const formData = new FormData();
    formData.append('file', importFile);
    if (importClassId) formData.append('classId', importClassId);
    bulkImportMutation.mutate(formData);
  };

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: any = {};
    fd.forEach((value, key) => {
      if (value) data[key] = value;
    });
    data.dateOfBirthBs = dobBs || null;
    data.dateOfBirthAd = dobAd || null;
    data.admissionDateBs = admissionDateBs || todayBS();
    data.bloodGroup = bloodGroup || 'Unknown';
    data.admissionChargeType = admissionChargeType;
    data.admissionFeeAmount = parseFloat(admissionFeeAmount) || 0;
    if (needTransport) {
      data.transportFeeAmount = parseFloat(transportFeeAmount) || 0;
      data.transportStop = transportStop || null;
    }
    data.scholarshipType = scholarshipType;
    data.discountPercent = scholarshipType === 'PARTIAL' ? (parseFloat(discountPercent) || 0) : 0;
    data.customMonthlyFee = scholarshipType === 'PARTIAL' && customMonthlyFee ? (parseFloat(customMonthlyFee) || null) : null;
    data.discountRemarks = discountRemarks || null;
    addStudentMutation.mutate(data);
  };

  // Update Scholarship Mutation
  const updateScholarshipMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.put(`/students/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Scholarship & Fee concession details updated successfully!');
      setScholarshipModalStudent(null);
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update scholarship');
    },
  });

  // Auto-Assign Roll Numbers Mutation
  const autoRollMutation = useMutation({
    mutationFn: async () => {
      const endpoint = selectedClass
        ? `/classes/${selectedClass}/auto-roll-numbers`
        : '/classes/auto-roll-numbers/all';
      const res = await api.post(endpoint);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Roll numbers assigned in alphabetical order!');
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to assign roll numbers');
    },
  });

  const students = studentsData?.data || [];
  const total = studentsData?.total || 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f]">
            Students Directory (विद्यार्थी विवरण)
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            विद्यार्थीहरूको व्यक्तिगत तथा शैक्षिक विवरण व्यवस्थापन, IEMIS आयात र वर्णानुक्रम अनुसार रोल नं.
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Auto Roll No */}
            <button
              onClick={() => {
                if (confirm('Assign roll numbers in alphabetical order (A to Z) for all students?')) {
                  autoRollMutation.mutate();
                }
              }}
              disabled={autoRollMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
              title="Automatically assign sequential roll numbers (1, 2, 3...) alphabetically by student name"
            >
              <Sparkles size={14} className="text-indigo-600" />
              <span>{autoRollMutation.isPending ? 'Sorting...' : 'Auto Roll No (वर्णानुक्रम)'}</span>
            </button>

            {/* Export credentials */}
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/students/credentials/export${selectedClass ? `?classId=${selectedClass}` : ''}`}
              download
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-2xs"
              title="Download IDs and login credentials for students"
            >
              <Download size={14} className="text-blue-600" />
              <span>Export Passwords</span>
            </a>

            {/* EMIS Bulk Import */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-2xs"
            >
              <FileSpreadsheet size={14} />
              <span>IEMIS Excel Import</span>
            </button>

            {/* Add Student */}
            <button
              onClick={() => {
                resetAddForm();
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#2a5280] transition shadow-2xs"
            >
              <Plus size={14} />
              <span>Add Student</span>
            </button>
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by student name, IEMIS ID, parent name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-gray-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs focus:border-[#1e3a5f] focus:bg-white focus:outline-hidden transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={15} className="text-gray-400 shrink-0" />
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-48 rounded-xl border border-gray-200 bg-slate-50/50 px-3 py-2 text-xs focus:border-[#1e3a5f] focus:bg-white focus:outline-hidden transition"
          >
            <option value="">All Classes (सबै कक्षा)</option>
            {classesData?.map((cls: any) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} {cls.section ? `(${cls.section})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-[#1e3a5f] text-white">
              <tr>
                <th className="px-3 py-3.5 font-bold uppercase tracking-wider text-center w-16">Roll No</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider">Student Details</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider">IEMIS / ID</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider">Class & Section</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider">Parents & Guardian</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
                    <p className="mt-2 text-xs">Loading students...</p>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Users size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm font-semibold text-gray-600">No students found</p>
                    <p className="text-xs text-gray-400">Import an EMIS Excel or add students manually.</p>
                  </td>
                </tr>
              ) : (
                students.map((student: any) => {
                  const enrollment = student.classEnrollment?.[0];
                  return (
                    <tr key={student.id} className="hover:bg-blue-50/40 transition">
                      {/* Roll No */}
                      <td className="px-3 py-3.5 text-center">
                        {enrollment?.rollNo ? (
                          <span className="inline-flex min-w-[26px] h-6 px-1.5 items-center justify-center rounded-lg bg-indigo-50 font-bold text-[11px] text-indigo-700 border border-indigo-100 shadow-2xs">
                            {enrollment.rollNo}
                          </span>
                        ) : (
                          <span className="text-gray-300 font-mono text-xs">—</span>
                        )}
                      </td>

                      {/* Name & Photo */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-800 font-bold text-xs">
                            {student.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{student.fullName}</p>
                            {student.fullNameNepali && (
                              <p className="text-[10px] text-gray-500 font-nepali">{student.fullNameNepali}</p>
                            )}
                            <span className="text-[10px] text-gray-400">
                              DOB: {student.dateOfBirthBs || 'N/A'} ({student.gender || 'N/A'})
                            </span>
                            {student.scholarshipType === 'FULL' && (
                              <div className="mt-1">
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setScholarshipModalStudent(student);
                                    setEditSchType('FULL');
                                    setEditDiscountPercent('0');
                                    setEditCustomMonthlyFee('');
                                    setEditDiscountRemarks(student.discountRemarks || '');
                                  }}
                                  className="cursor-pointer inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-700 px-1.5 py-0.5 text-[10px] font-extrabold border border-emerald-200 hover:bg-emerald-100 transition"
                                  title="Full Scholarship - Click to edit"
                                >
                                  🎓 Full Scholarship (१००% छात्रवृत्ति)
                                </span>
                              </div>
                            )}
                            {student.scholarshipType === 'PARTIAL' && (
                              <div className="mt-1">
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setScholarshipModalStudent(student);
                                    setEditSchType('PARTIAL');
                                    setEditDiscountPercent(String(student.discountPercent || '0'));
                                    setEditCustomMonthlyFee(String(student.customMonthlyFee || ''));
                                    setEditDiscountRemarks(student.discountRemarks || '');
                                  }}
                                  className="cursor-pointer inline-flex items-center gap-1 rounded-md bg-amber-50 text-amber-800 px-1.5 py-0.5 text-[10px] font-extrabold border border-amber-200 hover:bg-amber-100 transition"
                                  title="Fee Concession - Click to edit"
                                >
                                  🏷️ {student.discountPercent ? `${student.discountPercent}% Concession` : student.customMonthlyFee ? `Custom: रू ${student.customMonthlyFee}` : 'Discounted'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* IEMIS ID */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800">
                          {student.studentId}
                        </span>
                      </td>

                      {/* Class */}
                      <td className="px-4 py-3.5">
                        {enrollment?.class ? (
                          <div>
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                              {enrollment.class.name} {enrollment.class.section ? `- ${enrollment.class.section}` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400">Not Assigned</span>
                        )}
                      </td>

                      {/* Parents */}
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-gray-800">{student.fatherName || student.guardianName || '—'}</p>
                        <p className="text-[10px] text-gray-400">Mother: {student.motherName || '—'}</p>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3.5">
                        <p className="font-mono text-gray-700">{student.guardianContact || student.phone || '—'}</p>
                        <p className="text-[10px] text-gray-400 truncate max-w-[140px]">{student.address || '—'}</p>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setScholarshipModalStudent(student);
                              setEditSchType(student.scholarshipType || 'NONE');
                              setEditDiscountPercent(String(student.discountPercent || '0'));
                              setEditCustomMonthlyFee(String(student.customMonthlyFee || ''));
                              setEditDiscountRemarks(student.discountRemarks || '');
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 hover:bg-indigo-600 hover:text-white px-2 py-1 text-[11px] font-bold text-indigo-700 transition"
                            title="Manage Scholarship / Fee Concession"
                          >
                            <span>छात्रवृत्ति</span>
                          </button>
                          <Link
                            href={`/dashboard/finance/fees?studentId=${student.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 transition"
                          >
                            <span>Collect Fee (शुल्क)</span>
                          </Link>
                          <Link
                            href={`/dashboard/students/${student.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-[#1e3a5f] hover:text-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition"
                          >
                            <Eye size={12} />
                            <span>View</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info — All students loaded */}
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 bg-slate-50/50 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Showing all <strong className="font-bold text-gray-900">{students.length}</strong> students {selectedClass ? `in selected class` : `across the school`}
            </span>
          </div>
          <span className="text-[11px] text-gray-400 font-medium">Single Continuous View (एकै सूचीमा सबै)</span>
        </div>
      </div>

      {/* ─── MODAL 1: ADD STUDENT (Manual) ─────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-[#1e3a5f]">Add New Student (विद्यार्थी भर्ना फारम)</h2>
                <p className="text-[11px] text-gray-500">A user login ID & password will be auto-generated.</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Full Name (English) *</label>
                  <input required name="fullName" type="text" placeholder="e.g. Ramesh Thapa" className="erp-input" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Full Name (नेपाली)</label>
                  <input name="fullNameNepali" type="text" placeholder="उदा. रमेश थापा" className="erp-input font-nepali" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Student / IEMIS ID</label>
                  <input name="emisId" type="text" placeholder="Auto if empty (e.g. 320160001)" className="erp-input" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Gender *</label>
                  <select name="gender" required className="erp-input">
                    <option value="Male">Male (पुरुष)</option>
                    <option value="Female">Female (महिला)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Blood Group (रक्त समूह)</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="erp-input"
                  >
                    <option value="Unknown">Unknown (अज्ञात / थाहा नभएको)</option>
                    <option value="A+">A+ (Positive)</option>
                    <option value="A-">A- (Negative)</option>
                    <option value="B+">B+ (Positive)</option>
                    <option value="B-">B- (Negative)</option>
                    <option value="AB+">AB+ (Positive)</option>
                    <option value="AB-">AB- (Negative)</option>
                    <option value="O+">O+ (Positive)</option>
                    <option value="O-">O- (Negative)</option>
                  </select>
                </div>
              </div>

              {/* DOB BS & AD */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-gray-800">
                      जन्म मिति (DOB in BS) *
                    </label>
                    <span className="text-[10px] text-gray-400 font-mono">YYYY-MM-DD</span>
                  </div>
                  <input
                    type="text"
                    value={dobBs}
                    onChange={(e) => handleDobBsChange(e.target.value)}
                    placeholder="उदा. 20760410 वा 2076-04-10"
                    className="erp-input font-mono bg-white"
                  />
                  <p className="text-[10px] text-gray-500 mt-0.5">8 अंक टाइप गर्दा स्वतः ढाँचा मिल्छ</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-gray-800">
                      DOB in AD (ई.सं.)
                    </label>
                    <span className="text-[10px] text-emerald-600 font-semibold">
                      {manualAdEdited ? '✏️ Manually Edited' : '⚡ Auto-calculated'}
                    </span>
                  </div>
                  <input
                    type="date"
                    value={dobAd}
                    onChange={(e) => {
                      setDobAd(e.target.value);
                      setManualAdEdited(true);
                    }}
                    className="erp-input bg-white"
                  />
                  <p className="text-[10px] text-gray-500 mt-0.5">आवश्यक भएमा दिन सच्याउन सकिन्छ (Editable)</p>
                </div>
              </div>

              {/* Class, Roll, Admission Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Assign Class *</label>
                  <select
                    name="classId"
                    required
                    onChange={(e) => {
                      const sel = classesData?.find((c: any) => String(c.id) === String(e.target.value));
                      if (sel) {
                        const low = sel.name.toLowerCase();
                        if (low.includes('nursery') || low.includes('kg') || low.includes('play')) {
                          setAdmissionFeeAmount('1500');
                        } else {
                          setAdmissionFeeAmount('2000');
                        }
                      }
                    }}
                    className="erp-input"
                  >
                    <option value="">Select Class</option>
                    {classesData?.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section ? `(${c.section})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Roll Number</label>
                  <input name="rollNo" type="number" placeholder="1" className="erp-input font-bold" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Admission Date (भर्ना मिति BS)</label>
                  <input
                    type="text"
                    value={admissionDateBs}
                    onChange={(e) => setAdmissionDateBs(formatDateInput(e.target.value))}
                    placeholder="2083-01-10"
                    className="erp-input font-mono"
                  />
                </div>
              </div>

              {/* Admission Charge Type */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                  <span>Admission Fee (भर्ना शुल्क):</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-800">
                      <input
                        type="radio"
                        name="chargeRadio"
                        checked={admissionChargeType === 'CHARGEABLE'}
                        onChange={() => setAdmissionChargeType('CHARGEABLE')}
                      />
                      Chargeable (सशुल्क)
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-blue-800">
                      <input
                        type="radio"
                        name="chargeRadio"
                        checked={admissionChargeType === 'FREE'}
                        onChange={() => setAdmissionChargeType('FREE')}
                      />
                      Free / Waived (निःशुल्क)
                    </label>
                  </div>
                </div>

                {admissionChargeType === 'CHARGEABLE' ? (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-gray-500 font-semibold">Amount (रु.):</span>
                    <input
                      type="number"
                      min="0"
                      value={admissionFeeAmount}
                      onChange={(e) => setAdmissionFeeAmount(e.target.value)}
                      className="w-32 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-slate-800 bg-white"
                    />
                    <span className="text-[10px] text-gray-400">कक्षा अनुसार स्वतः भरिएको शुल्क</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-blue-700 font-medium pt-0.5">
                    ✨ भर्ना निःशुल्क (Free Admission) — विद्यार्थीको खातामा भर्ना शुल्क लागु हुने छैन।
                  </p>
                )}
              </div>

              {/* Transportation */}
              <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200/80 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-900 text-xs">
                  <input
                    type="checkbox"
                    checked={needTransport}
                    onChange={(e) => setNeedTransport(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600"
                  />
                  <span>School Van / Transportation Service (यातायात सेवा आवश्यक)</span>
                </label>

                {needTransport && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Route / Bus Stop (बस स्टप):</label>
                      <input
                        type="text"
                        value={transportStop}
                        onChange={(e) => setTransportStop(e.target.value)}
                        placeholder="उदा. Pipra Chowk, Garuda, Sukdevchowk..."
                        className="erp-input bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Monthly Bus Fee (मासिक भाडा रु.):</label>
                      <input
                        type="number"
                        min="0"
                        value={transportFeeAmount}
                        onChange={(e) => setTransportFeeAmount(e.target.value)}
                        className="erp-input bg-white text-xs font-bold font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Scholarship & Concession (छात्रवृत्ति तथा शुल्क छुट) */}
              <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs">
                    <span>🎓 Scholarship & Fee Concession (छात्रवृत्ति तथा शुल्क छुट)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setScholarshipType('NONE')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        scholarshipType === 'NONE'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      Regular (नियमित)
                    </button>
                    <button
                      type="button"
                      onClick={() => setScholarshipType('FULL')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        scholarshipType === 'FULL'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      Full 100% (छात्रवृत्ति)
                    </button>
                    <button
                      type="button"
                      onClick={() => setScholarshipType('PARTIAL')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        scholarshipType === 'PARTIAL'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      Concession (शुल्क छुट)
                    </button>
                  </div>
                </div>

                {scholarshipType === 'FULL' && (
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                    <span className="font-bold">✨ पूर्ण छात्रवृत्ति (100% Scholarship):</span>
                    <span>यस विद्यार्थीको मासिक पढाइ शुल्क शतप्रतिशत मिनाहा (रू ०) हुनेछ।</span>
                  </div>
                )}

                {scholarshipType === 'PARTIAL' && (
                  <div className="space-y-2.5 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Discount Percentage (छुट प्रतिशत %):
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={discountPercent}
                            onChange={(e) => {
                              setDiscountPercent(e.target.value);
                              if (e.target.value && parseFloat(e.target.value) > 0) setCustomMonthlyFee('');
                            }}
                            placeholder="e.g. 25, 50"
                            className="erp-input bg-white font-mono font-bold"
                          />
                          <span className="absolute right-3 top-2 text-gray-400 font-bold">%</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          OR Fixed Custom Monthly Fee (निश्चित मासिक शुल्क रू):
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={customMonthlyFee}
                          onChange={(e) => {
                            setCustomMonthlyFee(e.target.value);
                            if (e.target.value && parseFloat(e.target.value) > 0) setDiscountPercent('0');
                          }}
                          placeholder="e.g. 1000"
                          className="erp-input bg-white font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {scholarshipType !== 'NONE' && (
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Scholarship / Concession Reason (छुट वा छात्रवृत्ति विवरण/कारण):
                    </label>
                    <input
                      type="text"
                      value={discountRemarks}
                      onChange={(e) => setDiscountRemarks(e.target.value)}
                      placeholder="उदा. जेहेन्दार विद्यार्थी, विपन्न वर्ग, कर्मचारी सन्तति छुट..."
                      className="erp-input bg-white text-xs"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-gray-100 pt-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Father's Name</label>
                  <input name="fatherName" type="text" placeholder="Father full name" className="erp-input" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Mother's Name</label>
                  <input name="motherName" type="text" placeholder="Mother full name" className="erp-input" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Guardian Name</label>
                  <input name="guardianName" type="text" placeholder="Guardian name" className="erp-input" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Guardian Contact (Mobile No) *</label>
                  <input required name="guardianContact" type="tel" placeholder="98XXXXXXXX" className="erp-input font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Permanent Address</label>
                  <input name="address" type="text" placeholder="District, Municipality, Ward" className="erp-input" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Mother Tongue (मातृभाषा)</label>
                  <input name="ethnicity" type="text" placeholder="Nepali, Maithili, etc." className="erp-input" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addStudentMutation.isPending}
                  className="rounded-xl bg-[#1e3a5f] px-5 py-2 font-semibold text-white hover:bg-[#2a5280] disabled:opacity-60"
                >
                  {addStudentMutation.isPending ? 'Saving...' : 'Save Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: IEMIS EXCEL BULK IMPORT ──────────────────────────────── */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-[#1e3a5f]">IEMIS Excel Bulk Import</h2>
                <p className="text-[11px] text-gray-500">
                  Direct import from official Nepal IEMIS Excel format (.xlsx)
                </p>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBulkImportSubmit} className="space-y-4 text-xs">
              {/* Expected column banner */}
              <div className="rounded-xl bg-blue-50/80 border border-blue-100 p-3 text-[11px] text-blue-900">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-blue-600" />
                  <span>Supports Standard Nepal IEMIS Columns:</span>
                </p>
                <p className="text-blue-800/80 mt-1 font-mono text-[10px] leading-relaxed">
                  S.N | IEMIS Code | Student Id | FullName | Gender | Father Name | Mother Name | CurrentClass | Section | Permanent Address | DOB | Guardian Contact Number
                </p>
              </div>

              {/* Class target selection */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Assign Imported Students To Class (Optional):
                </label>
                <select
                  value={importClassId}
                  onChange={(e) => setImportClassId(e.target.value)}
                  className="erp-input"
                >
                  <option value="">Auto-assign or Assign Later</option>
                  {classesData?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.section ? `(${c.section})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* File upload drag/select */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Select Excel (.xlsx / .xls) File *</label>
                <div className="mt-1 flex justify-center rounded-2xl border-2 border-dashed border-gray-200 px-6 pt-5 pb-6 text-center hover:border-emerald-400 transition bg-slate-50">
                  <div className="space-y-1 text-center">
                    <Upload size={28} className="mx-auto text-emerald-600 mb-1" />
                    <div className="flex text-xs text-gray-600">
                      <label className="relative cursor-pointer rounded-md font-bold text-emerald-600 hover:underline">
                        <span>Browse file</span>
                        <input
                          type="file"
                          accept=".xlsx, .xls, .csv"
                          onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                          className="sr-only"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    {importFile ? (
                      <p className="text-xs font-bold text-emerald-700 mt-2 flex items-center justify-center gap-1">
                        <CheckCircle2 size={14} /> {importFile.name}
                      </p>
                    ) : (
                      <p className="text-[10px] text-gray-400">Nepal IEMIS Exported Excel Sheet</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!importFile || bulkImportMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {bulkImportMutation.isPending ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Processing IEMIS Data...</span>
                    </>
                  ) : (
                    <span>Upload & Import Students</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: QUICK EDIT SCHOLARSHIP & FEE CONCESSION ──────────────── */}
      {scholarshipModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-[#1e3a5f] flex items-center gap-2">
                  <span>🎓 Manage Scholarship & Concession (छात्रवृत्ति तथा शुल्क छुट)</span>
                </h2>
                <p className="text-[11px] text-gray-500">
                  Student: <strong className="text-gray-900">{scholarshipModalStudent.fullName}</strong> ({scholarshipModalStudent.studentId})
                </p>
              </div>
              <button onClick={() => setScholarshipModalStudent(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateScholarshipMutation.mutate({
                  id: scholarshipModalStudent.id,
                  data: {
                    scholarshipType: editSchType,
                    discountPercent: editSchType === 'PARTIAL' ? (parseFloat(editDiscountPercent) || 0) : 0,
                    customMonthlyFee: editSchType === 'PARTIAL' && editCustomMonthlyFee ? (parseFloat(editCustomMonthlyFee) || null) : null,
                    discountRemarks: editDiscountRemarks || null,
                  },
                });
              }}
              className="space-y-4 text-xs"
            >
              <div className="flex items-center justify-center gap-2 bg-slate-100 p-1.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setEditSchType('NONE')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                    editSchType === 'NONE'
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Regular (नियमित शुल्क)
                </button>
                <button
                  type="button"
                  onClick={() => setEditSchType('FULL')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                    editSchType === 'FULL'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Full (१००% छात्रवृत्ति)
                </button>
                <button
                  type="button"
                  onClick={() => setEditSchType('PARTIAL')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                    editSchType === 'PARTIAL'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Concession (शुल्क छुट)
                </button>
              </div>

              {editSchType === 'FULL' && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 leading-relaxed">
                  <p className="font-extrabold flex items-center gap-1.5 text-xs">
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <span>पूर्ण छात्रवृत्ति (100% Free Scholarship)</span>
                  </p>
                  <p className="text-[11px] text-emerald-800 mt-1">
                    यस विद्यार्थीको मासिक पढाइ शुल्क ० रूपैयाँ (निःशुल्क) हुनेछ। महिनाको अन्त्यमा बिल उत्पादन गर्दा प्रणालीले स्वतः छात्रवृत्ति समायोजन गर्नेछ।
                  </p>
                </div>
              )}

              {editSchType === 'PARTIAL' && (
                <div className="space-y-3 p-3.5 bg-amber-50/60 rounded-xl border border-amber-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Discount Percent (%):
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editDiscountPercent}
                          onChange={(e) => {
                            setEditDiscountPercent(e.target.value);
                            if (e.target.value && parseFloat(e.target.value) > 0) setEditCustomMonthlyFee('');
                          }}
                          placeholder="e.g. 50"
                          className="erp-input bg-white font-mono font-bold"
                        />
                        <span className="absolute right-3 top-2 text-gray-400 font-bold">%</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">जस्तै २५%, ५०% छुट</p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        OR Fixed Fee (रु.):
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editCustomMonthlyFee}
                        onChange={(e) => {
                          setEditCustomMonthlyFee(e.target.value);
                          if (e.target.value && parseFloat(e.target.value) > 0) setEditDiscountPercent('0');
                        }}
                        placeholder="e.g. 1000"
                        className="erp-input bg-white font-mono font-bold"
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5">निश्चित मासिक शुल्क रकम</p>
                    </div>
                  </div>
                </div>
              )}

              {editSchType !== 'NONE' && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Scholarship / Discount Reason (छात्रवृत्ति तथा छुट विवरण):
                  </label>
                  <input
                    type="text"
                    value={editDiscountRemarks}
                    onChange={(e) => setEditDiscountRemarks(e.target.value)}
                    placeholder="उदा. जेहेन्दार विद्यार्थी छात्रवृत्ति, स्टाफ सन्तति छुट..."
                    className="erp-input bg-white"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setScholarshipModalStudent(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateScholarshipMutation.isPending}
                  className="rounded-xl bg-[#1e3a5f] px-5 py-2 font-semibold text-white hover:bg-[#2a5280] disabled:opacity-60"
                >
                  {updateScholarshipMutation.isPending ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
