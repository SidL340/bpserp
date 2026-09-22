'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { todayBS, formatDateInput } from '@/lib/nepali-date';
import {
  Globe,
  Save,
  ExternalLink,
  Plus,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  UserCheck,
  Building2,
  Bell,
  Trash2,
  Edit2,
  FileText,
  Eye,
  Copy,
  ShieldCheck,
  GraduationCap,
  MessageSquare,
  X,
  AlertCircle,
  Camera,
  Upload,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface GalleryItem {
  id: number;
  title: string;
  caption: string;
  category: string;
  imageUrl: string;
}

export default function WebsiteManagementPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'branding' | 'gallery' | 'inquiries' | 'notices'>('branding');

  // ── 1. FETCH SCHOOL PROFILE ───────────────────────────────────────────────
  const { data: schoolProfile, isLoading: isSchoolLoading } = useQuery({
    queryKey: ['school-profile'],
    queryFn: async () => {
      const res = await api.get('/school/profile');
      return res.data?.data;
    },
  });

  // ── 2. FETCH SCHOOL GALLERY ───────────────────────────────────────────────
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isAddPhotoModalOpen, setIsAddPhotoModalOpen] = useState(false);
  const [photoCategoryFilter, setPhotoCategoryFilter] = useState('ALL');
  const [newPhoto, setNewPhoto] = useState<Omit<GalleryItem, 'id'>>({
    title: '',
    caption: '',
    category: 'Campus',
    imageUrl: '',
  });

  const { data: galleryData, isLoading: isGalleryLoading } = useQuery({
    queryKey: ['school-gallery'],
    queryFn: async () => {
      const res = await api.get('/school/gallery');
      return res.data?.data || [];
    },
  });

  useEffect(() => {
    if (galleryData && galleryData.length > 0) {
      setGalleryItems(galleryData);
    } else if (schoolProfile?.galleryJson) {
      try {
        const parsed = JSON.parse(schoolProfile.galleryJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGalleryItems(parsed);
        }
      } catch (e) {}
    }
  }, [galleryData, schoolProfile]);

  // Save Gallery Mutation
  const saveGalleryMutation = useMutation({
    mutationFn: async (items: GalleryItem[]) => {
      const res = await api.post('/school/gallery', { gallery: items });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Photo gallery saved and published to public website!');
      queryClient.invalidateQueries({ queryKey: ['school-gallery'] });
      queryClient.invalidateQueries({ queryKey: ['school-profile'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save photo gallery.');
    },
  });

  // Upload Photo File Handler
  const handlePhotoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    setIsUploadingPhoto(true);
    try {
      const res = await api.post('/school/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.url) {
        setNewPhoto((prev) => ({ ...prev, imageUrl: res.data.url }));
        toast.success('Photo uploaded to server successfully!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Add Photo to Gallery List & Auto-save
  const handleAddPhotoSubmit = () => {
    if (!newPhoto.imageUrl.trim()) {
      toast.error('Please upload an image or enter an Image URL');
      return;
    }
    if (!newPhoto.title.trim()) {
      toast.error('Please enter a title for the photo');
      return;
    }
    const newItem: GalleryItem = {
      id: Date.now(),
      title: newPhoto.title.trim(),
      caption: newPhoto.caption.trim(),
      category: newPhoto.category || 'Campus',
      imageUrl: newPhoto.imageUrl.trim(),
    };
    const updated = [newItem, ...galleryItems];
    setGalleryItems(updated);
    saveGalleryMutation.mutate(updated);
    setIsAddPhotoModalOpen(false);
    setNewPhoto({ title: '', caption: '', category: 'Campus', imageUrl: '' });
  };

  const handleDeletePhoto = (id: number) => {
    if (window.confirm('Are you sure you want to remove this photo from the public website gallery?')) {
      const updated = galleryItems.filter((item) => item.id !== id);
      setGalleryItems(updated);
      saveGalleryMutation.mutate(updated);
      toast.success('Photo removed from gallery.');
    }
  };

  const handleMovePhoto = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= galleryItems.length) return;
    const newItems = [...galleryItems];
    const temp = newItems[index];
    newItems[index] = newItems[targetIdx];
    newItems[targetIdx] = temp;
    setGalleryItems(newItems);
    saveGalleryMutation.mutate(newItems);
  };

  // ── 3. FETCH ADMISSION INQUIRIES ──────────────────────────────────────────
  const [inquirySearch, setInquirySearch] = useState('');
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState('ALL');

  const { data: admissionsData, isLoading: isAdmissionsLoading } = useQuery({
    queryKey: ['admissions-list', inquiryStatusFilter],
    queryFn: async () => {
      const res = await api.get('/admissions', {
        params: {
          status: inquiryStatusFilter !== 'ALL' ? inquiryStatusFilter : undefined,
          limit: 100,
        },
      });
      return res.data;
    },
  });

  // ── 4. FETCH NOTICES ──────────────────────────────────────────────────────
  const { data: noticesData, isLoading: isNoticesLoading } = useQuery({
    queryKey: ['all-notices'],
    queryFn: async () => {
      const res = await api.get('/notices');
      return res.data?.data || [];
    },
  });

  // ── BRANDING FORM STATE ───────────────────────────────────────────────────
  const [brandingForm, setBrandingForm] = useState({
    name: 'Brindawan Public School',
    nameNepali: 'बृन्दावन पब्लिक स्कूल',
    address: 'Brindaban Municipality-02, Rautahat, Madhesh Province, Nepal',
    district: 'Rautahat',
    province: 'Madhesh Province',
    emisCode: 'BPS-320160',
    phone: '+977 9845000000',
    email: 'info@bps.edu.np',
    website: 'https://bps.edu.np',
    level: 'Playgroup to Class 5 (Pre-Primary & Primary)',
    type: 'Private English Medium School',
    estYear: '2075',
    principalName: 'Premlal Prasad Raut',
    heroTagline: 'Nurturing Young Minds · Inspiring Excellence · Building Strong Character & Foundation',
    vision: 'To deliver high-quality, inclusive, and child-centered holistic education from early childhood through primary schooling.',
    mission: 'Empower students with 21st-century foundational literacy, numeracy, creative thinking, moral values, and joyful learning.',
    aboutText: 'Brindawan Public School is a premier private educational institution located in Brindaban-02, Rautahat. We take pride in providing a safe, joyful, and technologically enriched atmosphere tailored for foundational excellence.',
  });

  useEffect(() => {
    if (schoolProfile) {
      setBrandingForm({
        name: schoolProfile.name || 'Brindawan Public School',
        nameNepali: schoolProfile.nameNepali || 'बृन्दावन पब्लिक स्कूल',
        address: schoolProfile.address || 'Brindaban Municipality-02, Rautahat, Madhesh Province, Nepal',
        district: schoolProfile.district || 'Rautahat',
        province: schoolProfile.province || 'Madhesh Province',
        emisCode: schoolProfile.emisCode || 'BPS-320160',
        phone: schoolProfile.phone || '+977 9845000000',
        email: schoolProfile.email || 'info@bps.edu.np',
        website: schoolProfile.website || 'https://bps.edu.np',
        level: schoolProfile.level || 'Playgroup to Class 5 (Pre-Primary & Primary)',
        type: schoolProfile.type || 'Private English Medium School',
        estYear: schoolProfile.estYear || '2075',
        principalName: schoolProfile.principalName || 'Premlal Prasad Raut',
        heroTagline: schoolProfile.heroTagline || 'Nurturing Young Minds · Inspiring Excellence · Building Strong Character & Foundation',
        vision: schoolProfile.vision || 'To deliver high-quality, inclusive, and child-centered holistic education from early childhood through primary schooling.',
        mission: schoolProfile.mission || 'Empower students with 21st-century foundational literacy, numeracy, creative thinking, moral values, and joyful learning.',
        aboutText: schoolProfile.aboutText || 'Brindawan Public School is a premier private educational institution located in Brindaban-02, Rautahat. We take pride in providing a safe, joyful, and technologically enriched atmosphere tailored for foundational excellence.',
      });
    }
  }, [schoolProfile]);

  // Save Branding Mutation
  const saveBrandingMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/school/profile', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Public website & school profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['school-profile'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update school profile.');
    },
  });

  // ── NOTICE MODAL STATE & MUTATION ─────────────────────────────────────────
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [noticeType, setNoticeType] = useState('GENERAL');
  const [noticeTargetRole, setNoticeTargetRole] = useState('ALL');
  const [noticeDateBs, setNoticeDateBs] = useState(todayBS());

  const createNoticeMutation = useMutation({
    mutationFn: async () => {
      if (!noticeTitle.trim()) throw new Error('Notice title is required.');
      const res = await api.post('/notices', {
        title: noticeTitle.trim(),
        body: noticeBody.trim(),
        type: noticeType,
        targetRole: noticeTargetRole,
        postedDateBs: noticeDateBs,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Public notice published successfully!');
      setIsNoticeModalOpen(false);
      setNoticeTitle('');
      setNoticeBody('');
      queryClient.invalidateQueries({ queryKey: ['all-notices'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to publish notice.');
    },
  });

  const deleteNoticeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/notices/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Notice removed successfully.');
      queryClient.invalidateQueries({ queryKey: ['all-notices'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete notice.');
    },
  });

  // Update Application Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await api.put(`/admissions/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Application status updated.');
      queryClient.invalidateQueries({ queryKey: ['admissions-list'] });
    },
  });

  const applications = admissionsData?.data || [];
  const filteredApplications = applications.filter((app: any) => {
    const q = inquirySearch.toLowerCase();
    return (
      app.studentName?.toLowerCase().includes(q) ||
      app.guardianName?.toLowerCase().includes(q) ||
      app.guardianContact?.includes(q) ||
      app.applicationNo?.toLowerCase().includes(q) ||
      app.desiredClass?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-16">
      {/* ── TOP HEADER WITH LIVE STATUS & DIRECT ACTIONS ───────────────────── */}
      <div className="rounded-2xl bg-linear-to-r from-[#1e3a5f] via-[#244772] to-[#1e3a5f] p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-0.5 text-xs font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Dynamic Website Connected
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-mono text-blue-200">
                bps.edu.np
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-black mt-2 font-serif">
              Website & Public Portal Management (वेबसाइट व्यवस्थापन)
            </h1>
            <p className="text-xs text-blue-200 mt-1 max-w-2xl">
              Control the live public website of <strong>Brindawan Public School</strong> directly from the admin panel. Manage homepage branding, review online admission inquiries, and post school notices instantly.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-[#1e3a5f] rounded-xl text-xs font-extrabold shadow-sm transition"
            >
              <Eye size={14} />
              <span>Preview Live Website</span>
              <ExternalLink size={12} />
            </Link>

            <Link
              href="/admission"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold border border-white/20 transition"
            >
              <GraduationCap size={14} />
              <span>Admission Portal</span>
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-5 mt-5 border-t border-white/15">
          <button
            onClick={() => setActiveTab('branding')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-2xs ${
              activeTab === 'branding'
                ? 'bg-amber-400 text-[#1e3a5f]'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Building2 size={14} />
            <span>School Profile & Website Branding (ब्रान्डिङ तथा विवरण)</span>
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-2xs ${
              activeTab === 'gallery'
                ? 'bg-amber-400 text-[#1e3a5f]'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Camera size={14} />
            <span>Photo Gallery & Media (फोटो ग्यालेरी)</span>
            <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-mono">
              {galleryItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('inquiries')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-2xs ${
              activeTab === 'inquiries'
                ? 'bg-amber-400 text-[#1e3a5f]'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <MessageSquare size={14} />
            <span>Online Admission Inquiries (अनलाइन भर्ना आवेदनहरू)</span>
            <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-mono">
              {admissionsData?.stats?.total || applications.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('notices')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-2xs ${
              activeTab === 'notices'
                ? 'bg-amber-400 text-[#1e3a5f]'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Bell size={14} />
            <span>Public Notices & Circulars (वेबसाइट सूचनाहरू)</span>
            <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-mono">
              {noticesData?.length || 0}
            </span>
          </button>
        </div>
      </div>

      {/* ─────────────────── TAB 1: BRANDING & HOMEPAGE CONTENT ──────────── */}
      {activeTab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Editing Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <h2 className="text-sm font-extrabold text-[#1e3a5f] flex items-center gap-2">
                  <Building2 size={18} className="text-blue-600" />
                  <span>General Identity & Contact Information</span>
                </h2>
                <span className="text-xs text-gray-400">Updates live on homepage instantly</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">School Name (English):</label>
                  <input
                    type="text"
                    value={brandingForm.name}
                    onChange={(e) => setBrandingForm({ ...brandingForm, name: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-2.5 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">School Name (नेपालीमा):</label>
                  <input
                    type="text"
                    value={brandingForm.nameNepali}
                    onChange={(e) => setBrandingForm({ ...brandingForm, nameNepali: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-2.5 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">School Address (ठेगाना):</label>
                  <input
                    type="text"
                    value={brandingForm.address}
                    onChange={(e) => setBrandingForm({ ...brandingForm, address: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-2.5"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">District & Province:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={brandingForm.district}
                      onChange={(e) => setBrandingForm({ ...brandingForm, district: e.target.value })}
                      placeholder="District"
                      className="w-full rounded-xl border border-gray-300 p-2.5"
                    />
                    <input
                      type="text"
                      value={brandingForm.province}
                      onChange={(e) => setBrandingForm({ ...brandingForm, province: e.target.value })}
                      placeholder="Province"
                      className="w-full rounded-xl border border-gray-300 p-2.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Official Phone Number:</label>
                  <input
                    type="text"
                    value={brandingForm.phone}
                    onChange={(e) => setBrandingForm({ ...brandingForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-2.5 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Official Email Address:</label>
                  <input
                    type="email"
                    value={brandingForm.email}
                    onChange={(e) => setBrandingForm({ ...brandingForm, email: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-2.5 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Official Website URL:</label>
                  <input
                    type="text"
                    value={brandingForm.website}
                    onChange={(e) => setBrandingForm({ ...brandingForm, website: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-2.5 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">School EMIS Code & Est. Year:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={brandingForm.emisCode}
                      onChange={(e) => setBrandingForm({ ...brandingForm, emisCode: e.target.value })}
                      placeholder="EMIS Code"
                      className="w-full rounded-xl border border-gray-300 p-2.5 font-mono font-bold"
                    />
                    <input
                      type="text"
                      value={brandingForm.estYear}
                      onChange={(e) => setBrandingForm({ ...brandingForm, estYear: e.target.value })}
                      placeholder="Est. Year (BS)"
                      className="w-full rounded-xl border border-gray-300 p-2.5 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Content & Messaging Section */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <h2 className="text-sm font-extrabold text-[#1e3a5f] flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-500" />
                  <span>Homepage Hero Tagline, Vision & Principal's Message</span>
                </h2>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Hero Banner Tagline / Slogan:</label>
                  <input
                    type="text"
                    value={brandingForm.heroTagline}
                    onChange={(e) => setBrandingForm({ ...brandingForm, heroTagline: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-2.5 font-medium text-gray-800"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">School Level & Grade Range:</label>
                    <input
                      type="text"
                      value={brandingForm.level}
                      onChange={(e) => setBrandingForm({ ...brandingForm, level: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Principal / Founder Name:</label>
                    <input
                      type="text"
                      value={brandingForm.principalName}
                      onChange={(e) => setBrandingForm({ ...brandingForm, principalName: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 p-2.5 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">School Vision Statement:</label>
                  <textarea
                    rows={2}
                    value={brandingForm.vision}
                    onChange={(e) => setBrandingForm({ ...brandingForm, vision: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-2.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">School Mission Statement:</label>
                  <textarea
                    rows={2}
                    value={brandingForm.mission}
                    onChange={(e) => setBrandingForm({ ...brandingForm, mission: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-2.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">About the School / Principal's Message:</label>
                  <textarea
                    rows={3}
                    value={brandingForm.aboutText}
                    onChange={(e) => setBrandingForm({ ...brandingForm, aboutText: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 p-2.5 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  disabled={saveBrandingMutation.isPending}
                  onClick={() => saveBrandingMutation.mutate(brandingForm)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition disabled:opacity-50"
                >
                  <Save size={15} />
                  <span>{saveBrandingMutation.isPending ? 'Saving Changes...' : 'Save & Publish to Website'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Preview Column */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-blue-100 bg-linear-to-b from-blue-50/70 to-slate-50 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                <span className="text-xs font-black uppercase text-[#1e3a5f] tracking-wider">
                  Live Homepage Preview
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  SYNCED
                </span>
              </div>

              <div className="rounded-xl bg-[#1e3a5f] p-4 text-white shadow-md space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  {brandingForm.level}
                </span>
                <h3 className="text-base font-black font-serif">{brandingForm.name}</h3>
                <p className="text-xs text-amber-200 font-nepali">{brandingForm.nameNepali}</p>
                <p className="text-[11px] text-blue-200 italic line-clamp-2">
                  "{brandingForm.heroTagline}"
                </p>
                <div className="pt-2 border-t border-blue-800/80 flex items-center justify-between text-[10px] text-blue-300">
                  <span>EMIS: {brandingForm.emisCode}</span>
                  <span>Est: {brandingForm.estYear} BS</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-2xs space-y-2 text-xs">
                <strong className="text-gray-900 block font-bold">Principal Message Preview</strong>
                <p className="text-gray-600 text-[11px] leading-relaxed line-clamp-3">
                  {brandingForm.aboutText}
                </p>
                <span className="text-[10px] text-blue-700 font-bold block pt-1">
                  — {brandingForm.principalName} (Principal)
                </span>
              </div>

              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-2xs space-y-1.5 text-xs text-gray-700">
                <div className="flex items-center gap-2">
                  <Phone size={13} className="text-blue-600 shrink-0" />
                  <span className="font-mono">{brandingForm.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={13} className="text-blue-600 shrink-0" />
                  <span className="font-mono">{brandingForm.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={13} className="text-blue-600 shrink-0" />
                  <span className="truncate">{brandingForm.address}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── TAB: PHOTO GALLERY & MEDIA ──────────────────── */}
      {activeTab === 'gallery' && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white border border-gray-100 p-5 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <Camera size={20} className="text-amber-500" />
                <h2 className="text-base font-extrabold text-[#1e3a5f]">
                  Public Photo Gallery & Media (फोटो ग्यालेरी व्यवस्थापन)
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Upload school pictures, choose categories (Campus, Classrooms, Facilities, Sports, Activities), add titles & captions. Every change updates the public website immediately.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddPhotoModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#1e3a5f] hover:bg-[#2a5280] text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                <Plus size={15} />
                <span>Add Photo (नयाँ फोटो थप्नुहोस्)</span>
              </button>

              <button
                type="button"
                disabled={saveGalleryMutation.isPending}
                onClick={() => saveGalleryMutation.mutate(galleryItems)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-sm transition"
              >
                <Save size={15} />
                <span>{saveGalleryMutation.isPending ? 'Publishing...' : 'Save & Publish Gallery'}</span>
              </button>
            </div>
          </div>

          {/* Category Filter Pills & Stats */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-2xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-gray-500 mr-1">Filter:</span>
              {['ALL', 'Campus', 'Classrooms', 'Facilities', 'Sports', 'Activities'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setPhotoCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    photoCategoryFilter === cat
                      ? 'bg-[#1e3a5f] text-white shadow-2xs'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {cat === 'ALL' ? 'All Photos' : cat}
                  <span className="ml-1 text-[10px] opacity-70">
                    ({cat === 'ALL' ? galleryItems.length : galleryItems.filter((i) => i.category === cat).length})
                  </span>
                </button>
              ))}
            </div>

            <span className="text-xs font-mono text-gray-400">
              Total {galleryItems.length} photos in gallery
            </span>
          </div>

          {/* Photos Grid */}
          {galleryItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <ImageIcon size={32} />
              </div>
              <h3 className="text-sm font-bold text-gray-800">No photos in the gallery yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Upload pictures from school events, campus facilities, classrooms, and student activities to showcase them on the public portal.
              </p>
              <button
                onClick={() => setIsAddPhotoModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1e3a5f] text-white text-xs font-bold rounded-xl shadow-sm"
              >
                <Plus size={14} />
                <span>Upload First Photo</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {galleryItems
                .filter((item) => photoCategoryFilter === 'ALL' || item.category === photoCategoryFilter)
                .map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col justify-between group"
                  >
                    <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        onError={(e: any) => {
                          e.target.src = 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                      <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#0a3d31]/85 text-emerald-300 backdrop-blur-xs border border-emerald-400/30">
                        {item.category}
                      </span>
                    </div>

                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 leading-snug line-clamp-1">{item.title}</h4>
                        {item.caption && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{item.caption}</p>
                        )}
                      </div>

                      <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMovePhoto(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-20 transition"
                            title="Move Earlier"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMovePhoto(idx, 'down')}
                            disabled={idx === galleryItems.length - 1}
                            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-20 transition"
                            title="Move Later"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(item.id)}
                          className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-bold p-1 rounded hover:bg-rose-50 transition"
                          title="Remove Photo"
                        >
                          <Trash2 size={13} />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────── TAB: ADMISSION INQUIRIES & LEADS ───────────── */}
      {activeTab === 'inquiries' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-gray-500 block">Total Applications</span>
              <p className="text-2xl font-black font-mono text-[#1e3a5f] mt-0.5">
                {admissionsData?.stats?.total || applications.length}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-amber-700 block">Pending Inquiries</span>
              <p className="text-2xl font-black font-mono text-amber-600 mt-0.5">
                {admissionsData?.stats?.pending || 0}
              </p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-blue-700 block">Approved</span>
              <p className="text-2xl font-black font-mono text-blue-600 mt-0.5">
                {admissionsData?.stats?.approved || 0}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-emerald-700 block">Admitted to School</span>
              <p className="text-2xl font-black font-mono text-emerald-700 mt-0.5">
                {admissionsData?.stats?.admitted || 0}
              </p>
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
              <div className="flex items-center gap-2">
                <Search size={16} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by student, guardian, phone or app #..."
                  value={inquirySearch}
                  onChange={(e) => setInquirySearch(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs w-64 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-bold">Status:</span>
                <div className="flex gap-1">
                  {['ALL', 'PENDING', 'APPROVED', 'ADMITTED', 'REJECTED'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setInquiryStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                        inquiryStatusFilter === st
                          ? 'bg-[#1e3a5f] text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1e3a5f] text-white uppercase font-bold">
                  <tr>
                    <th className="px-4 py-3">App No</th>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Desired Class</th>
                    <th className="px-4 py-3">Guardian / Parent</th>
                    <th className="px-4 py-3">Contact Phone</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isAdmissionsLoading ? (
                    <tr><td colSpan={8} className="p-6 text-center text-gray-400">Loading inquiries...</td></tr>
                  ) : filteredApplications.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-400">
                        No admission applications found.
                      </td>
                    </tr>
                  ) : (
                    filteredApplications.map((app: any) => (
                      <tr key={app.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono font-bold text-blue-900">
                          {app.applicationNo}
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900">
                          {app.studentName}
                          {app.studentNameNepali && <span className="text-[10px] text-gray-500 font-normal block font-nepali">{app.studentNameNepali}</span>}
                        </td>
                        <td className="px-4 py-3 font-bold text-[#1e3a5f]">
                          <span className="rounded-md bg-blue-50 text-blue-700 px-2 py-0.5 border border-blue-200">
                            {app.desiredClass}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {app.guardianName || app.fatherName || '—'}
                          <span className="text-[10px] text-gray-400 block">{app.guardianRelation || 'Parent'}</span>
                        </td>
                        <td className="px-4 py-3 font-mono">
                          <a
                            href={`tel:${app.guardianContact}`}
                            className="text-emerald-700 hover:text-emerald-800 font-bold inline-flex items-center gap-1"
                          >
                            <Phone size={12} />
                            <span>{app.guardianContact}</span>
                          </a>
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-500">
                          {app.appliedDateBs || app.createdAt?.slice(0, 10)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                              app.status === 'ADMITTED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : app.status === 'APPROVED'
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : app.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {app.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {app.status !== 'ADMITTED' && (
                              <Link
                                href={`/dashboard/admissions`}
                                className="px-2 py-1 rounded-lg bg-[#1e3a5f] hover:bg-[#2a5280] text-white text-[11px] font-bold shadow-2xs"
                              >
                                Admit
                              </Link>
                            )}
                            {app.status === 'PENDING' && (
                              <button
                                onClick={() => updateStatusMutation.mutate({ id: app.id, status: 'APPROVED' })}
                                className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold"
                              >
                                Approve
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
          </div>
        </div>
      )}

      {/* ─────────────────── TAB 3: PUBLIC NOTICES & CIRCULARS ───────────── */}
      {activeTab === 'notices' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-2xl bg-white border border-gray-100 p-4 shadow-xs">
            <div>
              <h2 className="text-sm font-extrabold text-[#1e3a5f] flex items-center gap-2">
                <Bell size={18} className="text-amber-500" />
                <span>Public School Notices (वेबसाइट सूचनाहरू)</span>
              </h2>
              <p className="text-xs text-gray-500">Notices published here appear on the website and parent portal</p>
            </div>

            <button
              onClick={() => setIsNoticeModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1e3a5f] hover:bg-[#2a5280] text-white rounded-xl text-xs font-bold shadow-2xs transition"
            >
              <Plus size={14} />
              <span>Create New Notice (सूचना प्रकाशित गर्नुहोस्)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isNoticesLoading ? (
              <p className="col-span-3 text-center text-xs text-gray-400 py-8">Loading notices...</p>
            ) : noticesData.length === 0 ? (
              <p className="col-span-3 text-center text-xs text-gray-400 py-8">No notices published yet.</p>
            ) : (
              noticesData.map((n: any) => (
                <div key={n.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[10px] font-black uppercase">
                        {n.type || 'GENERAL'}
                      </span>
                      <span className="font-mono text-xs text-gray-400">{n.postedDateBs} BS</span>
                    </div>

                    <h3 className="text-sm font-bold text-gray-900 leading-snug">{n.title}</h3>
                    <p className="text-xs text-gray-600 line-clamp-4 leading-relaxed">{n.body}</p>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px]">
                    <span className="text-gray-400 font-medium">Target: {n.targetRole || 'ALL'}</span>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete notice "${n.title}"?`)) {
                          deleteNoticeMutation.mutate(n.id);
                        }
                      }}
                      className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition"
                      title="Delete Notice"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── CREATE NOTICE MODAL ────────────────────────────────────────────── */}
      {isNoticeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-[#1e3a5f]">Publish New Public Notice</h3>
              <button onClick={() => setIsNoticeModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Notice Title (सूचनाको शीर्षक):</label>
                <input
                  type="text"
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  placeholder="e.g. Admission Open for Session 2083-84 / Term Exam Schedule"
                  className="w-full rounded-xl border border-gray-300 p-2 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Notice Type:</label>
                  <select
                    value={noticeType}
                    onChange={(e) => setNoticeType(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 p-2 text-xs bg-white"
                  >
                    <option value="GENERAL">General (सामान्य)</option>
                    <option value="EXAM">Examination (परीक्षा)</option>
                    <option value="EVENT">School Event (कार्यक्रम)</option>
                    <option value="HOLIDAY">Holiday (बिदा)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Publish Date (BS):</label>
                  <input
                    type="text"
                    value={noticeDateBs}
                    onChange={(e) => setNoticeDateBs(formatDateInput(e.target.value))}
                    className="w-full rounded-xl border border-gray-300 p-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Target Audience:</label>
                <select
                  value={noticeTargetRole}
                  onChange={(e) => setNoticeTargetRole(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2 text-xs bg-white"
                >
                  <option value="ALL">All (Public, Parents & Students)</option>
                  <option value="STUDENT">Students & Parents Only</option>
                  <option value="TEACHER">Staff & Teachers Only</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Notice Content / Description (विवरण):</label>
                <textarea
                  rows={4}
                  value={noticeBody}
                  onChange={(e) => setNoticeBody(e.target.value)}
                  placeholder="Write the full notice announcement here..."
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsNoticeModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={createNoticeMutation.isPending || !noticeTitle.trim()}
                onClick={() => createNoticeMutation.mutate()}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#1e3a5f] hover:bg-[#2a5280] text-white shadow-md disabled:opacity-50 transition"
              >
                {createNoticeMutation.isPending ? 'Publishing...' : 'Publish Notice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD PHOTO MODAL ────────────────────────────────────────────────── */}
      {isAddPhotoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Camera size={20} className="text-[#1e3a5f]" />
                <h3 className="text-base font-bold text-[#1e3a5f]">Add New Photo to Website Gallery</h3>
              </div>
              <button
                onClick={() => setIsAddPhotoModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Image Preview & Upload Option */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Upload Photo from Computer (वा इन्टरनेट लिंक राख्नुहोस्):
                </label>

                <div className="flex flex-col sm:flex-row gap-3 items-start">
                  <label className="flex-1 w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl p-4 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/20 transition">
                    <Upload size={24} className="text-emerald-600 mb-1" />
                    <span className="text-xs font-bold text-gray-700">
                      {isUploadingPhoto ? 'Uploading photo...' : 'Choose image file to upload'}
                    </span>
                    <span className="text-[10px] text-gray-400">JPG, PNG, WebP up to 15MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoFileUpload}
                      disabled={isUploadingPhoto}
                      className="hidden"
                    />
                  </label>

                  {newPhoto.imageUrl && (
                    <div className="w-28 h-24 rounded-xl overflow-hidden border border-gray-200 shrink-0 relative">
                      <img
                        src={newPhoto.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-2">
                  <span className="text-[10px] text-gray-500 font-bold block mb-0.5">Or Paste Direct Image URL:</span>
                  <input
                    type="text"
                    value={newPhoto.imageUrl}
                    onChange={(e) => setNewPhoto({ ...newPhoto, imageUrl: e.target.value })}
                    placeholder="e.g. /uploads/bps-... or https://images.unsplash.com/..."
                    className="w-full rounded-xl border border-gray-300 p-2 font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Photo Title (फोटोको शीर्षक) *:</label>
                <input
                  type="text"
                  value={newPhoto.title}
                  onChange={(e) => setNewPhoto({ ...newPhoto, title: e.target.value })}
                  placeholder="e.g. Annual Sports Day 100m Race / Digital Classroom Session"
                  className="w-full rounded-xl border border-gray-300 p-2 text-xs font-semibold"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Category (विधा):</label>
                <select
                  value={newPhoto.category}
                  onChange={(e) => setNewPhoto({ ...newPhoto, category: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 p-2 text-xs bg-white font-semibold"
                >
                  <option value="Campus">Campus (विद्यालय परिसर)</option>
                  <option value="Classrooms">Classrooms (कक्षाकोठा तथा शिक्षण)</option>
                  <option value="Facilities">Facilities (सुविधाहरू, ल्याब, पुस्तकालय)</option>
                  <option value="Sports">Sports (खेलकुद तथा दौड)</option>
                  <option value="Activities">Activities (सांस्कृतिक तथा अतिरिक्त क्रियाकलाप)</option>
                  <option value="Events">Events (विशेष समारोह तथा उत्सव)</option>
                </select>
              </div>

              {/* Caption */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Short Description / Caption (कैप्सन):</label>
                <textarea
                  rows={2}
                  value={newPhoto.caption}
                  onChange={(e) => setNewPhoto({ ...newPhoto, caption: e.target.value })}
                  placeholder="e.g. Students participating in friendly competition and teamwork on the playground."
                  className="w-full rounded-xl border border-gray-300 p-2 text-xs leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsAddPhotoModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddPhotoSubmit}
                disabled={!newPhoto.imageUrl || !newPhoto.title}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#1e3a5f] hover:bg-[#2a5280] text-white shadow-md disabled:opacity-50 transition"
              >
                Add & Publish Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
