import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import CandidateProfileLayout from '../../components/profile/CandidateProfileLayout';
import ProfileSidebar from '../../components/profile/ProfileSidebar';
import AboutSection from '../../components/profile/AboutSection';
import PersonalSocialSection from '../../components/profile/PersonalSocialSection';
import ExperienceSection from '../../components/profile/ExperienceSection';
import EducationSection from '../../components/profile/EducationSection';
import ProjectsSection from '../../components/profile/ProjectsSection';
import CertificationsSection from '../../components/profile/CertificationsSection';
import SkillsSection from '../../components/profile/SkillsSection';
import ServicesSection from '../../components/profile/ServicesSection';
import LanguagesSection from '../../components/profile/LanguagesSection';
import PortfolioLinksSection from '../../components/profile/PortfolioLinksSection';
import DocumentsSection from '../../components/profile/DocumentsSection';
import ExperienceModal from '../../components/profile/modals/ExperienceModal';
import EducationModal from '../../components/profile/modals/EducationModal';
import ProjectModal from '../../components/profile/modals/ProjectModal';
import CertificationModal from '../../components/profile/modals/CertificationModal';
import LanguageModal from '../../components/profile/modals/LanguageModal';
import FetchErrorBanner from '../../components/common/FetchErrorBanner';
import { ProfilePageSkeleton } from '../../components/common/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { useCandidateProfile } from '../../hooks/useCandidateProfile';
import { useProjectMutations } from '../../hooks/useProjects';
import { useNotificationContext } from '../../context/NotificationContext';
import { validateFile } from '../../utils/validateFile';
import { generateProfileUrl } from '../../utils/generateShareUrl';
import { shareContent, getShareDescription } from '../../utils/shareContent';
import { TOAST } from '../../utils/copyLabels';

export default function Profile() {
  const navigate = useNavigate();
  const { user, isPreviewMode } = useAuth();
  const { showToast } = useNotificationContext();
  const {
    profile,
    loading,
    error,
    refetch,
    updateBasicInfo,
    uploadAvatar,
    uploadCV,
    uploadCover,
    removeCover,
    saveCoverLetter,
    addExperience,
    updateExperience,
    deleteExperience,
    addEducation,
    updateEducation,
    deleteEducation,
    syncEducationIntro,
    addCertification,
    updateCertification,
    deleteCertification,
    addSkill,
    deleteSkill,
    addService,
    deleteService,
    addLanguage,
    updateLanguage,
    deleteLanguage,
    addCandidateLink,
    deleteCandidateLink,
  } = useCandidateProfile();
  const { createProject, updateProject, deleteProject, loading: projectSaving } =
    useProjectMutations(user?.id);

  const [experienceOpen, setExperienceOpen] = useState(false);
  const [educationOpen, setEducationOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [certOpen, setCertOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState(null);
  const [editingEducation, setEditingEducation] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [editingCert, setEditingCert] = useState(null);
  const [editingLanguage, setEditingLanguage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [aboutSaving, setAboutSaving] = useState(false);
  const [socialSaving, setSocialSaving] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarPhase, setAvatarPhase] = useState(null);
  const [coverPhotoLoading, setCoverPhotoLoading] = useState(false);
  const [coverPhase, setCoverPhase] = useState(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [cvPhase, setCvPhase] = useState(null);
  const [coverLoading, setCoverLoading] = useState(false);

  const canEdit = !isPreviewMode;


  const handleSaveAbout = async (about) => {
    setAboutSaving(true);
    const { error } = await updateBasicInfo({ about });
    setAboutSaving(false);
    showToast(error ? error.message : 'Descripción guardada.', error ? 'error' : 'success');
    return { error };
  };

  const handleSaveSocial = async (data) => {
    setSocialSaving(true);
    const { error } = await updateBasicInfo(data);
    setSocialSaving(false);
    showToast(error ? error.message : 'Redes sociales guardadas.', error ? 'error' : 'success');
    return { error };
  };

  const handleAvatar = async (file) => {
    const validation = validateFile(file, 'avatar');
    if (!validation.valid) {
      showToast(validation.error, 'error');
      return;
    }
    setAvatarLoading(true);
    const { error } = await uploadAvatar(file, { onProgress: ({ phase }) => setAvatarPhase(phase) });
    setAvatarLoading(false);
    setAvatarPhase(null);
    showToast(error ? error.message : 'Foto actualizada.', error ? 'error' : 'success');
  };

  const handleCoverPhoto = async (file) => {
    const validation = validateFile(file, 'image');
    if (!validation.valid) {
      showToast(validation.error, 'error');
      return;
    }
    setCoverPhotoLoading(true);
    const { error } = await uploadCover(file, { onProgress: ({ phase }) => setCoverPhase(phase) });
    setCoverPhotoLoading(false);
    setCoverPhase(null);
    showToast(error ? error.message : 'Portada actualizada.', error ? 'error' : 'success');
  };

  const handleRemoveCoverPhoto = async () => {
    setCoverPhotoLoading(true);
    const { error } = await removeCover();
    setCoverPhotoLoading(false);
    showToast(error ? error.message : 'Portada eliminada.', error ? 'error' : 'success');
  };

  const handleUploadCV = async (file, errorMsg) => {
    if (errorMsg) {
      showToast(errorMsg, 'error');
      return { error: { message: errorMsg } };
    }
    setCvLoading(true);
    const { error } = await uploadCV(file, { onProgress: ({ phase }) => setCvPhase(phase) });
    setCvLoading(false);
    setCvPhase(null);
    showToast(error ? error.message : 'CV subido correctamente.', error ? 'error' : 'success');
    return { error };
  };

  const handleSaveCoverLetter = async (text) => {
    setCoverLoading(true);
    const { error } = await saveCoverLetter(text);
    setCoverLoading(false);
    showToast(error ? error.message : 'Carta guardada.', error ? 'error' : 'success');
  };

  const saveExperience = async (data, id) => {
    setSaving(true);
    const result = id ? await updateExperience(id, data) : await addExperience(data);
    setSaving(false);
    if (!result.error) showToast('Experiencia guardada.', 'success');
    return result;
  };

  const saveEducation = async (data, id, options = {}) => {
    setSaving(true);
    const result = id ? await updateEducation(id, data) : await addEducation(data);
    if (!result.error && typeof options.showInIntro === 'boolean') {
      const educationId = id || result.data?.id;
      const introResult = await syncEducationIntro(educationId, options.showInIntro);
      if (introResult.error) {
        setSaving(false);
        if (!options.silent) showToast(introResult.error.message, 'error');
        return introResult;
      }
    }
    setSaving(false);
    if (result.error) {
      if (!options.silent) showToast(result.error.message || 'No se pudo guardar la educación.', 'error');
      return result;
    }
    if (!result.data?.id && !id) {
      const err = { message: 'No se pudo confirmar el guardado en el servidor.' };
      if (!options.silent) showToast(err.message, 'error');
      return { data: null, error: err };
    }
    if (!options.silent) showToast('Educación guardada.', 'success');
    return result;
  };

  const saveCert = async (data, id, options = {}) => {
    setSaving(true);
    const result = id ? await updateCertification(id, data) : await addCertification(data);
    setSaving(false);
    if (!result.error && !options.silent) showToast('Certificación guardada.', 'success');
    return result;
  };

  const saveLanguage = async (data, id) => {
    setSaving(true);
    const result = id ? await updateLanguage(id, data) : await addLanguage(data);
    setSaving(false);
    if (!result.error) showToast('Idioma guardado.', 'success');
    return result;
  };

  const openExperience = (item = null) => {
    setEditingExperience(item);
    setExperienceOpen(true);
  };

  const openEducation = (item = null) => {
    setEditingEducation(item);
    setEducationOpen(true);
  };

  const openCert = (item = null) => {
    setEditingCert(item);
    setCertOpen(true);
  };

  const openLanguage = (item = null) => {
    setEditingLanguage(item);
    setLanguageOpen(true);
  };

  const openProject = (item = null) => {
    setEditingProject(item);
    setProjectOpen(true);
  };

  const saveProject = async (data, initial) => {
    const result = initial?.id
      ? await updateProject(initial.id, data, initial)
      : await createProject(data);
    if (!result.error) showToast('Proyecto guardado.', 'success');
    return result;
  };

  const handleShare = () => {
    shareContent({
      title: profile?.full_name || 'Perfil en TrabaGE',
      text: getShareDescription('profile'),
      url: generateProfileUrl(user?.id, profile?.username),
      showToast,
    });
  };

  if (loading) {
    return (
      <PageContainer topBar={false} className="max-w-none">
        <ProfilePageSkeleton />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer topBar={false} className="max-w-none">
        <div className="p-space-base">
          <FetchErrorBanner
            message="No se pudo cargar tu perfil. Inténtalo de nuevo."
            onRetry={() => refetch()}
          />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer topBar={false} className="max-w-none">
      <CandidateProfileLayout
        backButton={false}
        profile={profile}
        email={user?.email}
        isOwn={canEdit}
        onAvatarChange={canEdit ? handleAvatar : undefined}
        avatarLoading={avatarLoading}
        avatarPhase={avatarPhase}
        onCoverChange={canEdit ? handleCoverPhoto : undefined}
        onCoverRemove={canEdit ? handleRemoveCoverPhoto : undefined}
        coverLoading={coverPhotoLoading}
        coverPhase={coverPhase}
        onShare={handleShare}
        onSettings={canEdit ? () => navigate('/personal/settings') : undefined}
        onEditIntro={canEdit ? () => navigate('/personal/profile/edit-intro') : undefined}
        sidebar={<ProfileSidebar profile={profile} email={user?.email} />}
      >
        <AboutSection
          about={profile?.about}
          isOwn={canEdit}
          onSave={handleSaveAbout}
          saving={aboutSaving}
        />

        <EducationSection
          items={profile?.education}
          isOwn={canEdit}
          onAdd={() => openEducation()}
          onEdit={openEducation}
          onDelete={async (id) => {
            const { error } = await deleteEducation(id);
            showToast(error ? error.message : 'Educación eliminada.', error ? 'error' : 'success');
          }}
        />

        <CertificationsSection
          items={profile?.certifications}
          isOwn={canEdit}
          onAdd={() => openCert()}
          onEdit={openCert}
          onDelete={async (id) => {
            const { error } = await deleteCertification(id);
            showToast(
              error ? error.message : 'Certificación eliminada.',
              error ? 'error' : 'success',
            );
          }}
        />

        <SkillsSection
          items={profile?.skills}
          isOwn={canEdit}
          onAdd={async (name) => {
            const { error } = await addSkill(name);
            showToast(error ? error.message : 'Habilidad añadida.', error ? 'error' : 'success');
          }}
          onDelete={async (id) => {
            const { error } = await deleteSkill(id);
            showToast(error ? error.message : 'Habilidad eliminada.', error ? 'error' : 'success');
          }}
        />

        <ServicesSection
          items={profile?.services}
          isOwn={canEdit}
          onAdd={async (name) => {
            const { error } = await addService(name);
            showToast(error ? error.message : 'Servicio añadido.', error ? 'error' : 'success');
          }}
          onDelete={async (id) => {
            const { error } = await deleteService(id);
            showToast(error ? error.message : 'Servicio eliminado.', error ? 'error' : 'success');
          }}
        />

        <LanguagesSection
          items={profile?.languages}
          isOwn={canEdit}
          onAdd={() => openLanguage()}
          onEdit={openLanguage}
          onDelete={async (id) => {
            const { error } = await deleteLanguage(id);
            showToast(error ? error.message : 'Idioma eliminado.', error ? 'error' : 'success');
          }}
        />

        <PersonalSocialSection
          socialLinks={profile?.social_links}
          isOwn={canEdit}
          onSave={handleSaveSocial}
          loading={socialSaving}
        />

        <PortfolioLinksSection
          items={profile?.candidate_links}
          isOwn={canEdit}
          onAdd={async (data) => {
            const { error } = await addCandidateLink(data);
            showToast(error ? error.message : 'Enlace añadido.', error ? 'error' : 'success');
          }}
          onDelete={async (id) => {
            const { error } = await deleteCandidateLink(id);
            showToast(error ? error.message : 'Enlace eliminado.', error ? 'error' : 'success');
          }}
        />

        <ProjectsSection
          items={profile?.projects}
          isOwn={canEdit}
          onAdd={() => openProject()}
          onEdit={openProject}
          onDelete={async (project) => {
            const { error } = await deleteProject(project);
            showToast(error ? error.message : 'Proyecto eliminado.', error ? 'error' : 'success');
          }}
        />

        <ExperienceSection
          items={profile?.experience}
          isOwn={canEdit}
          onAdd={() => openExperience()}
          onEdit={openExperience}
          onDelete={async (id) => {
            const { error } = await deleteExperience(id);
            showToast(
              error ? error.message : 'Experiencia eliminada.',
              error ? 'error' : 'success',
            );
          }}
        />

        <DocumentsSection
          profile={profile}
          accountEmail={user?.email}
          cvName={profile?.cv_name}
          coverLetter={profile?.cover_letter}
          isOwn={canEdit}
          cvLoading={cvLoading}
          cvPhase={cvPhase}
          coverSaving={coverLoading}
          onUploadCV={handleUploadCV}
          onSaveCoverLetter={handleSaveCoverLetter}
          onRefetchProfile={async () => {
            const result = await refetch();
            return result.data ?? null;
          }}
        />

      </CandidateProfileLayout>

      <ExperienceModal
        isOpen={experienceOpen}
        onClose={() => setExperienceOpen(false)}
        initial={editingExperience}
        onSave={saveExperience}
        loading={saving}
      />
      <EducationModal
        isOpen={educationOpen}
        onClose={() => setEducationOpen(false)}
        initial={editingEducation}
        onSave={saveEducation}
        loading={saving}
        userId={user?.id}
        showInIntro={Boolean(
          profile?.show_education_in_intro &&
            editingEducation?.id &&
            String(profile?.intro_education_id) === String(editingEducation.id),
        )}
      />
      <CertificationModal
        isOpen={certOpen}
        onClose={() => setCertOpen(false)}
        initial={editingCert}
        onSave={saveCert}
        loading={saving}
        userId={user?.id}
      />
      <LanguageModal
        isOpen={languageOpen}
        onClose={() => setLanguageOpen(false)}
        initial={editingLanguage}
        onSave={saveLanguage}
        loading={saving}
        existingLanguages={profile?.languages ?? []}
      />
      <ProjectModal
        isOpen={projectOpen}
        onClose={() => setProjectOpen(false)}
        initial={editingProject}
        onSave={saveProject}
        loading={projectSaving}
      />
    </PageContainer>
  );
}
