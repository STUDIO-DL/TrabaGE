import { Briefcase, Building2, GraduationCap, Landmark, User } from 'lucide-react';

import { ACCOUNT_KINDS } from './accountKinds';
import { SECTORS } from './sectors';
import { INSTITUTION_COMPANY_TYPES } from './feedContentTypes';

/**
 * User-facing institution types. Each option maps to a stored `company_type`
 * that MUST remain within INSTITUTION_COMPANY_TYPES so the profile keeps being
 * classified as an institution (see utils/orgLabels.isInstitutionProfile).
 */
export const INSTITUTION_TYPE_OPTIONS = [
  { value: 'Universidad', label: 'Universidad', companyType: 'Institucion publica' },
  { value: 'Centro de Formación', label: 'Centro de Formación', companyType: 'Institucion publica' },
  { value: 'Colegio', label: 'Colegio', companyType: 'Institucion publica' },
  { value: 'Academia', label: 'Academia', companyType: 'Institucion publica' },
  { value: 'Instituto Público', label: 'Instituto Público', companyType: 'Institucion publica' },
  { value: 'ONG Educativa', label: 'ONG Educativa', companyType: 'ONG' },
];

const DEFAULT_INSTITUTION_COMPANY_TYPE = 'Institucion publica';

/**
 * Maps a friendly institution type to a stored `company_type` guaranteed to be
 * a valid INSTITUTION_COMPANY_TYPES value.
 */
export function institutionTypeToCompanyType(value) {
  const match = INSTITUTION_TYPE_OPTIONS.find((option) => option.value === value);
  const companyType = match?.companyType ?? DEFAULT_INSTITUTION_COMPANY_TYPE;
  return INSTITUTION_COMPANY_TYPES.includes(companyType)
    ? companyType
    : DEFAULT_INSTITUTION_COMPANY_TYPE;
}

/**
 * Per-account-type registration schema. Each config declares the account-type
 * specific fields to render (name + extras), the adaptive email copy, and how
 * to build the signup metadata so the three flows share a single code path.
 */
export const REGISTER_ACCOUNT_CONFIG = {
  [ACCOUNT_KINDS.CANDIDATE]: {
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'ejemplo@correo.com',
    fields: [
      {
        key: 'fullName',
        type: 'text',
        label: 'Nombre completo',
        placeholder: 'Ej. Juan Pérez',
        icon: User,
        autoComplete: 'name',
        required: true,
        requiredMessage: 'Introduce tu nombre completo.',
      },
    ],
    buildMetadata: (values, common) => ({
      fullName: values.fullName?.trim() || undefined,
      city: common.city,
      accountKind: ACCOUNT_KINDS.CANDIDATE,
    }),
  },
  [ACCOUNT_KINDS.COMPANY]: {
    emailLabel: 'Correo empresarial',
    emailPlaceholder: 'nombre@empresa.com',
    fields: [
      {
        key: 'orgName',
        type: 'text',
        label: 'Nombre de la empresa',
        placeholder: 'Ej. Tech Solutions Ltd.',
        icon: Building2,
        autoComplete: 'organization',
        required: true,
        requiredMessage: 'Introduce el nombre de la empresa.',
      },
      {
        key: 'sector',
        type: 'select',
        label: 'Sector o industria',
        placeholder: 'Selecciona un sector',
        icon: Briefcase,
        options: SECTORS,
        required: false,
      },
    ],
    buildMetadata: (values, common) => ({
      city: common.city,
      accountKind: ACCOUNT_KINDS.COMPANY,
      orgDetails: {
        company_name: values.orgName?.trim() || undefined,
        sector: values.sector || undefined,
      },
    }),
  },
  [ACCOUNT_KINDS.INSTITUTION]: {
    emailLabel: 'Correo institucional',
    emailPlaceholder: 'nombre@institucion.com',
    fields: [
      {
        key: 'orgName',
        type: 'text',
        label: 'Nombre de la institución',
        placeholder: 'Ej. Universidad Nacional',
        icon: Landmark,
        autoComplete: 'organization',
        required: true,
        requiredMessage: 'Introduce el nombre de la institución.',
      },
      {
        key: 'institutionType',
        type: 'select',
        label: 'Tipo de institución',
        placeholder: 'Selecciona el tipo',
        icon: GraduationCap,
        options: INSTITUTION_TYPE_OPTIONS,
        required: true,
        requiredMessage: 'Selecciona el tipo de institución.',
      },
    ],
    buildMetadata: (values, common) => ({
      city: common.city,
      accountKind: ACCOUNT_KINDS.INSTITUTION,
      orgDetails: {
        company_name: values.orgName?.trim() || undefined,
        company_type: institutionTypeToCompanyType(values.institutionType),
      },
    }),
  },
};

/** Normalizes a field's options into a consistent { value, label } array. */
export function normalizeFieldOptions(options = []) {
  return options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option,
  );
}

export function getRegisterConfig(accountKind) {
  return REGISTER_ACCOUNT_CONFIG[accountKind] ?? REGISTER_ACCOUNT_CONFIG[ACCOUNT_KINDS.CANDIDATE];
}
