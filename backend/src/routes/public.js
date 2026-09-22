const express = require('express');
const prisma = require('../lib/prisma');

const router = express.Router();

// GET /api/public/site — Public school data for dynamic website
router.get('/site', async (req, res) => {
  try {
    const [school, notices, events, classes, studentCount, teacherCount] = await Promise.all([
      prisma.school.findFirst(),
      prisma.notice.findMany({
        where: {
          isActive: true,
          targetStudentId: null,
          OR: [
            { targetRole: null },
            { targetRole: 'ALL' },
            { targetRole: 'STUDENT' },
          ],
        },
        orderBy: { postedDateAd: 'desc' },
        take: 10,
      }),
      prisma.event.findMany({
        where: { isActive: true },
        orderBy: { eventDateBs: 'desc' },
        take: 10,
      }),
      prisma.class.findMany({
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          name: true,
          nameNepali: true,
          section: true,
          orderIndex: true,
        },
      }),
      prisma.student.count({ where: { isActive: true } }),
      prisma.teacher.count({ where: { isActive: true } }),
    ]);

    const stats = {
      students: studentCount > 0 ? studentCount : 500,
      teachers: teacherCount > 0 ? teacherCount : 25,
      classes: classes.length > 0 ? classes.length : 9,
      passRate: 100,
      establishedYear: school?.estYear || '2075',
    };

    const DEFAULT_GALLERY = [
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

    let gallery = DEFAULT_GALLERY;
    if (school?.galleryJson) {
      try {
        const parsed = JSON.parse(school.galleryJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          gallery = parsed;
        }
      } catch (e) {}
    }

    return res.json({
      success: true,
      data: {
        school,
        notices,
        events,
        classes,
        stats,
        gallery,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/public/inquiry — Admission / General Inquiry from public website
router.post('/inquiry', async (req, res) => {
  try {
    const { parentName, studentName, phone, email, desiredClass, message } = req.body;

    if (!parentName || !phone) {
      return res.status(400).json({ success: false, message: 'Parent name and contact phone number are required.' });
    }

    const title = `Online Admission Inquiry: ${studentName || parentName} (${desiredClass || 'General'})`;
    const body = `Parent: ${parentName}\nStudent: ${studentName || 'N/A'}\nPhone: ${phone}\nEmail: ${email || 'N/A'}\nTarget Class: ${desiredClass || 'Not specified'}\nMessage: ${message || 'No additional note'}`;

    const notice = await prisma.notice.create({
      data: {
        title,
        body,
        type: 'GENERAL',
        targetRole: 'ADMIN',
        isAutomatic: true,
        postedDateBs: new Date().toISOString().slice(0, 10),
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your admission inquiry has been submitted to Brindawan Public School. Our administration will contact you shortly.',
      inquiryId: notice.id,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
