import { popiaTrainingModule } from './popia-training';
import type { PortalRole } from './authz';

export type TrainingModule = {
  slug: string;
  title: string;
  category: string;
  duration: string;
  roles?: PortalRole[];
  sections: { title: string; body: string }[];
};

export const trainingModules: TrainingModule[] = [
  {
    slug: 'hr-employment', title: 'HR & Employment Training', category: 'Employment', duration: '35 min',
    sections: [
      { title: 'Governance and EOR Operating Model', body: 'Isitha Global is the South African employer. The UK client provides the operational assignment. Removal from a client assignment does not automatically terminate employment.' },
      { title: 'Recruitment, Vetting and Onboarding', body: 'Recruitment must be fair, job-related and documented. Identity, right-to-work, payroll and statutory information must be verified and onboarding completed.' },
      { title: 'Employment Contract and Assignment Schedule', body: 'The client assignment is recorded separately from the employment relationship. Reporting lines, time-zone expectations and travel or site requirements must be clear.' },
      { title: 'Probation', body: 'Probation is used to assess suitability and performance. Standards must be explained, feedback provided and review meetings documented.' },
      { title: 'Working Hours, Overtime and UK Time Zones', body: 'Cross-border assignments must not create uncontrolled or unsafe working hours. Repeated after-hours demands or fatigue concerns must be escalated to Isitha Global.' },
      { title: 'Leave, Payroll and Employee Records', body: 'Leave, payroll and statutory records are administered by Isitha Global in accordance with South African employment requirements.' },
      { title: 'Performance, Discipline and Grievances', body: 'Performance and conduct concerns must follow fair processes. Employees may raise grievances and should use Isitha Global HR channels where client personnel are involved.' },
      { title: 'Privacy, IT and Confidentiality', body: 'Employees must protect personal information, company systems, client information and confidential material, and comply with applicable POPIA and cybersecurity requirements.' },
    ],
  },
  {
    slug: 'ohsa-awareness', title: 'OHSA Awareness Training', category: 'Health & Safety', duration: '30–45 min',
    sections: [
      { title: '1. Who is responsible for safety?', body: 'Isitha Global manages its employer health-and-safety duties. Every employee must also take reasonable care for their own safety and that of others affected by their work.' },
      { title: '2. Recognising and reporting hazards', body: 'Report hazards, unsafe conditions and near misses promptly. Corrective action should be recorded so the business can demonstrate that risks were addressed.' },
      { title: '3. Remote and home-working safety', body: 'Maintain a reasonably suitable work area, use stable furniture, position screens to reduce strain and update the remote-working risk assessment after material changes.' },
      { title: '4. Electrical and fire safety', body: 'Do not use damaged plugs or cables, avoid overloaded sockets, keep combustibles away from heat sources and know the emergency exit arrangements for your workplace.' },
      { title: '5. Ergonomics and screen work', body: 'Set up the workstation for comfortable posture, reduce glare, keep frequently used equipment within reach and take reasonable movement and screen breaks.' },
      { title: '6. Working hours, fatigue and UK time zones', body: 'Report repeated unreasonable after-hours demands or fatigue. Do not drive or perform safety-sensitive activity when dangerously fatigued.' },
      { title: '7. Accidents, injuries and COIDA', body: 'Get urgent medical help first where needed, then report work-related accidents and injuries promptly so Isitha Global can assess incident and COIDA requirements.' },
      { title: '8. Client premises, travel and site visits', body: 'Follow client and site induction rules, do not perform work you are not trained or authorised to perform, and report unsafe instructions or conditions.' },
      { title: '9. Emergencies', body: 'Know how to evacuate, where to assemble and who to contact. Do not re-enter premises until the relevant authority confirms it is safe.' },
      { title: '10. Safety culture and employee rights', body: 'Raise genuine safety concerns promptly. Employees should participate in training, cooperate with reasonable controls and report unsafe conditions without fear of retaliation.' },
    ],
  },
  {
    slug: 'emergency-induction', title: 'Emergency & Office Induction', category: 'Health & Safety', duration: '15 min',
    sections: [
      { title: 'Evacuation', body: 'Stop work, leave by the nearest safe designated exit, proceed to the assembly point, report for accountability and do not re-enter until authorised.' },
      { title: 'First Aid', body: 'Know who the trained first aiders are and where first-aid equipment is located. Seek appropriate emergency medical assistance for serious incidents.' },
      { title: 'Incident and Near-Miss Reporting', body: 'Accidents, injuries, hazards and near misses must be reported promptly. Isitha Global will determine whether external or COIDA reporting is required.' },
      { title: 'New Starter Induction', body: 'Employees must be shown emergency exits, assembly points, first-aid arrangements, reporting channels, workstation safety and relevant office safety controls.' },
    ],
  },
  popiaTrainingModule,
  {
    slug: 'cybersecurity-information-security', title: 'Cybersecurity & Information Security', category: 'Information Security', duration: '25 min',
    sections: [
      { title: 'Protecting company and client information', body: 'Company, employee, candidate and client information must only be accessed for legitimate work purposes and shared only with authorised people. Confidential information must not be copied to personal accounts, unapproved cloud storage or personal messaging services.' },
      { title: 'Passwords and multi-factor authentication', body: 'Use strong, unique passwords and approved password-management practices. Never share passwords or MFA codes. MFA prompts you did not initiate must be rejected and reported.' },
      { title: 'Phishing and social engineering', body: 'Treat unexpected links, attachments, login requests, payment instructions and urgent requests for sensitive information with caution. Verify unusual requests using a trusted contact method before acting.' },
      { title: 'Email and payment fraud', body: 'Changes to bank details, payroll instructions or supplier payment details must be independently verified. Do not rely solely on an email reply or a telephone number supplied in a suspicious message.' },
      { title: 'Devices and remote working', body: 'Keep work devices locked when unattended, install required updates, use approved security software and avoid exposing confidential work in public places. Lost or stolen devices must be reported immediately.' },
      { title: 'Safe handling and sharing of data', body: 'Check recipients before sending email, use approved storage and sharing systems, and apply the minimum access necessary. Personal information must be handled consistently with POPIA and company policy.' },
      { title: 'Security incidents', body: 'Report suspected phishing, malware, unauthorised access, accidental disclosure, lost devices and other security incidents immediately. Do not delete evidence or attempt to conceal a mistake; prompt reporting helps contain harm.' },
      { title: 'Client systems', body: 'When working on UK client systems, follow both Isitha Global requirements and the client security rules. Access must not be shared with colleagues who have not been authorised by the client.' },
    ],
  },
  {
    slug: 'workplace-conduct-harassment', title: 'Harassment, Discrimination & Workplace Conduct', category: 'Employment', duration: '25 min',
    sections: [
      { title: 'Respectful workplace', body: 'Everyone must be treated with dignity and respect. Bullying, intimidation, victimisation, harassment and discriminatory conduct are not acceptable, whether they occur in person, online, through messaging platforms or during work-related social activities.' },
      { title: 'Harassment', body: 'Harassment can include unwanted conduct that impairs dignity or creates a hostile, intimidating or offensive work environment. It may be verbal, physical, visual, written or digital and can involve a single serious incident or repeated behaviour.' },
      { title: 'Sexual harassment', body: 'Unwelcome sexual attention, sexual comments, requests for sexual favours, inappropriate touching, sexual images or messages and other unwanted conduct of a sexual nature are prohibited. Consent and professional boundaries must be respected.' },
      { title: 'Discrimination', body: 'Employment decisions and workplace treatment must be fair and must not amount to unfair discrimination on protected or arbitrary grounds. Employees should raise concerns where they believe they or another person are being treated unfairly.' },
      { title: 'Bullying and inappropriate behaviour', body: 'Legitimate performance management is not bullying when conducted fairly and professionally. Humiliation, threats, personal abuse, deliberate exclusion and repeated unreasonable behaviour are not acceptable management practices.' },
      { title: 'Client and remote-working environments', body: 'The same standards apply when employees work remotely or with UK clients. Inappropriate behaviour by client personnel should be reported to Isitha Global rather than being accepted as part of the assignment.' },
      { title: 'Reporting a concern', body: 'Employees should report harassment, discrimination, bullying or retaliation through the available manager or HR channel. Reports should be handled sensitively, promptly and as confidentially as reasonably possible.' },
      { title: 'No retaliation and cooperation', body: 'Victimisation or retaliation against a person who raises a genuine concern or participates in an investigation is unacceptable. Employees must cooperate honestly with reasonable workplace investigations.' },
    ],
  },
  {
    slug: 'manager-people-management', title: 'Manager People Management & Compliance', category: 'Management', duration: '35 min', roles: ['manager', 'hr_admin', 'admin'],
    sections: [
      { title: 'Manager responsibilities and the EOR model', body: 'Managers direct day-to-day work but must remember that Isitha Global is the South African employer. A client decision to remove someone from an assignment does not automatically end the employee’s employment. Escalate material employment decisions to HR.' },
      { title: 'Fair performance management and probation', body: 'Set clear, job-related expectations, give timely feedback, record concerns and allow a reasonable opportunity to improve where appropriate. Probation should be actively managed and documented rather than used as an automatic route to dismissal.' },
      { title: 'Leave and attendance management', body: 'Apply leave rules consistently, consider business needs fairly and keep decisions documented. Managers must not approve their own leave or bypass the normal approval route. Attendance concerns should be raised promptly with HR where they may require formal action.' },
      { title: 'Working hours, overtime and fatigue', body: 'Monitor repeated excessive hours, after-hours demands and fatigue risks, especially on UK-aligned assignments. Do not encourage unrecorded or unsafe working practices; escalate recurring issues to HR.' },
      { title: 'Discipline and misconduct', body: 'Managers should establish facts, preserve relevant evidence and avoid pre-judging an outcome. Formal warnings, hearings or dismissal processes must follow the applicable fair procedure and should be coordinated with HR.' },
      { title: 'Grievances, harassment and discrimination', body: 'Take complaints seriously, do not retaliate, avoid promising absolute confidentiality and refer concerns through the appropriate HR process. Managers should not conduct an informal process that could compromise a later investigation.' },
      { title: 'Employee privacy and POPIA', body: 'Access employee information only where required for the management role. Use approved systems, keep information secure and avoid discussing medical, disciplinary, payroll or other confidential information with people who do not need it.' },
      { title: 'Health, safety and wellbeing', body: 'Act on reported hazards, incidents, near misses and wellbeing concerns. Managers should support reasonable controls and escalate work-related injuries or safety-sensitive concerns promptly so the correct OHSA or COIDA process can be assessed.' },
      { title: 'Managing remote and client-assigned staff', body: 'Maintain regular communication, clear objectives and appropriate supervision. Client instructions do not override Isitha Global policies or South African employment obligations, and conflicts should be escalated rather than passed directly to the employee.' },
      { title: 'Records and when to involve HR', body: 'Keep factual records of performance discussions, attendance concerns, leave decisions, complaints and material management actions. Involve HR early where an issue could lead to formal discipline, termination, a grievance, discrimination allegation, medical issue or legal risk.' },
    ],
  },
  {
    slug: 'hr-compliance-employee-relations', title: 'HR Compliance & Employee Relations', category: 'HR & Compliance', duration: '40 min', roles: ['hr_admin', 'admin'],
    sections: [
      { title: 'HR governance and the EOR employment relationship', body: 'Isitha Global remains the South African employer for employees placed with UK clients. HR must distinguish between client assignment management and the employment relationship and ensure employment decisions are made through the correct South African process.' },
      { title: 'BCEA records, working time and leave', body: 'Maintain accurate employment, working-time, remuneration and leave records as required by applicable law and company policy. Review unusual overtime, fatigue or leave patterns and resolve discrepancies with payroll and management.' },
      { title: 'Discipline, incapacity and dismissal', body: 'Formal action must be based on appropriate grounds and a fair process. HR should ensure allegations and evidence are clear, the employee has a fair opportunity to respond, outcomes are documented and specialist advice is obtained for higher-risk cases.' },
      { title: 'Grievances and employee relations', body: 'Acknowledge grievances promptly, identify conflicts of interest, appoint an appropriate investigator or decision-maker where needed, keep a fair record and communicate outcomes through the established process.' },
      { title: 'Equality, discrimination and harassment', body: 'Employment practices should be fair and should not amount to unfair discrimination. Harassment complaints require sensitive handling, protection against retaliation and a process consistent with applicable employment-equity requirements and company policy.' },
      { title: 'POPIA and confidential HR information', body: 'HR handles high-risk personal information. Collect only what is necessary, restrict access, use approved systems, apply appropriate retention controls and manage disclosures or suspected breaches through the organisation’s privacy process.' },
      { title: 'Recruitment, onboarding and employee records', body: 'Recruitment criteria should be job-related and documented. Verify required identity, payroll, statutory and employment information, ensure contracts and onboarding records are complete and correct inaccurate records promptly.' },
      { title: 'OHSA, COIDA and workplace incidents', body: 'HR should coordinate with responsible health-and-safety personnel when workplace injuries, hazards or incidents occur and ensure the business assesses any reporting, medical, accommodation or COIDA obligations without unnecessary delay.' },
      { title: 'Client assignment changes and termination risk', body: 'A client request to replace or remove a worker must be assessed separately from termination of employment. HR should identify redeployment, performance, misconduct, operational-requirement or other relevant issues before any employment outcome is decided.' },
      { title: 'Audit trail, escalation and legal review', body: 'Maintain a reliable audit trail of material HR decisions and approvals. Escalate unusual, high-risk or legally uncertain matters to senior HR, management or appropriate professional advisers instead of relying on assumptions or informal precedent.' },
    ],
  },
];

export const quiz = [
  { q: 'Who is the South African employer in the EOR arrangement?', options: ['The UK client', 'Isitha Global', 'The employee'], answer: 1 },
  { q: 'What should you do if repeated after-hours client demands create fatigue?', options: ['Ignore it', 'Report it to Isitha Global', 'Work additional hours without recording them'], answer: 1 },
  { q: 'What is the correct response to a workplace hazard?', options: ['Report it promptly', 'Wait for the annual review', 'Only report it if someone is injured'], answer: 0 },
  { q: 'During an evacuation, when may you re-enter?', options: ['After collecting your belongings', 'When a colleague says it is fine', 'When the appropriate authority confirms it is safe'], answer: 2 },
  { q: 'What is the recommended pass mark for this OHSA assessment?', options: ['50%', '80%', '100%'], answer: 1 },
];
