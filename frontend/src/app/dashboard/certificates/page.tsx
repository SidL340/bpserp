'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
import {
  Award,
  Printer,
  Search,
  Plus,
  FileText,
  X,
  School,
  CheckCircle2,
  Calendar,
  Sparkles,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const DEFAULT_CERT_TEMPLATES = {
  CHARACTER: `This is to certify that Mr. / Ms. {studentName}, Son / Daughter of Mr. {fatherName} and Mrs. {motherName}, permanent resident of {address}, was a bonafide student of this institution. He / She was enrolled in {className} (Roll No: {rollNo}, Student ID: {studentId}) during the academic session {academicYear} B.S.

According to the school official register, his / her date of birth is {dobBs} B.S. To the best of our knowledge, he / she bears an {characterGrade} moral character and conduct. During the period of study, he / she did not participate in any subversive or undisciplined activity detrimental to the prestige of the institution.

We wish him / her supreme success in all upcoming academic pursuits and bright future.`,

  TRANSFER: `This is to certify that Mr. / Ms. {studentName}, Son / Daughter of Mr. {fatherName} and Mrs. {motherName}, was a bonafide student of {className} (Roll No: {rollNo}, Student ID: {studentId}) at this institution up to academic session {academicYear} B.S.

He / She has cleared all school dues and fees up to the current session. Permission is hereby granted for transfer upon guardian request due to: {reasonForLeave}. His / her moral conduct has been recorded as {conduct}.

This school has no objection to his / her admission to any other recognized educational institution.`,

  BONAFIDE: `This is to certify that Mr. / Ms. {studentName}, Son / Daughter of Mr. {fatherName} and Mrs. {motherName}, resident of {address}, is a genuine and regular student studying in {className} (Roll No: {rollNo}, Student ID: {studentId}) of Brindawan Public School for the academic year {academicYear} B.S.

To the best of our records, he / she maintains an excellent record of attendance, obedience, and good moral conduct.

This certificate is issued upon the request of his / her guardian for official / academic purposes.`,
};

function substituteTokensForPrint(template: string, tokens: Record<string, string>) {
  let res = template || '';
  for (const [k, v] of Object.entries(tokens)) {
    res = res.replaceAll(`{${k}}`, `<b>${v || '—'}</b>`);
  }
  return res.replace(/\n\n/g, '<br/><br/>').replace(/\n/g, '<br/>');
}

export default function CertificatesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'character' | 'transfer' | 'bonafide' | 'history'>('character');

  // Student search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Form fields
  const [issuedDateBs, setIssuedDateBs] = useState(todayBS());
  const [characterGrade, setCharacterGrade] = useState('EXCELLENT (उत्कृष्ट)');
  const [academicYear, setAcademicYear] = useState('2083');
  const [reasonForLeave, setReasonForLeave] = useState('Guardian relocated / Further studies');
  const [destinationSchool, setDestinationSchool] = useState('');
  const [conduct, setConduct] = useState('Good & Disciplined');
  const [issuedBy, setIssuedBy] = useState('Principal');
  const [selectedCertForPrint, setSelectedCertForPrint] = useState<any>(null);

  // Admin Customizable Written Format (Suite Format Wording)
  const [customWrittenFormat, setCustomWrittenFormat] = useState(DEFAULT_CERT_TEMPLATES.CHARACTER);

  // Fetch student search
  const { data: searchResults } = useQuery({
    queryKey: ['students-cert-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const res = await api.get(`/students?search=${encodeURIComponent(searchQuery)}&limit=8`);
      return res.data?.data || [];
    },
    enabled: searchQuery.length >= 2,
  });

  // Fetch certificate history
  const { data: certsData, isLoading } = useQuery({
    queryKey: ['certificates'],
    queryFn: async () => {
      const res = await api.get('/school/certificates');
      return res.data?.data || [];
    },
  });

  // Fetch school info for branding and seal
  const { data: schoolData } = useQuery({
    queryKey: ['school-profile'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
      return res.data?.data;
    },
  });

  const defaultSchool = {
    name: 'Brindawan Public School',
    nameNepali: 'बृन्दावन पब्लिक स्कूल',
    address: 'Brindaban Municipality-02, Rautahat, Madhesh Province, Nepal',
    emisCode: 'BPS-320160',
    estYear: '2075',
    phone: '+977 9845000000',
    email: 'info@bps.edu.np',
    principalName: 'Premlal Prasad Raut',
  };

  const school = schoolData || defaultSchool;

  // Issue Certificate Mutation
  const issueCertMutation = useMutation({
    mutationFn: async (type: 'CHARACTER' | 'TRANSFER' | 'BONAFIDE') => {
      if (!selectedStudent) throw new Error('Please search and select a student first');
      const res = await api.post('/school/certificates', {
        studentId: selectedStudent.id,
        type,
        issuedDateBs,
        issuedBy,
        remarks:
          type === 'CHARACTER'
            ? `Character: ${characterGrade}`
            : type === 'TRANSFER'
            ? `Transferred: ${reasonForLeave}`
            : `Bonafide Student in Class ${selectedStudent.currentClass || 'Primary'}`,
        data: {
          characterGrade,
          academicYear,
          reasonForLeave,
          destinationSchool,
          conduct,
          studentName: selectedStudent.fullName,
          studentNameNepali: selectedStudent.fullNameNepali,
          fatherName: selectedStudent.fatherName,
          motherName: selectedStudent.motherName,
          className: selectedStudent.currentClass,
          rollNo: selectedStudent.rollNo,
          studentId: selectedStudent.studentId,
          dobBs: selectedStudent.dateOfBirthBs,
          address: selectedStudent.permanentAddress || 'Brindaban, Rautahat',
          customBodyText: customWrittenFormat,
        },
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`${data.data.type} Certificate issued! Ref No: ${data.data.certificateNo}`);
      setSelectedCertForPrint(data.data);
      setSelectedStudent(null);
      setSearchQuery('');
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to issue certificate');
    },
  });

  const certificates = certsData || [];

  const triggerCertificatePrint = (cert?: any) => {
    const c = cert || selectedCertForPrint;
    if (!c) return;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const type = c.type || (activeTab === 'character' ? 'CHARACTER' : activeTab === 'transfer' ? 'TRANSFER' : 'BONAFIDE');
    const student = c.student || selectedStudent || {};
    const meta = c.data || {};

    const studentName = meta.studentName || student.fullName || 'Student Name';
    const fatherName = meta.fatherName || student.fatherName || '—';
    const motherName = meta.motherName || student.motherName || '—';
    const className = meta.className || student.currentClass || 'Class 5';
    const rollNo = meta.rollNo || student.rollNo || '—';
    const sId = meta.studentId || student.studentId || '—';
    const dob = meta.dobBs || student.dateOfBirthBs || '—';
    const addr = meta.address || student.permanentAddress || 'Brindaban Municipality-02, Rautahat';
    const refNo = c.certificateNo || 'BPS-CERT-2083-0001';
    const date = c.issuedDateBs || issuedDateBs;

    let certTitle = 'CHARACTER CERTIFICATE';
    let certSubtitleNepali = 'चारित्रिक प्रमाणपत्र';
    let certBadgeColor = '#1e3a5f';

    if (type === 'TRANSFER') {
      certTitle = 'SCHOOL TRANSFER CERTIFICATE (T.C.)';
      certSubtitleNepali = 'स्थानान्तरण प्रमाणपत्र';
      certBadgeColor = '#b45309';
    } else if (type === 'BONAFIDE') {
      certTitle = 'BONAFIDE STUDY CERTIFICATE';
      certSubtitleNepali = 'अध्ययनरत / बोनाफाइड प्रमाणपत्र';
      certBadgeColor = '#065f46';
    }

    const tokenMap: Record<string, string> = {
      studentName,
      fatherName,
      motherName,
      className,
      rollNo,
      studentId: sId,
      dobBs: dob,
      address: addr,
      academicYear: meta.academicYear || academicYear,
      characterGrade: meta.characterGrade || characterGrade,
      reasonForLeave: meta.reasonForLeave || reasonForLeave,
      conduct: meta.conduct || conduct,
      destinationSchool: meta.destinationSchool || destinationSchool,
    };

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${certTitle} - ${studentName}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 10mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: "Georgia", "Times New Roman", serif;
              margin: 0;
              padding: 0;
              background: #fff;
              color: #1a1a1a;
            }
            .cert-container {
              position: relative;
              width: 100%;
              min-height: 185mm;
              padding: 18mm 22mm;
              border: 5px solid #1e3a5f;
              border-radius: 4px;
              background: #fdfbf7;
              outline: 2px solid #d97706;
              outline-offset: -8px;
            }
            .cert-corner-tl, .cert-corner-tr, .cert-corner-bl, .cert-corner-br {
              position: absolute;
              width: 24px;
              height: 24px;
              border: 3px solid #d97706;
            }
            .cert-corner-tl { top: 10px; left: 10px; border-right: none; border-bottom: none; }
            .cert-corner-tr { top: 10px; right: 10px; border-left: none; border-bottom: none; }
            .cert-corner-bl { bottom: 10px; left: 10px; border-right: none; border-top: none; }
            .cert-corner-br { bottom: 10px; right: 10px; border-left: none; border-top: none; }

            .watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-25deg);
              font-size: 60px;
              font-weight: 900;
              color: rgba(30, 58, 95, 0.04);
              letter-spacing: 6px;
              pointer-events: none;
              text-align: center;
              white-space: nowrap;
              text-transform: uppercase;
              font-family: sans-serif;
            }

            .header {
              text-align: center;
              position: relative;
              z-index: 2;
            }
            .school-crest {
              display: inline-block;
              width: 58px;
              height: 58px;
              margin-bottom: 4px;
            }
            .school-name-np {
              font-size: 18px;
              font-weight: bold;
              color: #b45309;
              margin: 0;
            }
            .school-name-en {
              font-size: 28px;
              font-weight: 900;
              color: #1e3a5f;
              letter-spacing: 2px;
              margin: 2px 0 0 0;
              text-transform: uppercase;
            }
            .school-tag {
              font-size: 11.5px;
              color: #4b5563;
              font-family: sans-serif;
              margin-top: 3px;
            }
            .school-meta {
              font-size: 10.5px;
              color: #6b7280;
              font-family: sans-serif;
              letter-spacing: 0.5px;
              margin-top: 2px;
              font-weight: 600;
            }

            .title-wrap {
              text-align: center;
              margin: 14px 0 16px 0;
              position: relative;
              z-index: 2;
            }
            .cert-title-box {
              display: inline-block;
              border-top: 2px solid #d97706;
              border-bottom: 2px solid #d97706;
              padding: 5px 30px;
            }
            .cert-title {
              font-size: 20px;
              font-weight: 900;
              color: ${certBadgeColor};
              letter-spacing: 2px;
              margin: 0;
              text-transform: uppercase;
            }
            .cert-sub-np {
              font-size: 12px;
              font-weight: bold;
              color: #78350f;
              margin-top: 2px;
            }

            .meta-bar {
              display: flex;
              justify-content: space-between;
              font-family: sans-serif;
              font-size: 11px;
              font-weight: 700;
              color: #374151;
              margin-bottom: 16px;
              position: relative;
              z-index: 2;
              border-bottom: 1px dotted #cbd5e1;
              padding-bottom: 6px;
            }

            .cert-body {
              font-size: 15px;
              line-height: 2.1;
              text-align: justify;
              color: #1e293b;
              margin: 16px 0 30px 0;
              position: relative;
              z-index: 2;
            }
            .cert-body b {
              color: #0f172a;
              border-bottom: 1px solid #94a3b8;
              padding: 0 4px;
            }

            .seal-box {
              width: 85px;
              height: 85px;
              border: 3px double #b91c1c;
              border-radius: 50%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              color: #b91c1c;
              font-size: 6px;
              font-weight: 900;
              text-align: center;
              margin: auto;
              background: rgba(254, 242, 242, 0.5);
              outline: 1px dashed #b91c1c;
              outline-offset: -3px;
              transform: rotate(-5deg);
            }

            .footer-signatures {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 36px;
              position: relative;
              z-index: 2;
              font-family: sans-serif;
              font-size: 11.5px;
            }
            .sig-block {
              width: 170px;
              text-align: center;
            }
            .sig-line {
              border-top: 1.5px solid #1e293b;
              padding-top: 5px;
              font-weight: 700;
              color: #1e293b;
            }
            .sig-title {
              font-size: 10px;
              color: #64748b;
            }
          </style>
        </head>
        <body>
          <div class="cert-container">
            <div class="cert-corner-tl"></div>
            <div class="cert-corner-tr"></div>
            <div class="cert-corner-bl"></div>
            <div class="cert-corner-br"></div>

            <div class="watermark">BRINDAWAN PUBLIC SCHOOL</div>

            <div class="header">
              <img src="/school_logo.png" class="school-crest" alt="School Crest" />
              <div class="school-name-np">बृन्दावन पब्लिक स्कूल, रौतहट</div>
              <div class="school-name-en">BRINDAWAN PUBLIC SCHOOL</div>
              <div class="school-tag">A Premier Child-Centered English Medium Private School</div>
              <div class="school-meta">
                Brindaban Municipality-02, Rautahat, Madhesh Province, Nepal • Regd No: BPS-PVT-2075 • EMIS Code: ${school.emisCode || 'BPS-320160'} • Estd: 2075 B.S.
              </div>
            </div>

            <div class="title-wrap">
              <div class="cert-title-box">
                <div class="cert-title">${certTitle}</div>
                <div class="cert-sub-np">${certSubtitleNepali}</div>
              </div>
            </div>

            <div class="meta-bar">
              <div>Ref No: <span style="font-family: monospace; color: #1e3a5f; font-weight: 800;">${refNo}</span></div>
              <div>Issue Date: <span>${date} B.S.</span></div>
            </div>

            <div class="cert-body">
              ${
                meta.customBodyText
                  ? substituteTokensForPrint(meta.customBodyText, tokenMap)
                  : customWrittenFormat
                  ? substituteTokensForPrint(customWrittenFormat, tokenMap)
                  : type === 'CHARACTER'
                  ? `This is to certify that Mr. / Ms. <b>${studentName}</b>, Son / Daughter of Mr. <b>${fatherName}</b> and Mrs. <b>${motherName}</b>, permanent resident of <b>${addr}</b>, was a bonafide student of this institution. He / She was enrolled in <b>${className}</b> (Roll No: <b>${rollNo}</b>, Student ID: <b>${sId}</b>) during the academic session <b>${academicYear} B.S.</b>
                    <br/><br/>
                    According to the school official register, his / her date of birth is <b>${dob} B.S.</b> To the best of our knowledge, he / she bears an <b>${characterGrade}</b> moral character and conduct. During the period of study, he / she did not participate in any subversive or undisciplined activity detrimental to the prestige of the institution.
                    <br/><br/>
                    We wish him / her supreme success in all upcoming academic pursuits and bright future.`
                  : type === 'TRANSFER'
                  ? `This is to certify that Mr. / Ms. <b>${studentName}</b>, Son / Daughter of Mr. <b>${fatherName}</b> and Mrs. <b>${motherName}</b>, was a bonafide student of <b>${className}</b> (Roll No: <b>${rollNo}</b>, Student ID: <b>${sId}</b>) at this institution.
                    <br/><br/>
                    He / She has cleared all school dues and fees up to the current session. Permission is hereby granted for transfer upon guardian request due to: <b>${reasonForLeave}</b>. His / her moral conduct has been recorded as <b>${conduct}</b>.
                    <br/><br/>
                    This school has no objection to his / her admission to any other educational institution.`
                  : `This is to certify that Mr. / Ms. <b>${studentName}</b>, Son / Daughter of Mr. <b>${fatherName}</b> and Mrs. <b>${motherName}</b>, resident of <b>${addr}</b>, is a genuine and regular student studying in <b>${className}</b> (Roll No: <b>${rollNo}</b>, Student ID: <b>${sId}</b>) of Brindawan Public School for the academic year <b>${academicYear} B.S.</b>
                    <br/><br/>
                    To the best of our records, he / she maintains an excellent record of attendance, obedience, and good moral conduct.`
              }
            </div>

            <div class="footer-signatures">
              <div class="sig-block">
                <div class="sig-line">Prepared & Checked By</div>
                <div class="sig-title">Class Teacher / Exam In-charge</div>
              </div>

              <div class="sig-block">
                <div class="seal-box">
                  <div style="font-size: 5px; letter-spacing: 0.5px;">★ BRINDAWAN PUBLIC SCHOOL ★</div>
                  <div style="font-size: 8px; font-weight: 900; margin: 2px 0;">OFFICIAL SEAL</div>
                  <div style="font-size: 5px;">ESTD 2075 B.S.</div>
                  <div style="font-size: 5px; color: #7f1d1d;">बृन्दावन पब्लिक स्कूल</div>
                </div>
                <div class="sig-title" style="margin-top: 4px;">School Seal (छाप)</div>
              </div>

              <div class="sig-block">
                <div class="sig-line">${school.principalName || 'Premlal Prasad Raut'}</div>
                <div class="sig-title">Headmaster / Principal</div>
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
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
            <div className="p-2 rounded-xl bg-amber-100 text-amber-900">
              <Award size={22} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-[#1e3a5f]">
                Certificates Portal (प्रमाणपत्र व्यवस्थापन)
              </h1>
              <p className="text-xs text-gray-500 font-nepali">
                Character Certificate (चारित्रिक), Transfer Certificate (स्थानान्तरण), र Bonafide Certificate निर्माण तथा प्रिन्ट
              </p>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-emerald-50/60 rounded-2xl border border-emerald-200">
          <button
            onClick={() => {
              setActiveTab('character');
              setCustomWrittenFormat(DEFAULT_CERT_TEMPLATES.CHARACTER);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'character' ? 'bg-emerald-800 text-white shadow-xs' : 'text-emerald-900 hover:text-emerald-700'
            }`}
          >
            <Sparkles size={13} className={activeTab === 'character' ? 'text-amber-300' : 'text-amber-600'} />
            <span>Character (CC)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('transfer');
              setCustomWrittenFormat(DEFAULT_CERT_TEMPLATES.TRANSFER);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'transfer' ? 'bg-emerald-800 text-white shadow-xs' : 'text-emerald-900 hover:text-emerald-700'
            }`}
          >
            <FileText size={13} className={activeTab === 'transfer' ? 'text-amber-300' : 'text-amber-600'} />
            <span>Transfer (TC)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('bonafide');
              setCustomWrittenFormat(DEFAULT_CERT_TEMPLATES.BONAFIDE);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'bonafide' ? 'bg-emerald-800 text-white shadow-xs' : 'text-emerald-900 hover:text-emerald-700'
            }`}
          >
            <UserCheck size={13} className={activeTab === 'bonafide' ? 'text-amber-300' : 'text-amber-600'} />
            <span>Bonafide</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'history' ? 'bg-emerald-800 text-white shadow-xs' : 'text-emerald-900 hover:text-emerald-700'
            }`}
          >
            <Award size={13} className={activeTab === 'history' ? 'text-amber-300' : 'text-amber-600'} />
            <span>History ({certificates.length})</span>
          </button>
        </div>
      </div>

      {activeTab !== 'history' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form (5 Cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-black text-[#1e3a5f] uppercase tracking-wide border-b border-gray-100 pb-2">
              1. Search & Select Student
            </h3>

            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student by name, student ID, roll no..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Search Dropdown Results */}
              {searchResults && searchResults.length > 0 && !selectedStudent && (
                <div className="absolute top-11 left-0 right-0 z-30 rounded-xl border border-gray-200 bg-white shadow-xl max-h-56 overflow-auto divide-y divide-gray-100">
                  {searchResults.map((s: any) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedStudent(s);
                        setSearchQuery('');
                      }}
                      className="w-full text-left p-3 hover:bg-blue-50 transition flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-gray-900">{s.fullName}</p>
                        <p className="text-[10px] text-gray-500">
                          Class {s.currentClass} · Roll {s.rollNo} · ID: {s.studentId}
                        </p>
                      </div>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">
                        Select
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Student Banner */}
            {selectedStudent ? (
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 space-y-2 relative">
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
                  title="Remove student"
                >
                  <X size={16} />
                </button>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span className="text-xs font-black text-blue-950">{selectedStudent.fullName}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600">
                  <div>Grade: <b className="text-gray-900">{selectedStudent.currentClass}</b></div>
                  <div>Roll No: <b className="text-gray-900">{selectedStudent.rollNo}</b></div>
                  <div>Father: <b className="text-gray-900">{selectedStudent.fatherName || '—'}</b></div>
                  <div>DOB (BS): <b className="text-gray-900 font-mono">{selectedStudent.dateOfBirthBs || '—'}</b></div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
                ⚠️ Please search and click a student from the list to populate certificate records.
              </p>
            )}

            {/* Additional Form Fields */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-black text-[#1e3a5f] uppercase tracking-wide border-b border-gray-100 pb-2">
                2. Certificate Parameters
              </h3>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Issue Date (B.S.):</label>
                <input
                  type="text"
                  value={issuedDateBs}
                  onChange={(e) => setIssuedDateBs(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Academic Year (B.S.):</label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-mono outline-none"
                />
              </div>

              {activeTab === 'character' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Character / Moral Grade:</label>
                  <select
                    value={characterGrade}
                    onChange={(e) => setCharacterGrade(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 outline-none bg-white"
                  >
                    <option value="EXCELLENT (उत्कृष्ट)">EXCELLENT (उत्कृष्ट)</option>
                    <option value="VERY GOOD (धेरै राम्रो)">VERY GOOD (धेरै राम्रो)</option>
                    <option value="GOOD (राम्रो)">GOOD (राम्रो)</option>
                    <option value="SATISFACTORY (सन्तोषजनक)">SATISFACTORY (सन्तोषजनक)</option>
                  </select>
                </div>
              )}

              {activeTab === 'transfer' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Reason for Leaving:</label>
                    <input
                      type="text"
                      value={reasonForLeave}
                      onChange={(e) => setReasonForLeave(e.target.value)}
                      placeholder="e.g. Guardian relocation / further studies"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Destination School (if known):</label>
                    <input
                      type="text"
                      value={destinationSchool}
                      onChange={(e) => setDestinationSchool(e.target.value)}
                      placeholder="School name"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Issued By Authority:</label>
                <input
                  type="text"
                  value={issuedBy}
                  onChange={(e) => setIssuedBy(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none"
                />
              </div>

              {/* 3. Certificate Suite Written Format Section (Admin Choice) */}
              <div className="space-y-2 pt-3 border-t border-emerald-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                    <FileText size={14} className="text-emerald-700" />
                    <span>3. Written Format / व्यहोरा (Admin Choice)</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      const template =
                        activeTab === 'character'
                          ? DEFAULT_CERT_TEMPLATES.CHARACTER
                          : activeTab === 'transfer'
                          ? DEFAULT_CERT_TEMPLATES.TRANSFER
                          : DEFAULT_CERT_TEMPLATES.BONAFIDE;
                      setCustomWrittenFormat(template);
                      toast.success('Reset to standard school format');
                    }}
                    className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <span>🔄 Reset Standard Format</span>
                  </button>
                </div>
                <p className="text-[10.5px] text-gray-500 leading-tight">
                  प्रमाणपत्रको लिखित व्यहोरा एडमिनले चाहेअनुसार सम्पादन गर्न सक्नुहुन्छ वा टोकन बटन थिचेर थप्न सक्नुहुन्छ:
                </p>

                {/* Token Insertion Pills */}
                <div className="flex flex-wrap gap-1 py-1 bg-emerald-50/50 p-2 rounded-xl border border-emerald-200/60">
                  {[
                    { label: 'Student Name', token: '{studentName}' },
                    { label: 'Father', token: '{fatherName}' },
                    { label: 'Mother', token: '{motherName}' },
                    { label: 'Class', token: '{className}' },
                    { label: 'Roll No', token: '{rollNo}' },
                    { label: 'Student ID', token: '{studentId}' },
                    { label: 'DOB', token: '{dobBs}' },
                    { label: 'Year', token: '{academicYear}' },
                    { label: 'Address', token: '{address}' },
                    { label: 'Character', token: '{characterGrade}' },
                    { label: 'Reason', token: '{reasonForLeave}' },
                    { label: 'Conduct', token: '{conduct}' },
                  ].map((t) => (
                    <button
                      key={t.token}
                      type="button"
                      onClick={() => setCustomWrittenFormat((prev) => `${prev} ${t.token}`)}
                      className="px-2 py-0.5 rounded-md bg-white text-emerald-900 border border-emerald-300 text-[10px] font-bold hover:bg-emerald-100 transition shadow-2xs"
                      title={`Insert ${t.token}`}
                    >
                      + {t.label}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={7}
                  value={customWrittenFormat}
                  onChange={(e) => setCustomWrittenFormat(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-300 text-xs font-serif leading-relaxed focus:ring-2 focus:ring-emerald-500 outline-none bg-white shadow-inner"
                  placeholder="प्रमाणपत्रको लिखित व्यहोरा यहाँ सम्पादन गर्नुहोस्..."
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  disabled={!selectedStudent || issueCertMutation.isPending}
                  onClick={() =>
                    issueCertMutation.mutate(
                      activeTab === 'character' ? 'CHARACTER' : activeTab === 'transfer' ? 'TRANSFER' : 'BONAFIDE'
                    )
                  }
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Award size={15} className="text-amber-300" />
                  <span>Issue & Save Certificate</span>
                </button>
                <button
                  type="button"
                  onClick={() => triggerCertificatePrint()}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                >
                  <Printer size={15} />
                  <span>Print Direct</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Certificate Live Preview (7 Cols) */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border-4 border-[#1e3a5f] bg-[#fdfbf7] p-8 shadow-xl relative overflow-hidden font-serif outline-2 outline-[#d97706] -outline-offset-8">
              {/* Corner Filigrees */}
              <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-amber-600" />
              <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-amber-600" />
              <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-amber-600" />
              <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-amber-600" />

              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                <span className="text-4xl font-black tracking-widest text-[#1e3a5f] uppercase -rotate-12">
                  BRINDAWAN PUBLIC SCHOOL
                </span>
              </div>

              {/* Certificate Header */}
              <div className="text-center relative z-10 space-y-1">
                <div className="flex justify-center mb-1">
                  <img src="/school_logo.png" alt="School Crest" className="w-16 h-16 object-contain drop-shadow-sm" />
                </div>
                <p className="text-sm font-bold text-amber-700 font-nepali">बृन्दावन पब्लिक स्कूल, रौतहट</p>
                <h2 className="text-2xl font-black text-[#1e3a5f] tracking-wide uppercase">
                  BRINDAWAN PUBLIC SCHOOL
                </h2>
                <p className="text-[11px] text-gray-500 font-sans">
                  A Premier Child-Centered English Medium Private School
                </p>
                <p className="text-[10px] text-gray-400 font-sans">
                  Brindaban Municipality-02, Rautahat, Nepal • Regd No: BPS-PVT-2075 • EMIS Code: {school.emisCode}
                </p>

                {/* Badge Title */}
                <div className="inline-block mt-3 border-y-2 border-amber-600 py-1 px-6">
                  <span className="text-base font-black text-[#1e3a5f] uppercase tracking-widest">
                    {activeTab === 'character'
                      ? 'CHARACTER CERTIFICATE'
                      : activeTab === 'transfer'
                      ? 'SCHOOL TRANSFER CERTIFICATE (T.C.)'
                      : 'BONAFIDE STUDY CERTIFICATE'}
                  </span>
                </div>
              </div>

              {/* Meta */}
              <div className="flex justify-between items-center text-xs font-sans text-gray-600 border-b border-gray-200 pb-2 mt-4 relative z-10">
                <span>Ref No: <b className="font-mono text-[#1e3a5f]">BPS-CERT-PREVIEW</b></span>
                <span>Date: <b className="font-mono">{issuedDateBs} B.S.</b></span>
              </div>

              {/* Body */}
              <div
                className="text-xs sm:text-sm leading-loose text-gray-800 text-justify my-6 relative z-10 space-y-3"
                dangerouslySetInnerHTML={{
                  __html: substituteTokensForPrint(customWrittenFormat, {
                    studentName: selectedStudent?.fullName || '................................................',
                    fatherName: selectedStudent?.fatherName || '................................................',
                    motherName: selectedStudent?.motherName || '................................................',
                    className: selectedStudent?.currentClass || 'Primary Wing',
                    rollNo: selectedStudent?.rollNo || '—',
                    studentId: selectedStudent?.studentId || '—',
                    dobBs: selectedStudent?.dateOfBirthBs || '—',
                    address: selectedStudent?.permanentAddress || 'Brindaban Municipality-02, Rautahat',
                    academicYear,
                    characterGrade,
                    reasonForLeave,
                    conduct,
                    destinationSchool: destinationSchool || 'Another Institution',
                  }),
                }}
              />

              {/* Footer Signatures & Official Seal */}
              <div className="grid grid-cols-3 pt-6 items-end relative z-10 text-center font-sans text-xs">
                <div>
                  <div className="border-t border-gray-600 pt-1 font-bold text-gray-800">
                    Class Teacher / In-charge
                  </div>
                  <span className="text-[10px] text-gray-500">Prepared By</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full border-2 border-rose-700 flex flex-col items-center justify-center p-1 text-rose-700 bg-rose-50/40 transform -rotate-6">
                    <span className="text-[5px] font-black uppercase tracking-tighter">BRINDAWAN PUBLIC SCHOOL</span>
                    <span className="text-[7px] font-black my-0.5">OFFICIAL SEAL</span>
                    <span className="text-[5px] font-bold">ESTD 2075</span>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1">School Seal (छाप)</span>
                </div>

                <div>
                  <div className="border-t border-gray-600 pt-1 font-bold text-gray-800">
                    {school.principalName || 'Premlal Prasad Raut'}
                  </div>
                  <span className="text-[10px] text-gray-500">Headmaster / Principal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* History Table */
        <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-[#1e3a5f] text-white">
              <tr>
                <th className="p-3.5 font-bold uppercase">Certificate No</th>
                <th className="p-3.5 font-bold uppercase">Type</th>
                <th className="p-3.5 font-bold uppercase">Student Name</th>
                <th className="p-3.5 font-bold uppercase">Issue Date (BS)</th>
                <th className="p-3.5 font-bold uppercase">Issued By</th>
                <th className="p-3.5 font-bold uppercase text-center">Print</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    Loading certificate history...
                  </td>
                </tr>
              ) : certificates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    No certificates issued yet.
                  </td>
                </tr>
              ) : (
                certificates.map((cert: any) => (
                  <tr key={cert.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-mono font-bold text-[#1e3a5f]">{cert.certificateNo}</td>
                    <td className="p-3.5">
                      <span className="rounded bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                        {cert.type}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-gray-900">{cert.student?.fullName}</td>
                    <td className="p-3.5 font-mono text-gray-600">{cert.issuedDateBs}</td>
                    <td className="p-3.5 text-gray-600">{cert.issuedBy || 'Principal'}</td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => triggerCertificatePrint(cert)}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-700 transition"
                        title="Print Certificate"
                      >
                        <Printer size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
