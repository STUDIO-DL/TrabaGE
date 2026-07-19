import { memo } from 'react';
import ExpandableText from '../common/ExpandableText';
import { SectionItemActions } from './ProfileSectionCard';
import { resolveProjectImageUrl } from '../../utils/storagePaths';

function ProjectCard({ project, isOwn, onEdit, onDelete }) {
  const imageUrl = resolveProjectImageUrl(project.image_path);

  return (
    <article className="overflow-hidden rounded-radius-md border border-app-divider bg-app-card">
      {imageUrl && (
        <div className="aspect-[16/10] w-full overflow-hidden bg-app-surface">
          <img
            src={imageUrl}
            alt={project.title || 'Proyecto'}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="p-space-md">
        <h4 className="text-subtitle font-semibold text-app-text">{project.title}</h4>
        <ExpandableText text={project.description} className="mt-space-sm" />
        <SectionItemActions
          isOwn={isOwn}
          onEdit={onEdit ? () => onEdit(project) : undefined}
          onDelete={onDelete ? () => onDelete(project) : undefined}
        />
      </div>
    </article>
  );
}

export default memo(ProjectCard);
