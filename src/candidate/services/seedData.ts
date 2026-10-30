import {
  CandidateProfile,
  JobRole,
  HiringDrive,
  AlternativeCityOffer,
  InterviewSlot,
  TimedSlotOffer,
  AttendanceRecord,
  AbsenceAppeal,
  TravelClaim,
  RelocationClaim
} from '../types';

export const INITIAL_CANDIDATE: CandidateProfile = {
  id: 'cnd-priya-01',
  userId: 'usr-auth-priya',
  driveId: 'drv-2026-q4-eng',
  roleId: 'role-fse',
  fullName: 'Priya Sundaram',
  email: 'priya.sundaram@outlook.com',
  phone: '+91 97410 88231',
  currentCity: 'Chennai',
  bio: 'Full Stack Engineer with 3.8 years building distributed React/Node.js web platforms, event architectures, and cloud services. Enthusiastic about clean system architecture and developer ergonomics.',
  portfolioUrl: 'https://priyasundaram.dev',
  githubUrl: 'https://github.com/priyasundaram',
  linkedinUrl: 'https://linkedin.com/in/priya-sundaram-eng',
  avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  experienceYears: 3.8,
  education: [
    {
      id: 'edu-1',
      institution: 'Anna University, College of Engineering Guindy',
      degree: 'Bachelor of Technology (B.Tech)',
      fieldOfStudy: 'Computer Science & Engineering',
      graduationYear: 2023,
      gradeOrCgpa: '8.8 / 10.0'
    }
  ],
  experienceHistory: [
    {
      id: 'exp-1',
      companyName: 'NexScale Tech Systems',
      roleTitle: 'Software Engineer - Frontend & Core APIs',
      startDate: '2023-07-01',
      isCurrent: true,
      summary: 'Architected scalable frontend components using React, TypeScript, and Tailwind CSS. Implemented microservices handling 2M+ daily requests.'
    },
    {
      id: 'exp-2',
      companyName: 'Cognitive Matrix Labs',
      roleTitle: 'Associate Software Developer Intern',
      startDate: '2022-12-01',
      endDate: '2023-06-15',
      isCurrent: false,
      summary: 'Built PostgreSQL indexing optimization pipelines and containerized testing setups with Docker.'
    }
  ],
  skills: [
    { skillName: 'React & TypeScript', rating: 5, matchesRequirement: true },
    { skillName: 'Node.js & Microservices', rating: 4, matchesRequirement: true },
    { skillName: 'PostgreSQL / SQL', rating: 4, matchesRequirement: true },
    { skillName: 'Docker / CI-CD', rating: 3, matchesRequirement: true },
    { skillName: 'Kubernetes & Helm', rating: 2, matchesRequirement: false },
    { skillName: 'Python & PySpark', rating: 2, matchesRequirement: false }
  ],
  locationPreferences: [
    { city: 'Bangalore', priority: 1 },
    { city: 'Hyderabad', priority: 2 },
    { city: 'Pune', priority: 3 }
  ],
  relocation: {
    willingToRelocate: true,
    preferredTimeline: '30_DAYS',
    earliestRelocationDate: '2026-11-20',
    requiresCorporateStay: true,
    requiresMovingAssistance: true,
    conditionsNotes: 'Assistance required for temporary corporate guest house stay during initial 14-day transition period.'
  },
  assessmentScore: 89,
  allocatedCity: 'Bangalore',
  allocationStatus: 'ALLOCATED',
  interviewSlotId: 'slt-101',
  reconfirmedAttendance: true,
  reconfirmedAt: '2026-10-29T10:30:00Z',
  createdAt: '2026-10-15T09:00:00Z',
  updatedAt: '2026-10-29T11:00:00Z'
};

export const SEED_DRIVES: HiringDrive[] = [
  {
    id: 'drv-2026-q4-eng',
    title: 'Autumn 2026 Engineering & Platform Campus Cohort',
    batchCode: 'ENG-2026-Q4-TECH',
    startDate: '2026-10-15',
    endDate: '2026-11-28',
    status: 'ACTIVE',
    targetRoles: ['role-fse', 'role-cpa', 'role-dse'],
    targetLocations: ['Bangalore', 'Hyderabad', 'Pune', 'Gurgaon', 'Mumbai'],
    totalTargetHires: 65
  },
  {
    id: 'drv-2026-q4-ops',
    title: 'Product Operations & Security Fellowship',
    batchCode: 'OPS-2026-Q4-GLOBAL',
    startDate: '2026-11-01',
    endDate: '2026-12-15',
    status: 'INTERVIEWING',
    targetRoles: ['role-pos', 'role-esa'],
    targetLocations: ['Bangalore', 'Gurgaon', 'Hyderabad'],
    totalTargetHires: 35
  }
];

export const SEED_ROLES: JobRole[] = [
  {
    id: 'role-fse',
    title: 'Senior Full Stack Engineer',
    department: 'Core Platform Engineering',
    experienceBand: '3-5 YRS',
    minExperienceYears: 3.5,
    cutoffScore: 72,
    baseSalaryMin: 2200000,
    baseSalaryMax: 3200000,
    currency: 'INR',
    active: true,
    description: 'Design and deploy mission-critical distributed frontend systems, real-time sync engines, and microservices in React and Node.js.',
    requiredSkills: [
      { id: 'sk-react', name: 'React & TypeScript', isMandatory: true, minProficiency: 4, weight: 35 },
      { id: 'sk-node', name: 'Node.js & Microservices', isMandatory: true, minProficiency: 3, weight: 30 },
      { id: 'sk-sql', name: 'PostgreSQL / SQL', isMandatory: true, minProficiency: 3, weight: 20 },
      { id: 'sk-docker', name: 'Docker / CI-CD', isMandatory: false, minProficiency: 3, weight: 15 }
    ]
  },
  {
    id: 'role-cpa',
    title: 'Cloud Platform Architect',
    department: 'Infrastructure & SRE',
    experienceBand: '5-8 YRS',
    minExperienceYears: 5.0,
    cutoffScore: 78,
    baseSalaryMin: 3500000,
    baseSalaryMax: 4800000,
    currency: 'INR',
    active: true,
    description: 'Lead multi-region Kubernetes topologies, infrastructure-as-code automation, and zero-trust cloud network architecture.',
    requiredSkills: [
      { id: 'sk-k8s', name: 'Kubernetes & Helm', isMandatory: true, minProficiency: 4, weight: 40 },
      { id: 'sk-terraform', name: 'Terraform & IaC', isMandatory: true, minProficiency: 4, weight: 30 },
      { id: 'sk-gcp', name: 'GCP / AWS Architecture', isMandatory: true, minProficiency: 4, weight: 30 }
    ]
  },
  {
    id: 'role-dse',
    title: 'Data Systems Engineer',
    department: 'Data & Analytics Systems',
    experienceBand: '3-5 YRS',
    minExperienceYears: 3.0,
    cutoffScore: 70,
    baseSalaryMin: 2400000,
    baseSalaryMax: 3400000,
    currency: 'INR',
    active: true,
    description: 'Architect low-latency streaming analytics pipelines and data warehouse data lakehouse pipelines.',
    requiredSkills: [
      { id: 'sk-python', name: 'Python & PySpark', isMandatory: true, minProficiency: 4, weight: 35 },
      { id: 'sk-bigquery', name: 'BigQuery / Snowflake', isMandatory: true, minProficiency: 3, weight: 35 },
      { id: 'sk-dbt', name: 'dbt & Airflow', isMandatory: false, minProficiency: 3, weight: 30 }
    ]
  }
];

export const SEED_ALTERNATIVE_OFFER: AlternativeCityOffer = {
  id: 'alt-off-001',
  candidateId: 'cnd-priya-01',
  candidateName: 'Priya Sundaram',
  originalPreferredCity: 'Bangalore',
  offeredCity: 'Hyderabad',
  driveId: 'drv-2026-q4-eng',
  roleId: 'role-fse',
  relocationBonusOffered: 75000,
  currency: 'INR',
  status: 'PENDING',
  sentAt: '2026-10-28T14:30:00Z',
  expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  notes: 'Bangalore engineering hub has reached maximum capacity for this cohort. We are pleased to extend an expedited placement in our Hyderabad Technology Campus with a ₹75,000 relocation lump-sum grant and 14 days corporate guest house accommodation.'
};

export const SEED_SLOTS: InterviewSlot[] = [
  {
    id: 'slt-101',
    driveId: 'drv-2026-q4-eng',
    roleId: 'role-fse',
    date: '2026-11-04',
    startTime: '10:00',
    endTime: '10:45',
    mode: 'VIRTUAL',
    venueOrLink: 'https://meet.google.com/hsc-tech-01',
    locationCity: 'Bangalore',
    panel: {
      leadInterviewerName: 'Devika Krishnan',
      leadInterviewerEmail: 'd.krishnan@hireslot.com',
      shadowInterviewerName: 'Sameer Joshi',
      department: 'Platform Core'
    },
    maxCandidates: 1,
    status: 'BOOKED',
    bookedCandidateId: 'cnd-priya-01',
    bookedCandidateName: 'Priya Sundaram',
    notes: 'Technical Architecture & Live Problem Solving Round',
    isRecoveredSlot: false
  },
  {
    id: 'slt-102',
    driveId: 'drv-2026-q4-eng',
    roleId: 'role-fse',
    date: '2026-11-04',
    startTime: '11:15',
    endTime: '12:00',
    mode: 'VIRTUAL',
    venueOrLink: 'https://meet.google.com/hsc-tech-02',
    locationCity: 'Bangalore',
    panel: {
      leadInterviewerName: 'Marcus Wright',
      leadInterviewerEmail: 'm.wright@hireslot.com',
      department: 'Frontend Systems'
    },
    maxCandidates: 1,
    status: 'AVAILABLE',
    isRecoveredSlot: false
  },
  {
    id: 'slt-103',
    driveId: 'drv-2026-q4-eng',
    roleId: 'role-fse',
    date: '2026-11-05',
    startTime: '14:00',
    endTime: '14:45',
    mode: 'IN_PERSON',
    venueOrLink: 'HireSlot Bangalore Tech Center - 4th Floor, Tech Hub Tower A',
    locationCity: 'Bangalore',
    panel: {
      leadInterviewerName: 'Rajesh Nair',
      leadInterviewerEmail: 'r.nair@hireslot.com',
      department: 'Enterprise Delivery'
    },
    maxCandidates: 1,
    status: 'AVAILABLE',
    isRecoveredSlot: true,
    notes: 'In-person coding review round'
  }
];

export const SEED_TIMED_OFFER: TimedSlotOffer = {
  id: 'tmo-8812',
  slotId: 'slt-103',
  candidateId: 'cnd-priya-01',
  offeredAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 14 * 60 * 1000 + 45 * 1000).toISOString(), // ~15 minutes countdown
  slotDetails: {
    date: '2026-11-05',
    time: '14:00 - 14:45',
    city: 'Bangalore',
    role: 'Senior Full Stack Engineer'
  },
  status: 'ACTIVE'
};

export const SEED_ATTENDANCE: AttendanceRecord = {
  id: 'att-101',
  slotId: 'slt-101',
  candidateId: 'cnd-priya-01',
  candidateName: 'Priya Sundaram',
  roleTitle: 'Senior Full Stack Engineer',
  scheduledTime: '2026-11-04T10:00:00Z',
  status: 'SCHEDULED'
};

export const SEED_TRAVEL_CLAIMS: TravelClaim[] = [
  {
    id: 'trv-clm-001',
    candidateId: 'cnd-priya-01',
    candidateName: 'Priya Sundaram',
    driveId: 'drv-2026-q4-eng',
    category: 'TRAIN_TRAVEL',
    claimAmount: 3250,
    approvedAmount: 3250,
    currency: 'INR',
    invoiceDate: '2026-10-27',
    receiptFileName: 'Vande_Bharat_Express_Chennai_Bangalore_Ticket.pdf',
    status: 'HR_APPROVED',
    policyLimitNotes: 'Within Regional Hub Travel Policy (Executive Chair Car covered up to ₹4,000).',
    submittedAt: '2026-10-28T09:30:00Z'
  }
];

export const SEED_RELOCATION_CLAIM: RelocationClaim = {
  id: 'reloc-clm-001',
  candidateId: 'cnd-priya-01',
  candidateName: 'Priya Sundaram',
  driveId: 'drv-2026-q4-eng',
  relocationFromCity: 'Chennai',
  relocationToCity: 'Bangalore',
  grantAmount: 75000,
  currency: 'INR',
  bankAccountMasked: '•••• •••• 4491',
  bankIfsc: 'HDFC0001824',
  status: 'QUEUED_FOR_PAYROLL',
  submittedAt: '2026-10-29T14:00:00Z'
};

