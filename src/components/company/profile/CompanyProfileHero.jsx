import { getCompanyLogoUrl } from '../../../constants/images';
import { getCompanyDisplayName } from '../../../utils/companyProfile';
import CompanyVerificationStatus from './CompanyVerificationStatus';

export default function CompanyProfileHero({ profile }) {
  const logoSrc = getCompanyLogoUrl(profile?.logo_path);
  const name = getCompanyDisplayName(profile);

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 px-4 pb-10 pt-6 text-white">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-primary-400/20 blur-2xl"
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="overflow-hidden rounded-2xl bg-white p-1 shadow-xl shadow-primary-950/20 ring-4 ring-white/20">
          <img
            src={logoSrc}
            alt={name}
            className="h-24 w-24 object-cover sm:h-28 sm:w-28"
          />
        </div>

        <h2 className="mt-4 text-2xl font-bold tracking-tight">{name}</h2>

        <div className="mt-3">
          <CompanyVerificationStatus company={profile} profile />
        </div>

        {(profile?.sector || profile?.city) && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {profile?.sector && (
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-primary-50 backdrop-blur-sm">
                {profile.sector}
              </span>
            )}
            {profile?.city && (
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-primary-50 backdrop-blur-sm">
                {profile.city}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
