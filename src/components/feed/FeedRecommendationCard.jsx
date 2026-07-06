import { Link } from 'react-router-dom';
import Card from '../ui/Card';
import Button from '../ui/Button';
import UserProfileLink from '../common/UserProfileLink';
import CompanyNameWithBadge from '../company/CompanyNameWithBadge';
import { useFollow } from '../../hooks/useFollow';
import { FOLLOWS_TARGET } from '../../services/follows.service';
import { FEED_RECOMMENDATION_SUBTYPES } from '../../constants/feedContentTypes';
import { getCompanyLogoUrl } from '../../constants/images';
import { resolveUserAvatar } from '../../utils/resolveUserAvatar';

function FollowSuggestionButton({ targetType, targetId }) {
  const { isFollowing, actionLoading, toggleFollow } = useFollow({ targetType, targetId });

  return (
    <Button
      size="sm"
      variant={isFollowing ? 'secondary' : 'primary'}
      loading={actionLoading}
      onClick={toggleFollow}
    >
      {isFollowing ? 'Siguiendo' : 'Seguir'}
    </Button>
  );
}

export default function FeedRecommendationCard({ item }) {
  const { subtype } = item.payload ?? {};

  if (subtype === FEED_RECOMMENDATION_SUBTYPES.CANDIDATE) {
    const profile = item.payload.profile ?? item.payload.candidate_profile;
    if (!profile) return null;

    return (
      <Card className="mb-3">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-primary-600">
          Candidato recomendado
        </p>
        <div className="flex items-start justify-between gap-3">
          <UserProfileLink
            userId={profile.user_id}
            userType="candidate"
            name={profile.full_name ?? 'Candidato'}
            avatar={resolveUserAvatar(profile.avatar_path)}
            path={`/profile/${profile.user_id}`}
            size="md"
            layout="avatar"
          />
          <div className="min-w-0 flex-1">
            <UserProfileLink
              userId={profile.user_id}
              userType="candidate"
              name={profile.full_name ?? 'Candidato'}
              path={`/profile/${profile.user_id}`}
              layout="name"
            />
            {profile.headline && <p className="text-sm text-gray-500">{profile.headline}</p>}
            {profile.city && <p className="mt-1 text-xs text-gray-400">{profile.city}</p>}
          </div>
          <Link
            to={`/profile/${profile.user_id}`}
            className="shrink-0 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Ver perfil
          </Link>
        </div>
      </Card>
    );
  }

  if (subtype === FEED_RECOMMENDATION_SUBTYPES.COMPANY) {
    const company = item.payload.company;
    if (!company) return null;

    return (
      <Card className="mb-3">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-primary-600">
          Empresa recomendada
        </p>
        <div className="flex items-start justify-between gap-3">
          <UserProfileLink
            userId={company.user_id}
            userType="company"
            name={company.company_name}
            avatar={getCompanyLogoUrl(company.logo_path)}
            path={`/companies/${company.user_id}`}
            size="md"
            layout="avatar"
          />
          <div className="min-w-0 flex-1">
            <CompanyNameWithBadge company={company} userId={company.user_id} />
            <p className="text-sm text-gray-500">
              {[company.sector, company.city].filter(Boolean).join(' • ')}
            </p>
          </div>
          <FollowSuggestionButton
            targetType={FOLLOWS_TARGET.COMPANY}
            targetId={company.user_id}
          />
        </div>
      </Card>
    );
  }

  if (subtype === FEED_RECOMMENDATION_SUBTYPES.INSTITUTION) {
    const institution = item.payload.institution;
    if (!institution) return null;

    return (
      <Card className="mb-3">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-primary-600">
          Institución recomendada
        </p>
        <div className="flex items-start justify-between gap-3">
          <UserProfileLink
            userId={institution.user_id}
            userType="company"
            name={institution.company_name}
            avatar={getCompanyLogoUrl(institution.logo_path)}
            path={`/companies/${institution.user_id}`}
            size="md"
            layout="avatar"
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900">{institution.company_name}</p>
            <p className="text-sm text-gray-500">
              {[institution.company_type, institution.city].filter(Boolean).join(' • ')}
            </p>
          </div>
          <FollowSuggestionButton
            targetType={FOLLOWS_TARGET.INSTITUTION}
            targetId={institution.user_id}
          />
        </div>
      </Card>
    );
  }

  return null;
}
