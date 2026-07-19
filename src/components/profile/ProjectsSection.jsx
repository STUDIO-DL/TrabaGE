import { memo } from 'react';
import ProfileSectionCard from './ProfileSectionCard';
import ProjectCard from './ProjectCard';
import { PROFILE_SECTION_ICONS } from './ProfileIcons';
import { getProfileSectionEmptyCopy } from '../../utils/copyLabels';
import { MAX_PROJECTS_PER_PROFILE } from '../../constants/projects';

function ProjectsSection({ items = [], isOwn, onAdd, onEdit, onDelete }) {
  const sortedItems = items;
  const atLimit = sortedItems.length >= MAX_PROJECTS_PER_PROFILE;
  const canAdd = isOwn && onAdd && !atLimit;

  return (
    <ProfileSectionCard
      icon={PROFILE_SECTION_ICONS.projects}
      iconTone="projects"
      title="Proyectos"
      isOwn={isOwn}
      onAdd={canAdd ? onAdd : undefined}
      addLabel="Añadir proyecto"
      isEmpty={!sortedItems.length}
      emptyText={getProfileSectionEmptyCopy('projects', isOwn)}
    >
      {isOwn && atLimit && (
        <p className="mb-space-md text-sm text-app-muted">
          Has alcanzado el límite de 3 proyectos.
        </p>
      )}

      {sortedItems.length > 0 && (
        <div className="grid gap-space-md">
          {sortedItems.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isOwn={isOwn}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </ProfileSectionCard>
  );
}

export default memo(ProjectsSection);
