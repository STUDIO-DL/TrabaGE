/**
 * TrabaGE transactional welcome email — orchestrator.
 * Layout/branding in layout.ts; copy per account type in templates.ts.
 */
export {
  DEFAULT_FROM_EMAIL,
  EMAIL_SENDER_NAME,
} from './constants.ts';

export { formatGreeting } from './layout.ts';

export {
  buildWelcomeEmailContent,
  getWelcomeEmailSubject,
} from './templates.ts';

export { buildWelcomeEmailHtml, buildWelcomeEmailText } from './layout.ts';
