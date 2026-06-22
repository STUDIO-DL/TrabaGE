import { supabase } from '../config/supabase';
import { ROLES } from '../constants/roles';

export const searchService = {
  async search({ query, role }) {
    if (!query || !role) {
      return { data: [], error: null };
    }

    const searchTerm = `%${query.trim().replace(/ /g, '%')}%`;

    if (role === ROLES.CANDIDATE) {
      // Los candidatos buscan ofertas de empleo
      return supabase
        .from('job_postings')
        .select('*, company_profiles(name, logo_url)')
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},tags.ilike.${searchTerm}`);
    }

    if (role === ROLES.COMPANY) {
      // Las empresas buscan perfiles de candidatos
      return supabase
        .from('candidate_profiles')
        .select('*')
        .or(
          `full_name.ilike.${searchTerm},headline.ilike.${searchTerm},bio.ilike.${searchTerm},skills.ilike.${searchTerm}`,
        );
    }

    // Por defecto, no devolver nada si el rol no es ni candidato ni empresa
    return { data: [], error: null };
  },
};