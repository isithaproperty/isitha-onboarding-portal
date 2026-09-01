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
};
