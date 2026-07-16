/**
 * Deep link architecture — single source of truth for shareable content paths.
 *
 * These clean, public path patterns are reused by:
 *  - URL generation for sharing (`generateShareUrl.js`)
 *  - Public routing entry points (`App.jsx`)
 *  - Future native universal links (iOS) / Android App Links, which can map the
 *    same content types to the same paths so shared links open directly in the
 *    installed app or PWA.
 */

/** Builders that turn a content id into its clean public path. */
export const DEEP_LINK_PATHS = {
  post: (id) => `/post/${id}`,
  job: (id) => `/job/${id}`,
  profile: (id) => `/profile/${id}`,
  company: (id) => `/companies/${id}`,
};

/**
 * React Router path patterns for the public deep-link entry routes.
 * Param names match what each destination component reads via `useParams`.
 */
export const DEEP_LINK_ROUTE_PATTERNS = {
  post: '/post/:postId',
  job: '/job/:id',
  profile: '/profile/:userId',
  company: '/companies/:companyId',
};

/**
 * PWA share_target handler path (see public/manifest.json). Prepared so the app
 * can later receive shares from the OS share sheet. TODO: implement a handler
 * screen once inbound-share flows are defined.
 */
export const SHARE_TARGET_PATH = '/';
