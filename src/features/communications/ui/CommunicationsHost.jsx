import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { APP_VERSION } from '../../../constants/zarrel';
import { communicationsService } from '../data/communications.service';
import { isFeedbackSurface } from '../domain/constants';
import CampaignAnnouncementModal from './CampaignAnnouncementModal';
import FeedbackPromptCard from './FeedbackPromptCard';
import FeedbackSurveySheet from './FeedbackSurveySheet';

const GUEST_HIDE_KEY = 'trabage.communications.guestHidden';

function readGuestHidden() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(GUEST_HIDE_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function writeGuestHidden(ids) {
  sessionStorage.setItem(GUEST_HIDE_KEY, JSON.stringify([...ids]));
}

/**
 * Global host: surfaces one active campaign at a time for authenticated users
 * (and session-local feedback cards for guests when preview mode is on).
 */
export default function CommunicationsHost() {
  const { user, role, isAuthenticated, isPreviewMode } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [hiddenIds, setHiddenIds] = useState(() => readGuestHidden());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || isPreviewMode || !user?.id) {
      setCampaigns([]);
      return;
    }
    const { data, error } = await communicationsService.getActiveForMe();
    if (!error) setCampaigns(Array.isArray(data) ? data : []);
  }, [isAuthenticated, isPreviewMode, user?.id]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 120_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const active = useMemo(() => {
    return campaigns.find((c) => !hiddenIds.has(c.id)) || null;
  }, [campaigns, hiddenIds]);

  const hideLocally = (id) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      writeGuestHidden(next);
      return next;
    });
  };

  const markShown = useCallback(async (campaign) => {
    if (!campaign?.id || isPreviewMode) return;
    await communicationsService.recordEvent(campaign.id, 'shown');
  }, [isPreviewMode]);

  useEffect(() => {
    if (active?.id) void markShown(active);
  }, [active?.id, markShown]);

  if (!active) return null;

  const feedback = isFeedbackSurface(active.campaign_type);

  if (feedback) {
    return (
      <>
        {!sheetOpen ? (
          <FeedbackPromptCard
            campaign={active}
            onOpenMore={async () => {
              if (!isPreviewMode) {
                await communicationsService.recordEvent(active.id, 'opened');
              }
              setSheetOpen(true);
            }}
            onHide={() => {
              // X hides card only — not a survey response / dismiss for until_dismiss.
              hideLocally(active.id);
            }}
          />
        ) : null}
        <FeedbackSurveySheet
          campaign={active}
          isOpen={sheetOpen}
          onClose={() => setSheetOpen(false)}
          submitting={submitting}
          onSubmit={async ({ rating, improvementText, commentText }) => {
            if (isPreviewMode) return true;
            setSubmitting(true);
            const { error } = await communicationsService.submitResponse({
              campaignId: active.id,
              rating,
              improvementText,
              commentText,
              appVersion: APP_VERSION,
              accountType: role,
            });
            setSubmitting(false);
            if (error) return false;
            hideLocally(active.id);
            await refresh();
            return true;
          }}
        />
      </>
    );
  }

  return (
    <CampaignAnnouncementModal
      campaign={active}
      isOpen
      onPrimary={async () => {
        if (!isPreviewMode) {
          await communicationsService.recordEvent(active.id, 'cta_primary');
        }
      }}
      onSecondary={async () => {
        if (!isPreviewMode) {
          await communicationsService.recordEvent(active.id, 'cta_secondary');
        }
      }}
      onDismiss={async ({ via } = {}) => {
        if (!isPreviewMode) {
          // Primary CTA on non-dismissible campaigns still closes the surface after action.
          if (via === 'close' || via === 'secondary' || via === 'primary') {
            await communicationsService.recordEvent(active.id, 'dismissed');
          }
        }
        hideLocally(active.id);
        await refresh();
      }}
    />
  );
}
