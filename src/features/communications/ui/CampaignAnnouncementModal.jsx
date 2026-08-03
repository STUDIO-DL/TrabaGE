import { useNavigate } from 'react-router-dom';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { LINK_TYPES } from '../domain/constants';

function openCampaignLink(navigate, campaign) {
  const url = campaign.link_url?.trim();
  if (!url || campaign.link_type === LINK_TYPES.NONE) return;

  if (campaign.link_type === LINK_TYPES.INTERNAL || url.startsWith('/')) {
    navigate(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Elegant modal for informational / legal / feature / maintenance campaigns.
 */
export default function CampaignAnnouncementModal({
  campaign,
  isOpen,
  onPrimary,
  onSecondary,
  onDismiss,
}) {
  const navigate = useNavigate();
  if (!campaign) return null;

  const canDismiss = campaign.allow_dismiss !== false;

  const handlePrimary = async () => {
    await onPrimary?.();
    openCampaignLink(navigate, campaign);
    if (canDismiss) onDismiss?.({ via: 'primary' });
  };

  const handleSecondary = async () => {
    await onSecondary?.();
    if (canDismiss) onDismiss?.({ via: 'secondary' });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={canDismiss ? () => onDismiss?.({ via: 'close' }) : () => {}}
      title={campaign.title}
      size="md"
      dismissible={canDismiss}
    >
      <div className="space-y-space-lg">
        {campaign.description ? (
          <p className="whitespace-pre-wrap text-body leading-relaxed text-app-muted">
            {campaign.description}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-space-sm sm:flex-row sm:justify-end">
          {canDismiss && campaign.secondary_cta_label ? (
            <Button type="button" variant="secondary" onClick={handleSecondary}>
              {campaign.secondary_cta_label}
            </Button>
          ) : null}
          <Button type="button" onClick={handlePrimary}>
            {campaign.primary_cta_label || 'Continuar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
