export type TrainingModule = {
  slug: string;
  title: string;
  category: string;
  duration: string;
  sections: { title: string; body: string }[];
};

export const trainingModules: TrainingModule[] = [
  {
    slug: 'hr-employment',
    title: 'HR & Employment Training',
    category: 'Employment',
    duration: '35 min',
    sections: [
      {
        title: 'Governance and EOR Operating Model',
        body: 'Isitha Global is the South African employer. The UK client provides the operational assignment. Removal from a client assignment does not automatically terminate employment.',
      },
      {
        title: 'Recruitment, Vetting and Onboarding',
        body: 'Recruitment must be fair, job-related and documented. Identity, right-to-work, payroll and statutory information must be verified and onboarding completed.',
      },
      {
        title: 'Employment Contract and Assignment Schedule',
        body: 'The client assignment is recorded separately from the employment relationship. Reporting lines, time-zone expectations and travel or site requirements must be clear.',
      },
      {
        title: 'Probation',
        body: 'Probation is used to assess suitability and performance. Standards must be explained, feedback provided and review meetings documented.',
      },
      {
        title: 'Working Hours, Overtime and UK Time Zones',
        body: 'Cross-border assignments must not create uncontrolled or unsafe working hours. Repeated after-hours demands or fatigue concerns must be escalated to Isitha Global.',
      },
      {
        title: 'Leave, Payroll and Employee Records',
        body: 'Leave, payroll and statutory records are administered by Isitha Global in accordance with South African employment requirements.',
      },
      {
        title: 'Performance, Discipline and Grievances',
        body: 'Performance and conduct concerns must follow fair processes. Employees may raise grievances and should use Isitha Global HR channels where client personnel are involved.',
      },
      {
        title: 'Privacy, IT and Confidentiality',
        body: 'Employees must protect personal information, company systems, client information and confidential material, and comply with applicable POPIA and cybersecurity requirements.',
      },
    ],
  },

  {
    slug: 'ohsa-awareness',
    title: 'OHSA Awareness Training',
    category: 'Health & Safety',
    duration: '30–45 min',
    sections: [
      {
        title: '1. Who is responsible for safety?',
        body: 'Isitha Global manages its employer health-and-safety duties. Every employee must also take reasonable care for their own safety and that of others affected by their work.',
      },
      {
        title: '2. Recognising and reporting hazards',
        body: 'Report hazards, unsafe conditions and near misses promptly. Corrective action should be recorded so the business can demonstrate that risks were addressed.',
      },
      {
        title: '3. Remote and home-working safety',
        body: 'Maintain a reasonably suitable work area, use stable furniture, position screens to reduce strain and update the remote-working risk assessment after material changes.',
      },
      {
        title: '4. Electrical and fire safety',
        body: 'Do not use damaged plugs or cables, avoid overloaded sockets, keep combustibles away from heat sources and know the emergency exit arrangements for your workplace.',
      },
      {
        title: '5. Ergonomics and screen work',
        body: 'Set up the workstation for comfortable posture, reduce glare, keep frequently used equipment within reach and take reasonable movement and screen breaks.',
      },
      {
        title: '6. Working hours, fatigue and UK time zones',
        body: 'Report repeated unreasonable after-hours demands or fatigue. Do not drive or perform safety-sensitive activity when dangerously fatigued.',
      },
      {
        title: '7. Accidents, injuries and COIDA',
        body: 'Get urgent medical help first where needed, then report work-related accidents and injuries promptly so Isitha Global can assess incident and COIDA requirements.',
      },
      {
        title: '8. Client premises, travel and site visits',
        body: 'Follow client and site induction rules, do not perform work you are not trained or authorised to perform, and report unsafe instructions or conditions.',
      },
      {
        title: '9. Emergencies',
        body: 'Know how to evacuate, where to assemble and who to contact. Do not re-enter premises until the relevant authority confirms it is safe.',
      },
      {
        title: '10. Safety culture and employee rights',
        body: 'Raise genuine safety concerns promptly. Employees should participate in training, cooperate with reasonable controls and report unsafe conditions without fear of retaliation.',
      },
    ],
  },

  {
    slug: 'emergency-induction',
    title: 'Emergency & Office Induction',
    category: 'Health & Safety',
    duration: '15 min',
    sections: [
      {
        title: 'Evacuation',
        body: 'Stop work, leave by the nearest safe designated exit, proceed to the assembly point, report for accountability and do not re-enter until authorised.',
      },
      {
        title: 'First Aid',
        body: 'Know who the trained first aiders are and where first-aid equipment is located. Seek appropriate emergency medical assistance for serious incidents.',
      },
      {
        title: 'Incident and Near-Miss Reporting',
        body: 'Accidents, injuries, hazards and near misses must be reported promptly. Isitha Global will determine whether external or COIDA reporting is required.',
      },
      {
        title: 'New Starter Induction',
        body: 'Employees must be shown emergency exits, assembly points, first-aid arrangements, reporting channels, workstation safety and relevant office safety controls.',
      },
    ],
  },
];

export const quiz = [
  {
    q: 'Who is the South African employer in the EOR arrangement?',
    options: ['The UK client', 'Isitha Global', 'The employee'],
    answer: 1,
  },
  {
    q: 'What should you do if repeated after-hours client demands create fatigue?',
    options: [
      'Ignore it',
      'Report it to Isitha Global',
      'Work additional hours without recording them',
    ],
    answer: 1,
  },
  {
    q: 'What is the correct response to a workplace hazard?',
    options: [
      'Report it promptly',
      'Wait for the annual review',
      'Only report it if someone is injured',
    ],
    answer: 0,
  },
  {
    q: 'During an evacuation, when may you re-enter?',
    options: [
      'After collecting your belongings',
      'When a colleague says it is fine',
      'When the appropriate authority confirms it is safe',
    ],
    answer: 2,
  },
  {
    q: 'What is the recommended pass mark for this OHSA assessment?',
    options: ['50%', '80%', '100%'],
    answer: 1,
  },
];
