import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import UserProfileLink from '../common/UserProfileLink';
import CompanyNameWithBadge from '../company/CompanyNameWithBadge';
import { useFollow } from '../../hooks/useFollow';
import { FOLLOWS_TARGET } from '../../services/follows.service';
import { FEED_RECOMMENDATION_SUBTYPES } from '../../constants/feedContentTypes';
import { AUTHOR_TYPES } from '../../constants/authorTypes';

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

function isPersonalSubtype(subtype) {
  return (
    subtype === FEED_RECOMMENDATION_SUBTYPES.PERSONAL ||
    subtype === FEED_RECOMMENDATION_SUBTYPES.CANDIDATE ||
    subtype === 'candidate' ||
    subtype === 'personal' ||
    subtype === 'person'
  );
}

function isBusinessSubtype(subtype) {
  return (
    subtype === FEED_RECOMMENDATION_SUBTYPES.BUSINESS ||
    subtype === FEED_RECOMMENDATION_SUBTYPES.COMPANY ||
    subtype === 'company' ||
    subtype === 'business'
  );
}

function isOrganizationSubtype(subtype) {
  return (
    subtype === FEED_RECOMMENDATION_SUBTYPES.ORGANIZATION ||
    subtype === FEED_RECOMMENDATION_SUBTYPES.INSTITUTION ||
    subtype === 'institution' ||
    subtype === 'organization'
  );
}

const shellClass =
  'surface-flat border-b border-app-divider py-space-base last:border-b-0 sm:py-space-lg';

export default function FeedRecommendationCard({ item }) {
  const { subtype } = item.payload ?? {};

  if (isPersonalSubtype(subtype)) {
    const profile = item.payload.profile ?? item.payload.candidate_profile;
    if (!profile) return null;

    return (
      <article className={shellClass}>
        <p className="mb-space-sm text-caption font-medium text-app-subtle">Persona recomendada</p>
        <div className="flex items-start gap-space-md">
          <UserProfileLink
            userId={profile.user_id}
            userType={AUTHOR_TYPES.PERSONAL}
            name={profile.full_name ?? 'Persona'}
            avatar={profile.avatar_path}
            path={`/profile/${profile.user_id}`}
            size="md"
            layout="avatar"
          />
          <div className="min-w-0 flex-1">
            <UserProfileLink
              userId={profile.user_id}
              userType={AUTHOR_TYPES.PERSONAL}
              name={profile.full_name ?? 'Persona'}
              path={`/profile/${profile.user_id}`}
              layout="name"
            />
            {profile.headline ? (
              <p className="text-body-small text-app-muted">{profile.headline}</p>
            ) : null}
            {profile.city ? (
              <p className="mt-space-xs text-caption text-app-subtle">{profile.city}</p>
            ) : null}
          </div>
          <Link
            to={`/profile/${profile.user_id}`}
            className="shrink-0 text-body-small font-medium text-primary-600 hover:text-primary-700"
          >
            Ver
          </Link>
        </div>
      </article>
    );
  }

  if (isBusinessSubtype(subtype)) {
    const company = item.payload.company;
    if (!company) return null;

    return (
      <article className={shellClass}>
        <p className="mb-space-sm text-caption font-medium text-app-subtle">Empresa recomendada</p>
        <div className="flex items-start gap-space-md">
          <UserProfileLink
            userId={company.user_id}
            userType={AUTHOR_TYPES.BUSINESS}
            name={company.company_name}
            avatar={company.logo_path}
            path={`/companies/${company.user_id}`}
            size="md"
            layout="avatar"
          />
          <div className="min-w-0 flex-1">
            <CompanyNameWithBadge company={company} userId={company.user_id} />
            <p className="text-body-small text-app-muted">
              {[company.sector, company.city].filter(Boolean).join(' · ')}
            </p>
          </div>
          <FollowSuggestionButton
            targetType={FOLLOWS_TARGET.BUSINESS}
            targetId={company.user_id}
          />
        </div>
      </article>
    );
  }

  if (isOrganizationSubtype(subtype)) {
    const institution = item.payload.institution ?? item.payload.organization;
    if (!institution) return null;

    return (
      <article className={shellClass}>
        <p className="mb-space-sm text-caption font-medium text-app-subtle">
          Organización recomendada
        </p>
        <div className="flex items-start gap-space-md">
          <UserProfileLink
            userId={institution.user_id}
            userType={AUTHOR_TYPES.ORGANIZATION}
            name={institution.company_name}
            avatar={institution.logo_path}
            path={`/companies/${institution.user_id}`}
            size="md"
            layout="avatar"
          />
          <div className="min-w-0 flex-1">
            <UserProfileLink
              userId={institution.user_id}
              userType={AUTHOR_TYPES.ORGANIZATION}
              name={institution.company_name}
              path={`/companies/${institution.user_id}`}
              layout="name"
            />
            <p className="text-body-small text-app-muted">
              {[institution.company_type, institution.city].filter(Boolean).join(' · ')}
            </p>
          </div>
          <FollowSuggestionButton
            targetType={FOLLOWS_TARGET.ORGANIZATION}
            targetId={institution.user_id}
          />
        </div>
      </article>
    );
  }

  return null;
}
