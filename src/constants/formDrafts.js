/** Stable localStorage keys for form autosave drafts. */
export const FORM_DRAFT_KEYS = {
  editIntro: 'edit-intro',
  candidateSetup: 'setup-candidate',
  companySetup: 'setup-company',
  publishJob: (jobId) => (jobId ? `publish-job-${jobId}` : 'publish-job-new'),
  verification: 'company-verification',
  experienceModal: (id) => (id ? `experience-${id}` : 'experience-new'),
  educationModal: (id) => (id ? `education-${id}` : 'education-new'),
  certificationModal: (id) => (id ? `certification-${id}` : 'certification-new'),
  projectModal: (id) => (id ? `project-${id}` : 'project-new'),
  languageModal: (id) => (id ? `language-${id}` : 'language-new'),
  companyEdit: (mode) => `company-edit-${mode}`,
};
