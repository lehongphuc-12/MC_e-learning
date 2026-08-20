import { Course, Instructor, Category, Testimonial, PricingPlan, User, ActivityLog } from '../types';

export const mockInstructors: Instructor[] = [
  {
    id: 'inst-1',
    name: 'Jonathan Sterling',
    title: 'Master Host, Broadcaster & Celebrity MC',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    bio: 'Former BBC broadcaster and premier international wedding and gala MC with 15+ years of live stage experience hosting over 600 luxury weddings and high-profile galas worldwide.',
    rating: 4.95,
    studentsCount: 45120,
    coursesCount: 6,
    badge: 'Master Mentor',
    verified: true,
  },
  {
    id: 'inst-2',
    name: 'Elena Vance',
    title: 'TEDx Speaker Coach & Executive Pitch Strategist',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    bio: 'Elena has coached Fortune 500 CEOs and over 40 TEDx speakers to craft magnetic stories, commanding boardroom pitches, and memorable keynote presentations.',
    rating: 4.92,
    studentsCount: 38400,
    coursesCount: 4,
    badge: 'TEDx Coach',
    verified: true,
  },
  {
    id: 'inst-3',
    name: 'Jameson Burke',
    title: 'Global Conference Moderator & Event Producer',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    bio: 'Lead moderator for World Tech Summits and Davos side events. Specializes in panel dynamics, live audience banter, and VIP executive handling.',
    rating: 4.88,
    studentsCount: 29500,
    coursesCount: 5,
    badge: 'Summit Host',
    verified: true,
  },
  {
    id: 'inst-4',
    name: 'Sophie Laurent',
    title: 'Vocal Coach & Broadcast Diction Specialist',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    bio: 'Classical voice specialist trained at the Paris Conservatory, transforming stage resonance, breath control, and eliminating vocal fatigue for high-volume speakers.',
    rating: 4.96,
    studentsCount: 22100,
    coursesCount: 3,
    badge: 'Voice Virtuoso',
    verified: true,
  },
  {
    id: 'inst-5',
    name: 'Derek Cho',
    title: 'Storytelling Director & Keynote Architect',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    bio: 'Bestselling author and narrative architect behind multiple $100M venture funding pitches and viral commencement speeches.',
    rating: 4.89,
    studentsCount: 31200,
    coursesCount: 4,
    badge: 'Story Master',
    verified: true,
  },
  {
    id: 'inst-6',
    name: 'Sarah Jenkins',
    title: 'Corporate Crisis Communicator & Media Trainer',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    bio: 'Veteran news anchor and crisis communications advisor coaching executives through high-stakes press conferences and live television appearances.',
    rating: 4.91,
    studentsCount: 19800,
    coursesCount: 3,
    badge: 'Media Pro',
    verified: true,
  }
];

export const mockCategories: Category[] = [
  {
    id: 'cat-mc',
    name: 'MC & Event Hosting',
    iconName: 'Mic',
    coursesCount: 34,
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80',
    description: 'Master live stage presence, crowd cues, timeline coordination, and gala hosting.',
    tag: 'Trending'
  },
  {
    id: 'cat-speaking',
    name: 'Public Speaking & Keynotes',
    iconName: 'Megaphone',
    coursesCount: 42,
    image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=600&q=80',
    description: 'Overcome stage anxiety, command any auditorium, and deliver unforgettable speeches.',
    tag: 'Essential'
  },
  {
    id: 'cat-wedding',
    name: 'Wedding & Gala MCing',
    iconName: 'Sparkles',
    coursesCount: 18,
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80',
    description: 'Specialized techniques for high-end luxury weddings, toasts, and unscripted moments.',
    tag: 'High Demand'
  },
  {
    id: 'cat-presentation',
    name: 'Presentation & Pitch Mastery',
    iconName: 'Presentation',
    coursesCount: 28,
    image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=600&q=80',
    description: 'Design captivating slide narratives, win high-stakes pitches, and persuade boardrooms.',
  },
  {
    id: 'cat-storytelling',
    name: 'Storytelling for Leaders',
    iconName: 'BookOpen',
    coursesCount: 19,
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80',
    description: 'Structure emotional story arcs that build trust, inspire teams, and close deals.',
  },
  {
    id: 'cat-voice',
    name: 'Voice, Diction & Body Language',
    iconName: 'Volume2',
    coursesCount: 15,
    image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=600&q=80',
    description: 'Develop rich vocal resonance, eliminate filler words, and project natural executive aura.',
  }
];

export const mockCourses: Course[] = [
  {
    id: 'course-wedding-mc',
    title: 'The Elegant Wedding MC: Managing the Big Day',
    slug: 'the-elegant-wedding-mc',
    subtitle: 'A complete masterclass on timeline mastery, crowd psychology, crisis de-escalation, and heartfelt storytelling for luxury weddings.',
    description: 'Become the trusted master of ceremonies that couples and event planners fight to book. From orchestrating grand entrances to managing intoxicated groomsmen with diplomatic grace, this comprehensive masterclass gives you the complete blueprint used by premier celebrity wedding hosts.',
    category: 'Wedding & Gala MCing',
    level: 'Intermediate',
    thumbnail: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
    videoPreviewThumb: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
    instructor: mockInstructors[0], // Jonathan Sterling
    rating: 4.94,
    reviewsCount: 1248,
    studentsCount: 4820,
    price: 179.99,
    originalPrice: 249.99,
    discountPercentage: 28,
    badge: 'Best Seller',
    durationHours: 12.5,
    lecturesCount: 38,
    updatedDate: 'February 2026',
    language: 'English',
    subtitles: ['English [Auto]', 'Vietnamese', 'Spanish', 'French'],
    featured: true,
    learningOutcomes: [
      'Command the room with effortless poise, authentic charisma, and vocal projection.',
      'Coordinate seamlessly with wedding planners, audio engineers, catering staff, and photographers.',
      'Handle live timeline delays, awkward toasts, and family micro-crises without breaking rhythm.',
      'Craft tailored opening monologues and heartfelt storytelling transitions for the couple.',
      'Structure interactive games and dance floor energy transitions that keep all generations engaged.',
      'Access 18 downloadable script templates, timeline checklists, and emergency run-sheets.'
    ],
    requirements: [
      'A baseline desire to speak in front of audiences of 50 to 500+ guests.',
      'No prior professional hosting experience required; beginners with passion will thrive.',
      'A smartphone or basic microphone for audio practice exercises.'
    ],
    targetAudience: [
      'Aspiring professional wedding and event MCs looking to command high four-figure booking fees.',
      'Best men, maid of honors, or family friends asked to host an upcoming wedding.',
      'DJs, event planners, and hospitality managers expanding their service offerings.'
    ],
    curriculum: [
      {
        id: 'sec-1',
        title: 'Section 1: Foundations of Wedding MCing & Stage Persona',
        lecturesCount: 6,
        totalDuration: '1 hr 45 min',
        lectures: [
          { id: 'lec-101', title: '1. Welcome & The Mindset of a World-Class MC', duration: '12:40', previewAvailable: true, videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
          { id: 'lec-102', title: '2. Deconstructing the Anatomy of a Luxury Wedding Flow', duration: '18:15', previewAvailable: true },
          { id: 'lec-103', title: '3. Establishing Immediate Rapport with the Room in 60 Seconds', duration: '15:20', previewAvailable: false },
          { id: 'lec-104', title: '4. Microphone Technique, Proximity, and Vocal Placement', duration: '20:10', previewAvailable: false },
          { id: 'lec-105', title: '5. Overcoming Stage Fright: The 3-Step Nervous System Reset', duration: '14:30', previewAvailable: false },
          { id: 'lec-106', title: '6. Downloadable Resource: The Master MC Persona Checklist', duration: '08:00', previewAvailable: false }
        ]
      },
      {
        id: 'sec-2',
        title: 'Section 2: Timeline Architecture & Vendor Synchronization',
        lecturesCount: 8,
        totalDuration: '2 hrs 30 min',
        lectures: [
          { id: 'lec-201', title: '1. The Run-of-Show: Translating Minutes into Unforgettable Energy', duration: '22:15', previewAvailable: true },
          { id: 'lec-202', title: '2. Communicating with Planners, Kitchen, and Sound Crews', duration: '19:40', previewAvailable: false },
          { id: 'lec-203', title: '3. The Grand Entrance: Scripting High-Energy Introductions', duration: '24:00', previewAvailable: false },
          { id: 'lec-204', title: '4. Dinner Service Transitions and Background Mic Presence', duration: '16:10', previewAvailable: false },
          { id: 'lec-205', title: '5. Case Study: Recovering 30 Minutes of Kitchen Delay Gracefully', duration: '21:50', previewAvailable: false }
        ]
      },
      {
        id: 'sec-3',
        title: 'Section 3: Speeches, Toasts & Emotional Storytelling',
        lecturesCount: 7,
        totalDuration: '2 hrs 10 min',
        lectures: [
          { id: 'lec-301', title: '1. Prepping Nervous Speakers Before They Take the Mic', duration: '17:30', previewAvailable: false },
          { id: 'lec-302', title: '2. The Delicate Art of Toastmaster Etiquette and Timing', duration: '25:10', previewAvailable: true },
          { id: 'lec-303', title: '3. What to Do When a Toast Goes Off the Rails (Live De-escalation)', duration: '19:45', previewAvailable: false },
          { id: 'lec-304', title: '4. Delivering Heartfelt Transitions Between Speeches', duration: '18:20', previewAvailable: false }
        ]
      },
      {
        id: 'sec-4',
        title: 'Section 4: Live Emergencies, Games & Dance Floor Handover',
        lecturesCount: 9,
        totalDuration: '3 hrs 15 min',
        lectures: [
          { id: 'lec-401', title: '1. The 10 Most Common Wedding Emergencies and Scripted Fixes', duration: '28:10', previewAvailable: false },
          { id: 'lec-402', title: '2. Crowd Psychology: Reading Energy Dips in Real-Time', duration: '22:40', previewAvailable: false },
          { id: 'lec-403', title: '3. Tasteful Interactive Games for Multigenerational Crowds', duration: '26:15', previewAvailable: false },
          { id: 'lec-404', title: '4. The Climax: Cake Cutting, First Dance, and Send-Off', duration: '20:30', previewAvailable: false }
        ]
      }
    ],
    reviews: [
      {
        id: 'rev-1',
        author: 'Michael Sterling',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        rating: 5,
        date: '3 weeks ago',
        comment: 'This masterclass is pure gold. Jonathan explains the subtle psychological cues that turn a regular host into someone who commands total authority with warmth. My wedding MC bookings tripled after applying Section 2 and 3!',
        helpfulCount: 42
      },
      {
        id: 'rev-2',
        author: 'Elena Lindqvist',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
        rating: 5,
        date: '1 month ago',
        comment: 'The emergency scripts alone are worth ten times the course price. When our sound system cut out during a 300-guest wedding last weekend, Jonathan’s acoustic backup drill saved the night.',
        helpfulCount: 29
      },
      {
        id: 'rev-3',
        author: 'David Chen',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
        rating: 5,
        date: '2 months ago',
        comment: 'Step-by-step masterclass with zero fluff. Every lesson gives actionable templates you can print out and bring directly to rehearsals.',
        helpfulCount: 18
      }
    ]
  },
  {
    id: 'course-public-speaking',
    title: 'The Art of Executive Public Speaking & Keynote Delivery',
    slug: 'executive-public-speaking',
    subtitle: 'Command stages, overcome public speaking anxiety, and deliver memorable keynotes that captivate thousands.',
    description: 'Transform from a hesitant presenter into an electrifying keynote speaker. Learn the vocal mechanics, body language power poses, and storytelling frameworks used by TED speakers and Fortune 500 keynote leaders.',
    category: 'Public Speaking & Keynotes',
    level: 'All Levels',
    thumbnail: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80',
    instructor: mockInstructors[1], // Elena Vance
    rating: 4.92,
    reviewsCount: 2150,
    studentsCount: 9400,
    price: 149.99,
    originalPrice: 199.99,
    discountPercentage: 25,
    badge: 'Best Seller',
    durationHours: 10.0,
    lecturesCount: 32,
    updatedDate: 'January 2026',
    language: 'English',
    subtitles: ['English', 'Vietnamese', 'Japanese', 'German'],
    learningOutcomes: [
      'Eradicate stage fright with neuro-linguistic grounding exercises.',
      'Craft magnetic openings that capture 100% audience attention within 15 seconds.',
      'Master stage movement, purposeful stillness, and dynamic gestures.',
      'Structure high-impact 18-minute TED-style keynote speeches.'
    ],
    requirements: ['Commitment to record yourself on video for weekly feedback drills.'],
    targetAudience: ['Executives, team leaders, startup founders, and aspiring keynote speakers.'],
    curriculum: [
      {
        id: 'ps-sec-1',
        title: 'Section 1: The Psychology of Stage Command',
        lecturesCount: 5,
        totalDuration: '1 hr 30 min',
        lectures: [
          { id: 'ps-101', title: '1. Why Most Speakers Fail in the First 30 Seconds', duration: '14:20', previewAvailable: true },
          { id: 'ps-102', title: '2. Reprogramming the Fight-or-Flight Response', duration: '18:40', previewAvailable: true }
        ]
      }
    ],
    reviews: []
  },
  {
    id: 'course-corporate-hosting',
    title: 'Corporate Summit & Conference Moderation Mastery',
    slug: 'corporate-summit-moderation',
    subtitle: 'Lead high-stakes panel discussions, executive fireside chats, and multi-day international summits.',
    description: 'Master the rigorous protocols, sharp question formulations, and timekeeping skills required to moderate C-suite panels, tech conferences, and global summits.',
    category: 'MC & Event Hosting',
    level: 'Advanced',
    thumbnail: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
    instructor: mockInstructors[2], // Jameson Burke
    rating: 4.88,
    reviewsCount: 890,
    studentsCount: 3200,
    price: 189.99,
    originalPrice: 229.99,
    discountPercentage: 17,
    badge: 'Top Rated',
    durationHours: 8.5,
    lecturesCount: 26,
    updatedDate: 'February 2026',
    language: 'English',
    subtitles: ['English', 'Vietnamese', 'French'],
    learningOutcomes: [
      'Formulate incisive questions that pull authentic insights from guarded panelists.',
      'Politely cut off long-winded executives without causing diplomatic friction.',
      'Maintain seamless continuity throughout 8-hour international summit schedules.'
    ],
    requirements: ['Basic understanding of corporate structures and live event workflows.'],
    targetAudience: ['Professional moderators, event hosts, journalists, and PR directors.'],
    curriculum: [],
    reviews: []
  },
  {
    id: 'course-storytelling',
    title: 'Storytelling for Leaders: Turning Numbers into Narrative',
    slug: 'storytelling-for-leaders',
    subtitle: 'How to build emotional, high-conversion narratives that move teams, investors, and clients.',
    description: 'Data informs, but emotion sells. Discover the Pixar and Hollywood storytelling frameworks adapted specifically for pitch decks, company all-hands, and stakeholder negotiations.',
    category: 'Storytelling for Leaders',
    level: 'Intermediate',
    thumbnail: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80',
    instructor: mockInstructors[4], // Derek Cho
    rating: 4.90,
    reviewsCount: 1420,
    studentsCount: 6800,
    price: 129.99,
    originalPrice: 169.99,
    discountPercentage: 23,
    badge: 'Hot Deal',
    durationHours: 7.0,
    lecturesCount: 22,
    updatedDate: 'January 2026',
    language: 'English',
    subtitles: ['English', 'Vietnamese'],
    learningOutcomes: [
      'Structure the 5-point Hero Transformation Arc for corporate presentations.',
      'Turn dry quarterly metrics into compelling strategic visions.',
      'Use vulnerability tactically to build unshakeable leadership credibility.'
    ],
    requirements: ['No prior creative writing or storytelling background needed.'],
    targetAudience: ['Product leaders, startup founders, sales executives, and managers.'],
    curriculum: [],
    reviews: []
  },
  {
    id: 'course-voice-diction',
    title: 'Vocal Power & Broadcast Diction for High-Volume Speakers',
    slug: 'vocal-power-and-broadcast-diction',
    subtitle: 'Develop rich vocal resonance, eliminate throat fatigue, and master crisp professional articulation.',
    description: 'Your voice is your primary instrument. Learn classical diaphragmatic breathing, resonant placement, microphone EQ mastery, and diction drills to speak for hours without strain.',
    category: 'Voice, Diction & Body Language',
    level: 'Beginner',
    thumbnail: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80',
    instructor: mockInstructors[3], // Sophie Laurent
    rating: 4.96,
    reviewsCount: 1680,
    studentsCount: 7100,
    price: 99.99,
    originalPrice: 139.99,
    discountPercentage: 28,
    badge: 'Best Seller',
    durationHours: 6.5,
    lecturesCount: 20,
    updatedDate: 'February 2026',
    language: 'English',
    subtitles: ['English', 'Vietnamese', 'French'],
    learningOutcomes: [
      'Master diaphragmatic breath support for rich, resonant projection.',
      'Eliminate vocal fry, trailing ends of sentences, and filler sounds.',
      'Perform warm-up and cool-down routines before big speeches.'
    ],
    requirements: ['15 minutes of daily vocal practice in a quiet room.'],
    targetAudience: ['Podcasters, broadcasters, MCs, teachers, and sales professionals.'],
    curriculum: [],
    reviews: []
  },
  {
    id: 'course-presentation-design',
    title: 'High-Stakes Presentation Design & Visual Persuasion',
    slug: 'presentation-design-mastery',
    subtitle: 'Craft minimalist, high-converting slide decks that clarify complexity and win investor checks.',
    description: 'Stop creating boring bulleted PowerPoint slides. Master modern layout hierarchy, data visualization ethics, and kinetic typography to build decks that look like Apple keynotes.',
    category: 'Presentation & Pitch Mastery',
    level: 'All Levels',
    thumbnail: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
    instructor: mockInstructors[1], // Elena Vance
    rating: 4.87,
    reviewsCount: 940,
    studentsCount: 4300,
    price: 119.99,
    originalPrice: 159.99,
    discountPercentage: 25,
    badge: 'New',
    durationHours: 9.0,
    lecturesCount: 28,
    updatedDate: 'February 2026',
    language: 'English',
    subtitles: ['English', 'Vietnamese'],
    learningOutcomes: [
      'Apply the 3-Second Rule to eliminate cognitive overload on slides.',
      'Create custom animations that guide audience focus rather than distract.',
      'Export and deliver presentation decks flawlessly across all AV systems.'
    ],
    requirements: ['PowerPoint, Keynote, or Figma installed.'],
    targetAudience: ['Consultants, marketers, project managers, and entrepreneurs.'],
    curriculum: [],
    reviews: []
  },
  {
    id: 'course-crisis-comm',
    title: 'Crisis Communications & Live Media Training',
    slug: 'crisis-communications-media-training',
    subtitle: 'Navigate adversarial press interviews, PR emergencies, and live broadcast questioning.',
    description: 'Learn how to stay poised under aggressive cross-examination, pivot from hostile questions to core talking points, and protect brand integrity in crisis moments.',
    category: 'Public Speaking & Keynotes',
    level: 'Advanced',
    thumbnail: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80',
    instructor: mockInstructors[5], // Sarah Jenkins
    rating: 4.93,
    reviewsCount: 720,
    studentsCount: 2800,
    price: 199.99,
    originalPrice: 269.99,
    discountPercentage: 26,
    badge: 'Top Rated',
    durationHours: 11.0,
    lecturesCount: 30,
    updatedDate: 'December 2025',
    language: 'English',
    subtitles: ['English', 'Vietnamese'],
    learningOutcomes: [
      'The Bridging Technique: Pivoting from traps to core messages.',
      'Micro-expressions and camera angles that convey honesty and control.',
      'Building rapid-response crisis messaging within 60 minutes of breaking news.'
    ],
    requirements: ['Interest in public relations and executive communications.'],
    targetAudience: ['Spokespersons, CEOs, politicians, and PR agency leads.'],
    curriculum: [],
    reviews: []
  },
  {
    id: 'course-free-intro',
    title: 'MC Essentials: The 7-Day Stage Presence Kickstart',
    slug: 'mc-essentials-stage-presence',
    subtitle: 'A foundational, fast-paced sprint on microphone fundamentals, stance, and stage energy.',
    description: 'Experience MSEEK’s core methodology with this free crash course covering essential stage presence, breath pacing, and opening lines for beginner hosts.',
    category: 'MC & Event Hosting',
    level: 'Beginner',
    thumbnail: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
    instructor: mockInstructors[0],
    rating: 4.86,
    reviewsCount: 3400,
    studentsCount: 18200,
    price: 0,
    originalPrice: 49.99,
    discountPercentage: 100,
    badge: 'Free',
    durationHours: 3.5,
    lecturesCount: 12,
    updatedDate: 'February 2026',
    language: 'English',
    subtitles: ['English', 'Vietnamese'],
    learningOutcomes: [
      'Posture and body weight distribution for grounded confidence.',
      'Holding the mic at the optimal 45-degree angle.',
      'The 5 universal opening icebreakers for any audience.'
    ],
    requirements: ['Open to anyone looking to start hosting.'],
    targetAudience: ['Beginner hosts and anyone with public speaking anxiety.'],
    curriculum: [],
    reviews: []
  }
];

export const mockTestimonials: Testimonial[] = [
  {
    id: 'test-1',
    quote: 'MSEEK completely altered the trajectory of my career. The live stage simulation and Jonathan’s timeline blueprints gave me the confidence to host our APAC Tech Gala of 1,200 attendees flawlessly.',
    author: 'Rebecca Thorne',
    role: 'Global Events Director',
    company: 'Nexus Tech Global',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    rating: 5
  },
  {
    id: 'test-2',
    quote: 'Before MSEEK, I used to freeze on stage and rush through slides. Elena Vance’s storytelling course helped me deliver a keynote that resulted in our Series B funding round.',
    author: 'Marcus Vance',
    role: 'Co-Founder & CEO',
    company: 'Synthetix AI',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    rating: 5
  },
  {
    id: 'test-3',
    quote: 'The wedding MC masterclass is the most practical educational program I have ever taken online. Clear frameworks, real-world case studies, and zero wasted time.',
    author: 'Camilla Duarte',
    role: 'Luxury Wedding Planner & Host',
    company: 'Duarte Atelier',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    rating: 5
  }
];

export const mockPricingPlans: PricingPlan[] = [
  {
    id: 'plan-individual',
    name: 'Individual Masterclass',
    description: 'Perfect for mastering a specific discipline or preparing for an upcoming live event.',
    monthlyPrice: 49,
    annualPrice: 39,
    features: [
      'Full lifetime access to 1 chosen masterclass',
      'Downloadable run-sheets, templates & scripts',
      'Certificate of Completion upon graduation',
      'Community discussion forum access',
      'Standard video playback in 1080p'
    ],
    ctaText: 'Choose Course'
  },
  {
    id: 'plan-pro',
    name: 'MSEEK Pro Pass',
    description: 'Uncapped access to our entire catalog of 120+ masterclasses and live monthly workshops.',
    monthlyPrice: 39,
    annualPrice: 29,
    popular: true,
    features: [
      'Unlimited access to all 120+ masterclasses',
      'Monthly live group coaching with Master Instructors',
      'Verified digital credential badges on LinkedIn',
      'Early access to new courses & masterclass drops',
      'Downloadable offline viewing & 4K streaming',
      'Exclusive MC & Speaker Booking Network'
    ],
    ctaText: 'Start 7-Day Free Trial'
  },
  {
    id: 'plan-enterprise',
    name: 'Enterprise & Teams',
    description: 'Empower your executive leadership, sales force, and spokespersons with bespoke training.',
    monthlyPrice: 99,
    annualPrice: 79,
    features: [
      'All Pro Pass features for entire organization',
      'Dedicated executive coaching sessions & 1-on-1 audits',
      'Custom company branding & LMS integration',
      'Advanced team engagement & skill analytics',
      'Dedicated enterprise success manager'
    ],
    ctaText: 'Contact Enterprise Sales'
  }
];

export const mockCurrentUser: User = {
  id: 'user-alex-rivera',
  name: 'Alex Rivera',
  email: 'alex.rivera@mseek.edu',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
  role: 'student'
};

export const mockRecentActivities: ActivityLog[] = [
  {
    id: 'act-1',
    title: 'Earned "MC Essentials" Certified Host Badge',
    type: 'certificate',
    timestamp: '2 hours ago',
    courseTitle: 'MC Essentials: The 7-Day Stage Presence Kickstart',
    badgeColor: 'emerald'
  },
  {
    id: 'act-2',
    title: 'Completed Module 3 Quiz with 100% Score',
    type: 'quiz',
    timestamp: 'Yesterday at 4:30 PM',
    courseTitle: 'The Elegant Wedding MC: Managing the Big Day',
    badgeColor: 'blue'
  },
  {
    id: 'act-3',
    title: 'Instructor Jonathan Sterling replied to your script question',
    type: 'discussion',
    timestamp: '3 days ago',
    courseTitle: 'The Elegant Wedding MC',
    badgeColor: 'amber'
  },
  {
    id: 'act-4',
    title: 'Crossed 120 Hours Milestone of Speaking Practice',
    type: 'milestone',
    timestamp: '5 days ago',
    badgeColor: 'purple'
  }
];

export const mockWeeklyLearningHours = [
  { day: 'Mon', hours: 2.4, target: 2.0 },
  { day: 'Tue', hours: 3.8, target: 2.0 },
  { day: 'Wed', hours: 1.5, target: 2.0 },
  { day: 'Thu', hours: 4.2, target: 2.0 },
  { day: 'Fri', hours: 2.8, target: 2.0 },
  { day: 'Sat', hours: 5.0, target: 2.5 },
  { day: 'Sun', hours: 3.1, target: 2.0 }
];
