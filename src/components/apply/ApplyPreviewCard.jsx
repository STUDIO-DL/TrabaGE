import Card from '../ui/Card';
import AppIcon from '../common/AppIcon';
import { BadgeCheck, ICON_SIZES } from '../../constants/icons';

function PreviewItem({ children }) {
  return (
    <li className="flex items-start gap-space-sm text-body-small text-app-text">
      <AppIcon
        icon={BadgeCheck}
        size={ICON_SIZES.sm}
        className="mt-0.5 shrink-0 text-success-600"
        aria-hidden
      />
      <span>{children}</span>
    </li>
  );
}

export default function ApplyPreviewCard({ cvName, hasCoverLetter }) {
  return (
    <Card padding="md" className="bg-app-surface">
      <h3 className="mb-space-md text-button font-semibold text-app-text">Se enviará:</h3>
      <ul className="space-y-space-sm" aria-label="Resumen de lo que se enviará">
        <PreviewItem>
          CV{cvName ? `: ${cvName}` : ''}
        </PreviewItem>
        {hasCoverLetter ? <PreviewItem>Carta de presentación</PreviewItem> : null}
        <PreviewItem>Tu perfil profesional de TrabaGE</PreviewItem>
      </ul>
      <p className="mt-space-md text-caption leading-relaxed text-app-muted">
        La empresa también verá tu experiencia, educación, habilidades, idiomas, certificaciones y
        enlaces públicos de tu perfil.
      </p>
    </Card>
  );
}
