import {
  Briefcase,
  Calendar,
  Globe,
  GraduationCap,
  Landmark,
  Sparkles,
  Target,
  Users,
} from './icons';

/** Section-specific icons for discover empty states (copy is shared via EmptyPublicationsState). */
export const DISCOVER_SECTION_ICONS = {
  hiring: Briefcase,
  scholarships: GraduationCap,
  internships: Briefcase,
  events: Calendar,
  calls: Landmark,
  courses: Sparkles,
  entrepreneurs: Target,
  volunteering: Users,
  international: Globe,
};

/** @deprecated Use DISCOVER_SECTION_ICONS — kept for imports during transition. */
export const DISCOVER_EMPTY_STATES = Object.fromEntries(
  Object.entries(DISCOVER_SECTION_ICONS).map(([id, icon]) => [id, { icon }]),
);
