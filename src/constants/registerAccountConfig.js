import { Briefcase, Building2, GraduationCap, Landmark, User } from 'lucide-react';

import { ACCOUNT_KINDS } from './accountKinds';
import { SECTORS } from './sectors';
import { ORGANIZATION_COMPANY_TYPES } from './feedContentTypes';

/**
 * User-facing organization types. Each option maps to a stored `company_type`
 * that MUST remain within ORGANIZATION_COMPANY_TYPES so the profile keeps being
 * classified as an organization (see utils/orgLabels.isOrganizationProfile).
 */
export const ORGANIZATION_TYPE_OPTIONS = [
  { value: 'Universidad', label: 'Universidad', companyType: 'Institucion publica' },
  { value: 'Centro de Formación', label: 'Centro de Formación', companyType: 'Institucion publica' },
  { value: 'Colegio', label: 'Colegio', companyType: 'Institucion publica' },
  { value: 'Academia', label: 'Academia', companyType: 'Institucion publica' },
  { value: 'Instituto Público', label: 'Instituto Público', companyType: 'Institucion publica' },
  { value: 'ONG Educativa', label: 'ONG Educativa', companyType: 'ONG' },
];

/** @deprecated Use ORGANIZATION_TYPE_OPTIONS */
export const INSTITUTION_TYPE_OPTIONS = ORGANIZATION_TYPE_OPTIONS;

const DEFAULT_ORGANIZATION_COMPANY_TYPE = 'Institucion publica';

/**
 * Maps a friendly organization type to a stored `company_type` guaranteed to be
 * a valid ORGANIZATION_COMPANY_TYPES value.
 */
export function organizationTypeToCompanyType(value) {
  const match = ORGANIZATION_TYPE_OPTIONS.find((option) => option.value === value);
  const companyType = match?.companyType ?? DEFAULT_ORGANIZATION_COMPANY_TYPE;
  return ORGANIZATION_COMPANY_TYPES.includes(companyType)
    ? companyType
    : DEFAULT_ORGANIZATION_COMPANY_TYPE;
}

/** @deprecated Use organizationTypeToCompanyType */
export function institutionTypeToCompanyType(value) {
  return organizationTypeToCompanyType(value);
}

/**
 * Per-account-type registration schema. Each config declares the account-type
 * specific fields to render (name + extras), the adaptive email copy, and how
 * to build the signup metadata so the three flows share a single code path.
 */
export const REGISTER_ACCOUNT_CONFIG = {
  [ACCOUNT_KINDS.PERSONAL]: {
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
        errorKey: 'registerFullNameRequired',
      },
    ],
    buildMetadata: (values, common) => ({
      fullName: values.fullName?.trim() || undefined,
      city: common.city,
      accountKind: ACCOUNT_KINDS.PERSONAL,
    }),
  },
  [ACCOUNT_KINDS.BUSINESS]: {
    emailLabel: 'Correo empresarial',
    emailPlaceholder: 'nombre@negocio.com',
    fields: [
      {
        key: 'orgName',
        type: 'text',
        label: 'Nombre del negocio',
        placeholder: 'Ej. Tech Solutions Ltd.',
        icon: Building2,
        autoComplete: 'organization',
        required: true,
        errorKey: 'registerBusinessNameRequired',
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
      accountKind: ACCOUNT_KINDS.BUSINESS,
      orgDetails: {
        company_name: values.orgName?.trim() || undefined,
        sector: values.sector || undefined,
      },
    }),
  },
  [ACCOUNT_KINDS.ORGANIZATION]: {
    emailLabel: 'Correo de la organización',
    emailPlaceholder: 'nombre@organizacion.com',
    fields: [
      {
        key: 'orgName',
        type: 'text',
        label: 'Nombre de la organización',
        placeholder: 'Ej. Universidad Nacional',
        icon: Landmark,
        autoComplete: 'organization',
        required: true,
        errorKey: 'registerOrgNameRequired',
      },
      {
        key: 'organizationType',
        type: 'select',
        label: 'Tipo de organización',
        placeholder: 'Selecciona el tipo',
        icon: GraduationCap,
        options: ORGANIZATION_TYPE_OPTIONS,
        required: true,
        errorKey: 'registerOrgTypeRequired',
      },
    ],
    buildMetadata: (values, common) => ({
      city: common.city,
      accountKind: ACCOUNT_KINDS.ORGANIZATION,
      orgDetails: {
        company_name: values.orgName?.trim() || undefined,
        company_type: organizationTypeToCompanyType(
          values.organizationType || values.institutionType,
        ),
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
  const kind =
    accountKind === 'candidate'
      ? ACCOUNT_KINDS.PERSONAL
      : accountKind === 'company'
        ? ACCOUNT_KINDS.BUSINESS
        : accountKind === 'institution'
          ? ACCOUNT_KINDS.ORGANIZATION
          : accountKind;
  return REGISTER_ACCOUNT_CONFIG[kind] ?? REGISTER_ACCOUNT_CONFIG[ACCOUNT_KINDS.PERSONAL];
}
