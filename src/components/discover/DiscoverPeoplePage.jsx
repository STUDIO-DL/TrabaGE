import PageContainer from '../layout/PageContainer';
import EmptyState from '../common/EmptyState';
import Button from '../ui/Button';
import { ProfileCardSkeleton } from '../common/Skeleton';
import DiscoverPersonCard from './DiscoverPersonCard';
import { useDiscoverPeople } from '../../hooks/useDiscoverPeople';
import { Users } from '../../constants/icons';
import {
  DISCOVER_PEOPLE_EMPTY_DESCRIPTION,
  DISCOVER_PEOPLE_EMPTY_TITLE,
  DISCOVER_PEOPLE_NETWORK_DESCRIPTION,
  DISCOVER_PEOPLE_NETWORK_TITLE,
} from '../../constants/emptyContent';

function PeopleListSkeleton({ count = 6 }) {
  return (
    <div className="space-y-space-sm p-space-base" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <ProfileCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function DiscoverPeoplePage() {
  const { people, loading, loadingMore, hasMore, error, reload, loadMore } = useDiscoverPeople();

  return (
    <PageContainer title="Descubrir personas" backButton>
      {loading ? (
        <PeopleListSkeleton />
      ) : error && people.length === 0 ? (
        <EmptyState
          variant="text"
          icon={Users}
          title={DISCOVER_PEOPLE_NETWORK_TITLE}
          description={DISCOVER_PEOPLE_NETWORK_DESCRIPTION}
          actionLabel="Reintentar"
          onAction={reload}
        />
      ) : people.length === 0 ? (
        <EmptyState
          variant="text"
          icon={Users}
          title={DISCOVER_PEOPLE_EMPTY_TITLE}
          description={DISCOVER_PEOPLE_EMPTY_DESCRIPTION}
        />
      ) : (
        <div className="space-y-space-sm p-space-base">
          {people.map((person) => (
            <DiscoverPersonCard key={person.user_id} person={person} />
          ))}

          {hasMore ? (
            <div className="flex justify-center pt-space-sm pb-space-base">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={loadingMore}
                onClick={loadMore}
              >
                Ver más
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </PageContainer>
  );
}
