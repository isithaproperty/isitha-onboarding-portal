export type AssessmentQuestion = { q: string; options: string[]; answer: number };

export const complianceAssessments: Record<string, { title: string; questions: AssessmentQuestion[] }> = {
  'cybersecurity-information-security': {
    title: 'Cybersecurity & Information Security Assessment',
    questions: [
      { q: 'What should you do with an unexpected MFA approval request?', options: ['Approve it quickly', 'Reject it and report it', 'Ignore it permanently'], answer: 1 },
      { q: 'What is the safest way to respond to an unusual request to change bank details?', options: ['Use the details in the email immediately', 'Independently verify the change using a trusted contact method', 'Forward it to a colleague and let them decide'], answer: 1 },
      { q: 'Which password practice is correct?', options: ['Reuse one strong password everywhere', 'Share passwords with your manager', 'Use strong, unique passwords and never share MFA codes'], answer: 2 },
      { q: 'What should happen if a work device is lost or stolen?', options: ['Wait to see if it turns up', 'Report it immediately', 'Only report it if client data was definitely stored on it'], answer: 1 },
      { q: 'Where should confidential work information be stored?', options: ['Approved company or client systems', 'Personal email', 'Any free cloud storage account'], answer: 0 },
      { q: 'What should you check before sending sensitive information by email?', options: ['Only the subject line', 'The recipient and that the sharing method is approved', 'Whether the email looks professional'], answer: 1 },
      { q: 'If you click a suspicious link by mistake, what should you do?', options: ['Delete the email and say nothing', 'Report the incident promptly', 'Restart your computer and continue working'], answer: 1 },
      { q: 'Can you share access to a UK client system with an unauthorised colleague?', options: ['Yes, if they work for Isitha Global', 'Only if the client has authorised their access', 'Yes, if it saves time'], answer: 1 },
      { q: 'Which is a common sign of phishing or social engineering?', options: ['An unexpected urgent request for credentials or payment', 'A routine calendar invitation', 'A company policy document'], answer: 0 },
      { q: 'What is the pass mark for this assessment?', options: ['60%', '70%', '80%'], answer: 2 },
    ],
  },
  'workplace-conduct-harassment': {
    title: 'Harassment, Discrimination & Workplace Conduct Assessment',
    questions: [
      { q: 'Which workplace standard applies to everyone?', options: ['Treat colleagues and clients with dignity and respect', 'Only managers must behave professionally', 'Different standards apply online'], answer: 0 },
      { q: 'Can harassment occur through messaging or online platforms?', options: ['No', 'Yes', 'Only outside working hours'], answer: 1 },
      { q: 'Which of these may amount to sexual harassment?', options: ['Unwelcome sexual comments or messages', 'A normal work instruction', 'A documented performance review'], answer: 0 },
      { q: 'What should an employee do if inappropriate behaviour comes from a client representative?', options: ['Accept it as part of the assignment', 'Report it to Isitha Global', 'Immediately resign without reporting it'], answer: 1 },
      { q: 'Is fair and professional performance management automatically bullying?', options: ['Yes', 'No', 'Only if the employee disagrees with it'], answer: 1 },
      { q: 'Which behaviour is not acceptable?', options: ['Respectful feedback', 'Humiliation, threats or personal abuse', 'A reasonable instruction'], answer: 1 },
      { q: 'How should genuine harassment or discrimination concerns be handled?', options: ['Ignored unless there are witnesses', 'Reported through the available manager or HR channel', 'Posted publicly first'], answer: 1 },
      { q: 'What is retaliation after someone raises a genuine complaint?', options: ['Acceptable management practice', 'Unacceptable victimisation', 'Required during an investigation'], answer: 1 },
      { q: 'Do workplace conduct standards apply during work-related social activities?', options: ['Yes', 'No', 'Only to managers'], answer: 0 },
      { q: 'What is the pass mark for this assessment?', options: ['50%', '70%', '80%'], answer: 2 },
    ],
  },
  'manager-people-management': {
    title: 'Manager People Management & Compliance Assessment',
    questions: [
      { q: 'A UK client asks for an employee to be removed from its assignment. What should the manager assume?', options: ['The employee is automatically dismissed', 'The assignment issue must be escalated because removal does not automatically end employment', 'The employee must resign'], answer: 1 },
      { q: 'What is the best first approach to a performance concern?', options: ['Record clear expectations, evidence and feedback and follow a fair improvement process', 'Issue an immediate final warning in every case', 'Ignore it until the annual review'], answer: 0 },
      { q: 'Can a manager approve their own leave?', options: ['Yes', 'No, it must follow the appropriate approval route', 'Only for annual leave'], answer: 1 },
      { q: 'What should a manager do when an employee raises a harassment complaint?', options: ['Take it seriously, avoid retaliation and escalate it through the appropriate HR process', 'Investigate informally and promise absolute secrecy', 'Tell the employee to resolve it directly with the accused person'], answer: 0 },
      { q: 'What should happen when repeated after-hours work is creating fatigue?', options: ['Treat it as normal client service', 'Address and escalate the recurring risk', 'Ask the employee not to record the extra hours'], answer: 1 },
      { q: 'How should a manager handle confidential employee information?', options: ['Share it with the team when useful', 'Access only what is needed and use approved secure systems', 'Keep copies in personal messaging apps'], answer: 1 },
      { q: 'Before formal disciplinary action, what should a manager do?', options: ['Establish facts, preserve evidence and involve HR in the fair process', 'Decide the outcome first', 'Dismiss immediately if the allegation sounds serious'], answer: 0 },
      { q: 'What should a manager do with a reported health-and-safety concern?', options: ['Act or escalate promptly', 'Wait for someone to be injured', 'Only record it at year end'], answer: 0 },
      { q: 'How should a genuine employee grievance be handled?', options: ['Acknowledge it and follow the appropriate fair channel', 'Ignore it if the manager disagrees', 'Reduce the employee’s duties for raising it'], answer: 0 },
      { q: 'What is the pass mark for this assessment?', options: ['60%', '70%', '80%'], answer: 2 },
    ],
  },
  'hr-compliance-employee-relations': {
    title: 'HR Compliance & Employee Relations Assessment',
    questions: [
      { q: 'Does the end of a UK client assignment automatically terminate South African employment?', options: ['Yes', 'No, the employment position must be assessed separately', 'Only if the client requests it by email'], answer: 1 },
      { q: 'What principle should guide formal disciplinary or dismissal processes?', options: ['Speed above all else', 'Appropriate grounds and a fair process', 'The client’s preferred outcome only'], answer: 1 },
      { q: 'How should HR handle employee personal information under POPIA principles?', options: ['Collect everything in case it becomes useful', 'Collect what is necessary, restrict access and use approved systems', 'Store copies in personal email'], answer: 1 },
      { q: 'How should a harassment or discrimination complaint be managed?', options: ['Promptly, sensitively and without retaliation through a fair process', 'Publicly so everyone knows about it', 'Only if two witnesses support it'], answer: 0 },
      { q: 'What should HR do with leave, working-time and employment records?', options: ['Keep them accurate and reconcile material discrepancies', 'Rely on verbal recollection', 'Delete them after each payroll'], answer: 0 },
      { q: 'What should recruitment decisions be based on?', options: ['Job-related, fair and documented criteria', 'Personal preference only', 'Any information found online regardless of relevance'], answer: 0 },
      { q: 'What should happen after a work-related injury or significant incident?', options: ['Assess and coordinate the required safety, medical and COIDA processes promptly', 'Wait for the employee to raise it again', 'Treat it only as a performance issue'], answer: 0 },
      { q: 'Why is a reliable HR audit trail important?', options: ['It supports accurate records, approvals and fair decision-making', 'It removes the need for HR judgement', 'It allows confidential records to be shared widely'], answer: 0 },
      { q: 'What should HR do when a case presents unusual or uncertain legal risk?', options: ['Guess based on the last case', 'Escalate for appropriate senior or professional advice', 'Let the client make the employment decision alone'], answer: 1 },
      { q: 'What is the pass mark for this assessment?', options: ['50%', '70%', '80%'], answer: 2 },
    ],
  },
};
