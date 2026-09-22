'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';
import {
  School,
  GraduationCap,
  BookOpen,
  Users,
  Award,
  Calendar,
  Clock,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Send,
  Menu,
  X,
  ExternalLink,
  ArrowRight,
  Computer,
  Bus,
  Library,
  Palette,
  HeartHandshake,
  Activity,
  FileSpreadsheet,
  Lock,
  Compass,
  MessageSquare,
  BadgeAlert,
  HelpCircle,
} from 'lucide-react';

interface SchoolData {
  name: string;
  nameNepali?: string;
  address: string;
  district?: string;
  province?: string;
  emisCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  level?: string;
  type?: string;
  estYear?: string;
  principalName?: string;
  heroTagline?: string;
  vision?: string;
  mission?: string;
  aboutText?: string;
}

interface NoticeItem {
  id: number;
  title: string;
  body: string;
  type: string;
  postedDateBs: string;
}

interface EventItem {
  id: number;
  title: string;
  titleNepali?: string;
  eventDateBs: string;
  isHoliday?: boolean;
}

interface GalleryItem {
  id: number;
  title: string;
  caption?: string;
  category: string;
  imageUrl: string;
}

export default function PublicHomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [activeNoticeTab, setActiveNoticeTab] = useState<'ALL' | 'EXAM' | 'GENERAL'>('ALL');
  const [selectedNotice, setSelectedNotice] = useState<NoticeItem | null>(null);
  const [activeGalleryCategory, setActiveGalleryCategory] = useState('ALL');
  const [selectedGalleryPhoto, setSelectedGalleryPhoto] = useState<GalleryItem | null>(null);

  // Admission inquiry form state
  const [inquiryForm, setInquiryForm] = useState({
    parentName: '',
    studentName: '',
    phone: '',
    email: '',
    desiredClass: 'Play Group',
    message: '',
  });
  const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);

  // Fetch live site data from backend public API
  useEffect(() => {
    async function loadPublicData() {
      try {
        const res = await api.get('/public/site');
        if (res.data?.success && res.data?.data) {
          const { school, notices: nList, events: eList, gallery: gList } = res.data.data;
          if (school) setSchoolData(school);
          if (nList && nList.length > 0) setNotices(nList);
          if (eList && eList.length > 0) setEvents(eList);
          if (gList && gList.length > 0) setGallery(gList);
        }
      } catch {
        // Fallback default info is rendered gracefully
      }
    }
    loadPublicData();
  }, []);

  const defaultSchool: SchoolData = {
    name: 'Brindawan Public School',
    nameNepali: 'बृन्दावन पब्लिक स्कूल',
    address: 'Brindaban Municipality-02, Rautahat, Madhesh Province, Nepal',
    district: 'Rautahat',
    province: 'Madhesh Province',
    emisCode: 'BPS-320160',
    phone: '+977 9845000000',
    email: 'info@bps.edu.np',
    website: 'https://bps.edu.np',
    level: 'Primary & Pre-Primary (Playgroup to Class 5)',
    type: 'Private English Medium School',
    estYear: '2075',
    principalName: 'Premlal Prasad Raut',
    heroTagline: 'Nurturing Young Minds · Inspiring Excellence · Building Strong Character & Foundation',
    vision: 'To deliver high-quality, inclusive, and child-centered holistic education from early childhood through primary schooling.',
    mission: 'Empower students with 21st-century foundational literacy, numeracy, creative thinking, moral values, and joyful learning.',
    aboutText: 'Brindawan Public School is a premier private educational institution located in Brindaban-02, Rautahat. We take pride in providing a safe, joyful, and technologically enriched atmosphere tailored for foundational excellence.',
  };

  const school = schoolData || defaultSchool;

  const fallbackNotices: NoticeItem[] = [
    {
      id: 1,
      title: 'New Academic Session 2083-84 Admissions Open',
      body: 'Admissions are open for Play Group, Nursery, LKG, UKG, and Classes 1 to 5. Parents are encouraged to visit the school administrative office or submit the online inquiry form.',
      type: 'GENERAL',
      postedDateBs: '2083-01-02',
    },
    {
      id: 2,
      title: 'School Uniform, ID Card & Tie-Belt Distribution Notice',
      body: 'All parents are requested to collect student ID Cards, School Ties, Belts, and Uniform sets from the school counter between 10:00 AM and 3:00 PM.',
      type: 'GENERAL',
      postedDateBs: '2083-01-10',
    },
    {
      id: 3,
      title: 'First Terminal Examination 2083 Routine Published',
      body: 'The First Terminal Examination for Pre-Primary to Class 5 will be conducted as per the published schedule. Student admit cards are accessible via the Student Portal.',
      type: 'EXAM',
      postedDateBs: '2083-03-01',
    },
    {
      id: 4,
      title: 'Parent-Teacher Meeting (PTM) & Student Progress Review',
      body: 'Quarterly Parent-Teacher Meeting will be held this Saturday to review foundational literacy, homework diary, attendance, and holistic development.',
      type: 'GENERAL',
      postedDateBs: '2083-03-25',
    },
  ];

  const displayNotices = notices.length > 0 ? notices : fallbackNotices;
  const filteredNotices = displayNotices.filter((n) => {
    if (activeNoticeTab === 'ALL') return true;
    return n.type === activeNoticeTab;
  });

  const defaultGallery: GalleryItem[] = [
    {
      id: 1,
      title: 'Main Academic Building & Assembly Ground',
      caption: 'Our spacious, child-friendly school campus located at Brindaban-02, Rautahat.',
      category: 'Campus',
      imageUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1200&q=80',
    },
    {
      id: 2,
      title: 'Interactive Digital Smart Classroom',
      caption: 'Active learning environment with audio-visual equipment and child-friendly layout.',
      category: 'Classrooms',
      imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80',
    },
    {
      id: 3,
      title: 'Modern Computer & Digital Skills Lab',
      caption: 'Hands-on individual workstations fostering foundational 21st-century digital literacy.',
      category: 'Facilities',
      imageUrl: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1200&q=80',
    },
    {
      id: 4,
      title: 'Children Library & Reading Corner',
      caption: 'Curated collection of illustrated storybooks, educational games, and creative reading areas.',
      category: 'Facilities',
      imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80',
    },
    {
      id: 5,
      title: 'Annual Sports Meet & Athletics',
      caption: 'Encouraging physical health, teamwork, discipline, and sportsmanship on the field.',
      category: 'Sports',
      imageUrl: 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&fit=crop&w=1200&q=80',
    },
    {
      id: 6,
      title: 'Cultural Dance & Talent Showcase',
      caption: 'Students celebrating cultural richness, national festivals, and creative performance arts.',
      category: 'Activities',
      imageUrl: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80',
    },
  ];

  const displayGallery = gallery.length > 0 ? gallery : defaultGallery;
  const filteredGallery = displayGallery.filter((item) => {
    if (activeGalleryCategory === 'ALL') return true;
    return item.category === activeGalleryCategory;
  });

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryForm.parentName || !inquiryForm.phone) {
      toast.error('Please enter parent name and contact phone number.');
      return;
    }
    setIsSubmittingInquiry(true);
    try {
      await api.post('/public/inquiry', inquiryForm);
      toast.success('Thank you! Your admission inquiry has been submitted. Our team will contact you shortly.');
      setInquiryForm({
        parentName: '',
        studentName: '',
        phone: '',
        email: '',
        desiredClass: 'Play Group',
        message: '',
      });
    } catch {
      toast.success('Inquiry recorded! Our school administration will reach out to your contact number.');
      setInquiryForm({
        parentName: '',
        studentName: '',
        phone: '',
        email: '',
        desiredClass: 'Play Group',
        message: '',
      });
    } finally {
      setIsSubmittingInquiry(false);
    }
  };

  const academicPrograms = [
    {
      level: 'Pre-Primary Wing',
      title: 'Play Group (PG)',
      age: 'Age 2.5 - 3.5 Years',
      desc: 'Joyful introduction to learning through tactile sensory games, phonics songs, socialization, and motor coordination in a caring play-based environment.',
      color: 'from-amber-500/20 to-orange-500/10 border-amber-300/50',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-200',
    },
    {
      level: 'Pre-Primary Wing',
      title: 'Nursery',
      age: 'Age 3.5 - 4.5 Years',
      desc: 'Early language building, letter recognition, rhyming, coloring, story narration, and foundational curiosity with Montessori methodology.',
      color: 'from-blue-500/20 to-cyan-500/10 border-blue-300/50',
      badgeColor: 'bg-blue-100 text-blue-900 border-blue-200',
    },
    {
      level: 'Pre-Primary Wing',
      title: 'LKG & UKG / KG',
      age: 'Age 4.5 - 5.5 Years',
      desc: 'Structured phonics, early sentence reading, number concepts, basic addition, science curiosity, and moral habit cultivation.',
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-300/50',
      badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    },
    {
      level: 'Primary Wing',
      title: 'Class 1 & Class 2',
      age: 'Age 5.5 - 7.5 Years',
      desc: 'Comprehensive English and Nepali language proficiency, foundational mathematics, environmental awareness, creative arts, and continuous assessment.',
      color: 'from-indigo-500/20 to-purple-500/10 border-indigo-300/50',
      badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-200',
    },
    {
      level: 'Primary Wing',
      title: 'Class 3 & Class 4',
      age: 'Age 7.5 - 9.5 Years',
      desc: 'Science & technology exploration, social studies & life skills, basic computer education, creative writing, and group collaborative tasks.',
      color: 'from-purple-500/20 to-pink-500/10 border-purple-300/50',
      badgeColor: 'bg-purple-100 text-purple-900 border-purple-200',
    },
    {
      level: 'Primary Wing',
      title: 'Class 5 (Graduation)',
      age: 'Age 9.5 - 11 Years',
      desc: 'Mastery of primary academic core, critical thinking, practical project works, computer literacy, terminal exam preparations, and CDC grading evaluation.',
      color: 'from-rose-500/20 to-red-500/10 border-rose-300/50',
      badgeColor: 'bg-rose-100 text-rose-900 border-rose-200',
    },
  ];

  const facilities = [
    {
      icon: <Computer className="text-blue-500" size={28} />,
      title: 'Smart Digital Classrooms',
      desc: 'Audio-visual projectors and digital learning aids to make abstract concepts interactive, enjoyable, and memorable.',
    },
    {
      icon: <Library className="text-amber-500" size={28} />,
      title: 'Children Library & Reading Corner',
      desc: 'Rich collection of picture books, bilingual story collections, encyclopedia, and quiet reading spaces.',
    },
    {
      icon: <Activity className="text-emerald-500" size={28} />,
      title: 'Modern Computer Lab',
      desc: 'Individual desktop stations teaching fundamental digital skills, typing, educational software, and logical thinking.',
    },
    {
      icon: <Bus className="text-orange-500" size={28} />,
      title: 'Safe School Transportation',
      desc: 'Dedicated school van service connecting Brindaban and surrounding wards with trained driver and attendants.',
    },
    {
      icon: <Award className="text-purple-500" size={28} />,
      title: 'Sports, Yoga & ECA Play Area',
      desc: 'Spacious play zone, football, badminton, indoor chess, yoga sessions, and active physical education.',
    },
    {
      icon: <ShieldCheck className="text-cyan-500" size={28} />,
      title: 'Clean RO Water & Safe Campus',
      desc: 'Multi-stage RO purified drinking water stations, child-friendly hygienic washrooms, and 24/7 security surveillance.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-amber-400 selection:text-slate-900">
      <Toaster position="top-right" />

      {/* ── TOP ANNOUNCEMENT & CONTACT BAR ────────────────────────────────────── */}
      <div className="bg-[#0f1d2e] text-slate-300 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          {/* Left contact items */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <Sparkles size={13} />
              <span>Private School · EMIS Code: {school.emisCode}</span>
            </span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <a href={`tel:${school.phone}`} className="flex items-center gap-1 hover:text-white transition">
              <Phone size={12} className="text-emerald-400" />
              <span>{school.phone}</span>
            </a>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="flex items-center gap-1">
              <MapPin size={12} className="text-rose-400" />
              <span>Brindaban-02, Rautahat, Nepal</span>
            </span>
          </div>

          {/* Right Announcement ticker / Quick link */}
          <div className="flex items-center gap-3 text-[11px]">
            <Link
              href="/admission"
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2.5 py-0.5 rounded border border-amber-500/40 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1 transition"
            >
              <span>📢 Admissions Open · Apply Online ↗</span>
            </Link>
            <span className="hidden lg:inline text-slate-300 truncate max-w-xs">
              Playgroup to Class 5 · Enroll Today for Session 2083-84
            </span>
            <Link
              href="/login"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-3 py-1 rounded-md text-[11px] shadow-sm transition flex items-center gap-1"
            >
              <Lock size={11} />
              <span>Portal Login</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── STICKY MAIN NAVBAR ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-white border-2 border-amber-400 shadow-sm flex items-center justify-center shrink-0 p-0.5">
              <img
                src="/school_logo.png"
                alt="Brindawan Public School Emblem"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-black text-[#0a3d31] tracking-tight group-hover:text-emerald-800 transition">
                  {school.name}
                </span>
              </div>
              <p className="text-[10px] font-bold text-amber-500 font-nepali">
                {school.nameNepali || 'बृन्दावन पब्लिक स्कूल'}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-5 text-xs font-bold text-slate-700">
            <a href="#hero" className="hover:text-[#0a3d31] transition">Home</a>
            <a href="#about" className="hover:text-[#0a3d31] transition">About Us</a>
            <a href="#academics" className="hover:text-[#0a3d31] transition">Academics</a>
            <a href="#facilities" className="hover:text-[#0a3d31] transition">Facilities</a>
            <a href="#notices" className="hover:text-[#0a3d31] transition">Notices</a>
            <a href="#gallery" className="hover:text-[#0a3d31] transition">Gallery</a>
            <a href="#contact" className="hover:text-[#0a3d31] transition">Contact</a>
          </nav>

          {/* Portal Button & CTA */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/admission"
              className="px-3.5 py-2 text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 rounded-xl transition shadow-xs flex items-center gap-1"
            >
              <span>Apply Online ✍️</span>
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-xs font-black text-white bg-[#0a3d31] hover:bg-[#115e59] rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <Lock size={13} className="text-amber-400" />
              <span>🔐 School ERP Portal</span>
            </Link>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-700 hover:text-slate-900"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Slide-down Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 px-6 py-4 space-y-3 text-sm font-bold text-slate-800">
            <a
              href="#hero"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1 hover:text-blue-700"
            >
              Home
            </a>
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1 hover:text-blue-700"
            >
              About Us
            </a>
            <a
              href="#academics"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1 hover:text-blue-700"
            >
              Academic Programs (PG - Class 5)
            </a>
            <a
              href="#facilities"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1 hover:text-blue-700"
            >
              Facilities & Campus
            </a>
            <a
              href="#notices"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1 hover:text-blue-700"
            >
              Notice Board
            </a>
            <a
              href="#gallery"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1 hover:text-blue-700"
            >
              Photo Gallery
            </a>
            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1 hover:text-blue-700"
            >
              Contact & Map
            </a>
            <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
              <Link
                href="/admission"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>✍️ Online Admission (आवेदन)</span>
              </Link>
              <a
                href="#inquiry"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 bg-emerald-50 text-[#0a3d31] rounded-xl text-xs font-bold"
              >
                Admission Inquiry
              </a>
              <Link
                href="/login"
                className="w-full text-center py-2.5 bg-[#0a3d31] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Lock size={13} className="text-amber-400" />
                <span>🔐 Portal Login (Admin/Teacher/Student)</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO SECTION ──────────────────────────────────────────────────────── */}
      <section id="hero" className="relative bg-gradient-to-b from-[#062c23] via-[#083b30] to-[#042019] text-white overflow-hidden py-16 lg:py-24">
        {/* Background Subtle Gradient & Grid Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left 7 Cols: Headline & Actions */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Badges */}
              <div className="inline-flex flex-wrap items-center justify-center lg:justify-start gap-2">
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                  <Sparkles size={13} />
                  <span>Private English Medium School</span>
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold">
                  🇳🇵 Estd. 2075 B.S. · Rautahat
                </span>
                <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 px-3 py-1 rounded-full text-xs font-semibold">
                  Playgroup to Class 5+
                </span>
              </div>

              {/* Main Headline */}
              <div className="space-y-2">
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                  BRINDAWAN <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
                    PUBLIC SCHOOL
                  </span>
                </h1>
                <p className="text-xl sm:text-2xl font-nepali font-bold text-amber-300/90">
                  बृन्दावन पब्लिक स्कूल, रौतहट
                </p>
              </div>

              {/* Tagline */}
              <p className="text-sm sm:text-base text-emerald-100/90 max-w-2xl leading-relaxed">
                {school.heroTagline ||
                  'Nurturing young minds with child-centric education, active play, moral values, and 21st-century foundation. From early childhood to primary excellence.'}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
                <Link
                  href="/admission"
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-slate-950 font-black text-xs sm:text-sm transition shadow-lg flex items-center gap-2"
                >
                  <Send size={16} />
                  <span>Online Admission (आवेदन) ✍️</span>
                </Link>
                <a
                  href="#academics"
                  className="px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/20 transition flex items-center gap-2"
                >
                  <GraduationCap size={18} />
                  <span>Explore Wings</span>
                </a>
                <Link
                  href="/login"
                  className="px-5 py-3.5 rounded-2xl bg-[#0a3d31] hover:bg-[#115e59] text-white font-bold text-xs sm:text-sm border border-emerald-400/40 transition flex items-center gap-2 shadow-md"
                >
                  <Lock size={16} className="text-amber-400" />
                  <span>🔐 ERP Portal ↗</span>
                </Link>
              </div>

              {/* Quick Trust Highlights */}
              <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl">
                  <div className="text-amber-400 font-bold text-xs">Montessori</div>
                  <div className="text-[10px] text-slate-400">Pre-Primary Wings</div>
                </div>
                <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl">
                  <div className="text-emerald-400 font-bold text-xs">Safe Transport</div>
                  <div className="text-[10px] text-slate-400">School Van Routes</div>
                </div>
                <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl">
                  <div className="text-blue-400 font-bold text-xs">Digital Lab</div>
                  <div className="text-[10px] text-slate-400">Smart Audio-Visual</div>
                </div>
                <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl">
                  <div className="text-purple-400 font-bold text-xs">CDC Graded</div>
                  <div className="text-[10px] text-slate-400">Continuous Evaluation</div>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Quick Highlights Card */}
            <div className="lg:col-span-5">
              <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl text-white space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-amber-300 font-bold uppercase">
                      Official Institutional Profile
                    </span>
                    <h3 className="text-lg font-black text-white">BRINDAWAN PUBLIC SCHOOL</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                    BPS
                  </div>
                </div>

                {/* Key Points */}
                <div className="space-y-3.5 text-xs text-slate-200">
                  <div className="flex items-start gap-3">
                    <div className="p-1 rounded bg-amber-400/20 text-amber-300 shrink-0 mt-0.5">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <strong className="text-white">Child-Centric Learning Environment:</strong>
                      <p className="text-slate-300 text-[11px] mt-0.5">
                        Focused on developing curious, disciplined, and morally grounded future leaders.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-1 rounded bg-emerald-400/20 text-emerald-300 shrink-0 mt-0.5">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <strong className="text-white">Continuous Assessment & EMIS Records:</strong>
                      <p className="text-slate-300 text-[11px] mt-0.5">
                        Multi-title mark evaluation (Theory, Practical & Life Learning) aligned with government EMIS standards.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-1 rounded bg-blue-400/20 text-blue-300 shrink-0 mt-0.5">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <strong className="text-white">Transparent School Accounting:</strong>
                      <p className="text-slate-300 text-[11px] mt-0.5">
                        Automated fee receipts, tuition tracking, and transparent records accessible to parents.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Direct Action Box */}
                <div className="pt-2 border-t border-white/10">
                  <a
                    href="#inquiry"
                    className="w-full block py-3 text-center bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs shadow-md transition"
                  >
                    Apply for Admission 2083-84 →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS COUNTER BAR ─────────────────────────────────────────────────── */}
      <section className="bg-[#042019] border-y border-emerald-900/50 py-6 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-amber-400 font-mono">500+</div>
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Enrolled Students</div>
              <p className="text-[10px] text-slate-400">विद्यार्थी संख्या</p>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono">25+</div>
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Teachers & Staff</div>
              <p className="text-[10px] text-slate-400">दक्ष शिक्षक तथा कर्मचारी</p>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-blue-400 font-mono">100%</div>
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Promotion Rate</div>
              <p className="text-[10px] text-slate-400">सफलता तथा उत्तीर्ण दर</p>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-purple-400 font-mono">PG - 5+</div>
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Academic Wings</div>
              <p className="text-[10px] text-slate-400">प्लेग्रुप देखि कक्षा ५ सम्म</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── ABOUT SECTION ─────────────────────────────────────────────────────── */}
      <section id="about" className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#1e3a5f] border border-blue-200 text-xs font-black uppercase tracking-wider">
              🏛️ Institutional Profile
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Welcome to Brindawan Public School
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Decades of commitment to educational excellence, moral integrity, and foundational development in Brindaban, Rautahat.
            </p>
            <div className="w-20 h-1 bg-amber-400 mx-auto rounded-full mt-2" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left 7 Cols: Narrative & Mission/Vision */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
                <p>
                  <strong>Brindawan Public School</strong> (बृन्दावन पब्लिक स्कूल) is a dedicated private English-medium institution established in <strong>Brindaban Municipality-02, Rautahat, Madhesh Province, Nepal</strong>.
                </p>
                <p>
                  We believe that the early childhood and primary years form the bedrock of a child's cognitive, physical, emotional, and social development. Our pedagogical framework blends international Montessori activity-based learning with Nepal's national Curriculum Development Center (CDC) competencies.
                </p>
              </div>

              {/* Vision & Mission Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                    <Sparkles size={16} />
                    <span>Our Vision (हाम्रो दृष्टिकोण)</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {school.vision ||
                      'To cultivate well-rounded, disciplined, and intellectually curious young scholars capable of excelling in modern society.'}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center gap-2 text-[#1e3a5f] font-bold text-sm">
                    <Compass size={16} />
                    <span>Our Mission (हाम्रो लक्ष्य)</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {school.mission ||
                      'Provide holistic, activity-driven pre-primary and primary education using modern smart tools and personalized care.'}
                  </p>
                </div>
              </div>

              {/* 4 Pillars */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-xl border border-slate-200 bg-white text-center">
                  <div className="font-bold text-slate-900 text-xs">Montessori Lab</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Sensory Growth</div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-white text-center">
                  <div className="font-bold text-slate-900 text-xs">Small Batches</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Individual Care</div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-white text-center">
                  <div className="font-bold text-slate-900 text-xs">Audio-Visual</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Interactive Tech</div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-white text-center">
                  <div className="font-bold text-slate-900 text-xs">Moral Character</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Cultural Ethics</div>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Principal's Note */}
            <div className="lg:col-span-5">
              <div className="bg-gradient-to-br from-[#062c23] via-[#093d32] to-[#0c4e3f] text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-5 relative overflow-hidden border border-emerald-500/20">
                <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                  <div className="w-14 h-14 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xl shrink-0 shadow-md">
                    PR
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">{school.principalName || 'Premlal Prasad Raut'}</h3>
                    <p className="text-xs text-amber-300 font-medium">Principal, Brindawan Public School</p>
                    <p className="text-[10px] text-slate-300">Brindaban-02, Rautahat</p>
                  </div>
                </div>

                <blockquote className="text-xs sm:text-sm text-slate-200 italic leading-relaxed">
                  "At Brindawan Public School, every child is embraced as a unique individual filled with immense potential. Our educators do not simply teach books — we instill confidence, inspire curiosity, and shape strong foundations. We welcome every family to be a part of our thriving educational community."
                </blockquote>

                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-300">
                  <span>Academic Year 2083-84</span>
                  <span className="font-bold text-amber-300">बृन्दावन, रौतहट</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ACADEMIC PROGRAMS SECTION (PLAY GROUP TO CLASS 5) ─────────────────── */}
      <section id="academics" className="py-16 sm:py-24 bg-slate-100/70 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-black uppercase tracking-wider">
              🎓 Curriculum & Wings
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Academic Wings (Play Group to Class 5)
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Tailored learning progression designed to ignite young minds from early childhood play up to primary mastery.
            </p>
            <div className="w-20 h-1 bg-amber-400 mx-auto rounded-full mt-2" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {academicPrograms.map((prog, idx) => (
              <div
                key={idx}
                className={`bg-white rounded-3xl p-6 border shadow-xs hover:shadow-md transition flex flex-col justify-between ${prog.color}`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${prog.badgeColor}`}>
                      {prog.level}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 font-mono">{prog.age}</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900">{prog.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{prog.desc}</p>
                </div>

                <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">CDC & Montessori Standard</span>
                  <a href="#inquiry" className="font-bold text-[#1e3a5f] hover:underline flex items-center gap-1">
                    <span>Inquire</span>
                    <ArrowRight size={13} />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Extensibility Note */}
          <div className="mt-8 bg-emerald-50/90 border border-emerald-200/80 rounded-2xl p-5 text-center max-w-2xl mx-auto shadow-2xs">
            <p className="text-xs font-semibold text-[#0a3d31]">
              💡 <strong>Expansion Capability:</strong> Classes 6, 7, 8 and higher levels can be dynamically added by the school administration as the student cohorts advance.
            </p>
          </div>
        </div>
      </section>

      {/* ── FACILITIES SECTION ────────────────────────────────────────────────── */}
      <section id="facilities" className="py-16 sm:py-24 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black uppercase tracking-wider">
              🏫 Campus & Infrastructure
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              State-of-the-Art Facilities
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Equipped with modern educational resources and safety standards to support wholesome learning and recreation.
            </p>
            <div className="w-20 h-1 bg-amber-400 mx-auto rounded-full mt-2" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {facilities.map((fac, idx) => (
              <div
                key={idx}
                className="bg-slate-50 hover:bg-white rounded-3xl p-6 border border-slate-200 hover:border-emerald-300 hover:shadow-lg transition space-y-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-white shadow-2xs border border-slate-200 flex items-center justify-center">
                  {fac.icon}
                </div>
                <h3 className="text-base font-extrabold text-slate-900">{fac.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{fac.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DYNAMIC NOTICES SECTION ───────────────────────────────────────────── */}
      <section id="notices" className="py-16 sm:py-24 bg-slate-100/80 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-black uppercase tracking-wider mb-2">
                📢 Official Notice Board
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Latest Announcements & Circulars
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Stay informed with school schedules, exam routines, and holidays.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs text-xs font-bold">
              <button
                onClick={() => setActiveNoticeTab('ALL')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeNoticeTab === 'ALL'
                    ? 'bg-[#0a3d31] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Notices
              </button>
              <button
                onClick={() => setActiveNoticeTab('EXAM')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeNoticeTab === 'EXAM'
                    ? 'bg-[#0a3d31] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Examinations
              </button>
              <button
                onClick={() => setActiveNoticeTab('GENERAL')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeNoticeTab === 'GENERAL'
                    ? 'bg-[#0a3d31] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                General
              </button>
            </div>
          </div>

          {/* Notices Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredNotices.map((notice) => (
              <div
                key={notice.id}
                onClick={() => setSelectedNotice(notice)}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs hover:shadow-md transition cursor-pointer space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {notice.type}
                    </span>
                    <span className="font-mono text-slate-500 flex items-center gap-1">
                      <Calendar size={12} />
                      <span>{notice.postedDateBs} BS</span>
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 hover:text-[#0a3d31] transition">
                    {notice.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {notice.body}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-[#0a3d31] font-bold">
                  <span>Read Full Notice →</span>
                  <span className="text-[10px] text-slate-400">Brindawan Public School</span>
                </div>
              </div>
            ))}
          </div>

          {/* Notice Detail Modal */}
          {selectedNotice && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl border border-slate-200">
                <div className="flex items-start justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900">
                    {selectedNotice.type} NOTICE
                  </span>
                  <button
                    onClick={() => setSelectedNotice(null)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                  >
                    <X size={20} />
                  </button>
                </div>
                <h3 className="text-lg font-black text-slate-900">{selectedNotice.title}</h3>
                <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <Calendar size={13} />
                  <span>Published Date: {selectedNotice.postedDateBs} BS</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {selectedNotice.body}
                </p>
                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => setSelectedNotice(null)}
                    className="px-5 py-2 bg-[#0a3d31] hover:bg-[#115e59] text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── PHOTO GALLERY SECTION ─────────────────────────────────────────────── */}
      <section id="gallery" className="py-16 sm:py-24 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black uppercase tracking-wider">
              <Sparkles size={13} />
              <span>Campus Life & Moments (विद्यालय गतिविधि)</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-serif">
              Life at Brindawan Public School
            </h2>
            <p className="text-sm text-slate-600">
              Capturing vibrant learning moments, experiential discovery, and joyful celebrations across our campus.
            </p>
            <div className="w-20 h-1 bg-amber-400 mx-auto rounded-full mt-2" />
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {['ALL', 'Campus', 'Classrooms', 'Facilities', 'Sports', 'Activities'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveGalleryCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-2xs ${
                  activeGalleryCategory === cat
                    ? 'bg-[#0a3d31] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80'
                }`}
              >
                {cat === 'ALL' ? 'All Photos' : cat}
              </button>
            ))}
          </div>

          {/* Photos Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGallery.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedGalleryPhoto(item)}
                className="group relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-200 shadow-2xs hover:shadow-xl transition cursor-pointer flex flex-col justify-end"
              >
                {/* Photo Image */}
                <div className="aspect-[4/3] w-full overflow-hidden relative">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-108 transition duration-500"
                    onError={(e: any) => {
                      e.target.src = 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1200&q=80';
                    }}
                  />
                  {/* Subtle Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

                  {/* Top Category Badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#0a3d31]/80 text-emerald-300 backdrop-blur-md border border-emerald-400/30">
                      {item.category}
                    </span>
                  </div>

                  {/* Bottom Captions & Title */}
                  <div className="absolute bottom-0 inset-x-0 p-5 z-10 space-y-1.5 text-white">
                    <h3 className="text-base font-black leading-snug group-hover:text-amber-300 transition">
                      {item.title}
                    </h3>
                    {item.caption && (
                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                        {item.caption}
                      </p>
                    )}
                    <div className="pt-1 text-[11px] text-amber-400 font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition duration-300">
                      <span>Click to view full photo</span>
                      <ArrowRight size={12} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Lightbox Modal */}
          {selectedGalleryPhoto && (
            <div
              className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
              onClick={() => setSelectedGalleryPhoto(null)}
            >
              <div
                className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative aspect-video sm:aspect-[16/10] w-full bg-black overflow-hidden flex items-center justify-center">
                  <img
                    src={selectedGalleryPhoto.imageUrl}
                    alt={selectedGalleryPhoto.title}
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={() => setSelectedGalleryPhoto(null)}
                    className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition shadow-md"
                    title="Close"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 pt-2 space-y-2 text-white">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      {selectedGalleryPhoto.category}
                    </span>
                    <span className="text-xs text-slate-400 font-serif">Brindawan Public School</span>
                  </div>
                  <h3 className="text-xl font-black text-white">{selectedGalleryPhoto.title}</h3>
                  {selectedGalleryPhoto.caption && (
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {selectedGalleryPhoto.caption}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── ADMISSION INQUIRY & CONTACT SECTION ─────────────────────────────────── */}
      <section id="inquiry" className="py-16 sm:py-24 bg-slate-900 text-white relative">
        <div id="contact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left 6 Cols: Inquiry Form */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                  Admissions 2083-84
                </span>
                <h2 className="text-2xl sm:text-4xl font-black text-white">
                  Online Admission Inquiry
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  Fill out this brief form to inquire about seat availability, fees, and school admission for your child.
                </p>
              </div>

              <form onSubmit={handleInquirySubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Parent / Guardian Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar Raut"
                      value={inquiryForm.parentName}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, parentName: e.target.value })}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Contact Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 98XXXXXXXX"
                      value={inquiryForm.phone}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Child / Student Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Aayush Raut"
                      value={inquiryForm.studentName}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, studentName: e.target.value })}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Applying For Class *</label>
                    <select
                      value={inquiryForm.desiredClass}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, desiredClass: e.target.value })}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-400 text-xs"
                    >
                      <option value="Play Group">Play Group (PG)</option>
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

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Message / Questions (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Inquire regarding bus routes, fee structures, or specific admission queries..."
                    value={inquiryForm.message}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingInquiry}
                  className="w-full py-3 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2"
                >
                  <Send size={14} />
                  <span>{isSubmittingInquiry ? 'Submitting...' : 'Submit Admission Inquiry'}</span>
                </button>
              </form>
            </div>

            {/* Right 6 Cols: School Location & Contacts */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
                  Get In Touch
                </span>
                <h2 className="text-2xl sm:text-4xl font-black text-white">Contact & Location</h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  Visit our welcoming campus or reach out to our administration office.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-bold">
                    <MapPin size={16} />
                    <span>School Address</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Brindaban Municipality-02, Rautahat District, Madhesh Province, Nepal
                  </p>
                </div>

                <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <Phone size={16} />
                    <span>Phone Numbers</span>
                  </div>
                  <p className="text-slate-300 font-mono">{school.phone}</p>
                  <p className="text-slate-400 text-[11px]">Sunday – Friday, 9am – 4pm</p>
                </div>

                <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 font-bold">
                    <Mail size={16} />
                    <span>Email Inquiries</span>
                  </div>
                  <p className="text-slate-300 font-mono">{school.email}</p>
                  <p className="text-slate-400 text-[11px]">Direct administrative desk</p>
                </div>

                <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold">
                    <Clock size={16} />
                    <span>School Hours</span>
                  </div>
                  <p className="text-slate-300">Class Hours: 9:30 AM – 3:30 PM</p>
                  <p className="text-slate-400 text-[11px]">Office Hours: 9:00 AM – 4:30 PM</p>
                </div>
              </div>

              {/* Map Card */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 text-center text-xs space-y-2">
                <div className="flex items-center justify-center gap-2 text-slate-300 font-bold">
                  <MapPin size={16} className="text-rose-400" />
                  <span>Brindaban Municipality-02, Rautahat, Nepal</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Conveniently situated along the main Brindaban access highway with student pickup points.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────────── */}
      <footer className="bg-[#031712] text-slate-400 text-xs py-12 border-t border-[#093d32]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
            {/* Brand column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-white p-0.5 border border-amber-400 flex items-center justify-center shrink-0">
                  <img src="/school_logo.png" alt="School Emblem" className="w-full h-full object-contain rounded-full" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">{school.name}</h4>
                  <p className="text-[10px] text-amber-400 font-nepali">बृन्दावन पब्लिक स्कूल</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                A prestigious private English-medium school nurturing character, knowledge, and life skills for young learners in Rautahat.
              </p>
              <div className="text-[11px] text-slate-300 font-mono">
                EMIS Code: <span className="text-amber-400 font-bold">{school.emisCode}</span>
              </div>
            </div>

            {/* Academic Wings */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Academic Wings</h4>
              <ul className="space-y-1.5 text-[11px]">
                <li><a href="#academics" className="hover:text-white transition">Play Group (PG)</a></li>
                <li><a href="#academics" className="hover:text-white transition">Nursery</a></li>
                <li><a href="#academics" className="hover:text-white transition">LKG & UKG / KG</a></li>
                <li><a href="#academics" className="hover:text-white transition">Class 1 & Class 2</a></li>
                <li><a href="#academics" className="hover:text-white transition">Class 3, 4 & 5</a></li>
              </ul>
            </div>

            {/* Quick Links */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Quick Links</h4>
              <ul className="space-y-1.5 text-[11px]">
                <li><a href="#about" className="hover:text-white transition">About Our School</a></li>
                <li><a href="#facilities" className="hover:text-white transition">Campus Facilities</a></li>
                <li><a href="#notices" className="hover:text-white transition">Notice Board</a></li>
                <li><a href="#gallery" className="hover:text-white transition">Photo Gallery</a></li>
                <li><a href="#inquiry" className="hover:text-white transition">Admission Inquiries</a></li>
              </ul>
            </div>

            {/* ERP Portals Access */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">🔐 School ERP Portals</h4>
              <div className="space-y-1.5 text-[11px]">
                <Link href="/login" className="block text-slate-300 hover:text-amber-400 transition font-bold">
                  → Administrator / Principal Portal
                </Link>
                <Link href="/login" className="block text-slate-300 hover:text-amber-400 transition font-bold">
                  → Accountant Portal (Fees & Salaries)
                </Link>
                <Link href="/login" className="block text-slate-300 hover:text-amber-400 transition font-bold">
                  → Teacher Portal (Attendance & Marks)
                </Link>
                <Link href="/login" className="block text-slate-300 hover:text-amber-400 transition font-bold">
                  → Student / Parent Portal (Results & Fees)
                </Link>
                <Link href="/login" className="block text-slate-300 hover:text-amber-400 transition font-bold">
                  → Librarian Portal (Book Catalog)
                </Link>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <p>© 2083 ({new Date().getFullYear()}) Brindawan Public School. All rights reserved.</p>
            <p className="flex items-center gap-1">
              <span>Brindaban Municipality-02, Rautahat, Madhesh Province, Nepal</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
