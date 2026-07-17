import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import CandidateProfileLayout from '../../components/profile/CandidateProfileLayout';
import ProfileSidebar from '../../components/profile/ProfileSidebar';
import AboutSection from '../../components/profile/AboutSection';
import ContactSection from '../../components/profile/ContactSection';
import ExperienceSection from '../../components/profile/ExperienceSection';
import EducationSection from '../../components/profile/EducationSection';
import CertificationsSection from '../../components/profile/CertificationsSection';
import SkillsSection from '../../components/profile/SkillsSection';
import ServicesSection from '../../components/profile/ServicesSection';
import LanguagesSection from '../../components/profile/LanguagesSection';
import PortfolioLinksSection from '../../components/profile/PortfolioLinksSection';
import DocumentsSection from '../../components/profile/DocumentsSection';
import ExperienceModal from '../../components/profile/modals/ExperienceModal';
import EducationModal from '../../components/profile/modals/EducationModal';
import CertificationModal from '../../components/profile/modals/CertificationModal';
import LanguageModal from '../../components/profile/modals/LanguageModal';
import { ProfilePageSkeleton } from '../../components/common/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { useCandidateProfile } from '../../hooks/useCandidateProfile';
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
    updateBasicInfo,
    uploadAvatar,
    uploadCV,
    saveCoverLetter,
    addExperience,
    updateExperience,
    deleteExperience,
    addEducation,
    updateEducation,
    deleteEducation,
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

  const [experienceOpen, setExperienceOpen] = useState(false);
  const [educationOpen, setEducationOpen] = useState(false);
  const [certOpen, setCertOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState(null);
  const [editingEducation, setEditingEducation] = useState(null);
  const [editingCert, setEditingCert] = useState(null);
  const [editingLanguage, setEditingLanguage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savingField, setSavingField] = useState(null);
  const [aboutSaving, setAboutSaving] = useState(false);
  const [contactSaving, setContactSaving] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [cvLoading, setCvLoading] = useState(false);
  const [coverLoading, setCoverLoading] = useState(false);

  const canEdit = !isPreviewMode;

  const handleSaveField = async (field, value) => {
    setSavingField(field);
    const payload =
      field === 'years_experience'
        ? { years_experience: value === '' || value == null ? null : Number(value) }
        : { [field]: value };
    const { error } = await updateBasicInfo(payload);
    setSavingField(null);
    showToast(error ? error.message : TOAST.saved, error ? 'error' : 'success');
  };

  const handleSaveAbout = async (about) => {
    setAboutSaving(true);
    const { error } = await updateBasicInfo({ about });
    setAboutSaving(false);
    showToast(error ? error.message : 'Descripción guardada.', error ? 'error' : 'success');
  };

  const handleSaveContact = async (data) => {
    setContactSaving(true);
    const { error } = await updateBasicInfo(data);
    setContactSaving(false);
    showToast(error ? error.message : TOAST.contactSaved, error ? 'error' : 'success');
  };

  const handleAvatar = async (file) => {
    const validation = validateFile(file, 'avatar');
    if (!validation.valid) {
      showToast(validation.error, 'error');
      return;
    }
    setAvatarLoading(true);
    const { error } = await uploadAvatar(file);
    setAvatarLoading(false);
    showToast(error ? error.message : 'Foto actualizada.', error ? 'error' : 'success');
  };

  const handleUploadCV = async (file, errorMsg) => {
    if (errorMsg) return showToast(errorMsg, 'error');
    setCvLoading(true);
    const { error } = await uploadCV(file);
    setCvLoading(false);
    showToast(error ? error.message : 'CV subido correctamente.', error ? 'error' : 'success');
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
    setSaving(false);
    if (!result.error && !options.silent) showToast('Educación guardada.', 'success');
    return result;
  };

  const saveCert = async (data, id) => {
    setSaving(true);
    const result = id ? await updateCertification(id, data) : await addCertification(data);
    setSaving(false);
    if (!result.error) showToast('Certificación guardada.', 'success');
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

  const handleShare = () => {
    shareContent({
      title: profile?.full_name || 'Perfil en TrabaGE',
      text: getShareDescription('profile'),
      url: generateProfileUrl(user?.id),
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

  return (
    <PageContainer topBar={false} className="max-w-none">
      <CandidateProfileLayout
        backButton={false}
        profile={profile}
        email={user?.email}
        isOwn={canEdit}
        onAvatarChange={canEdit ? handleAvatar : undefined}
        avatarLoading={avatarLoading}
        onShare={handleShare}
        onSettings={canEdit ? () => navigate('/personal/settings') : undefined}
        onSaveField={canEdit ? handleSaveField : undefined}
        savingField={savingField}
        sidebar={
          <>
            <ProfileSidebar profile={profile} email={user?.email} />
            <LanguagesSection
              items={profile?.languages}
              isOwn={canEdit}
              onAdd={() => openLanguage()}
              onEdit={openLanguage}
              onDelete={async (id) => {
                await deleteLanguage(id);
                showToast('Idioma eliminado.', 'success');
              }}
            />
          </>
        }
      >
        <AboutSection
          about={profile?.about}
          isOwn={canEdit}
          onSave={handleSaveAbout}
          saving={aboutSaving}
        />

        <ContactSection
          contactEmail={profile?.contact_email}
          contactWhatsapp={profile?.contact_whatsapp}
          isOwn={canEdit}
          onSave={handleSaveContact}
          loading={contactSaving}
        />

        <EducationSection
          items={profile?.education}
          isOwn={canEdit}
          onAdd={() => openEducation()}
          onEdit={openEducation}
          onDelete={async (id) => {
            await deleteEducation(id);
            showToast('Educación eliminada.', 'success');
          }}
        />

        <CertificationsSection
          items={profile?.certifications}
          isOwn={canEdit}
          onAdd={() => openCert()}
          onEdit={openCert}
          onDelete={async (id) => {
            await deleteCertification(id);
            showToast('Certificación eliminada.', 'success');
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
            await deleteSkill(id);
            showToast('Habilidad eliminada.', 'success');
          }}
        />

        <PortfolioLinksSection
          items={profile?.candidate_links}
          isOwn={canEdit}
          onAdd={async (data) => {
            const { error } = await addCandidateLink(data);
            showToast(error ? error.message : 'Enlace añadido.', error ? 'error' : 'success');
          }}
          onDelete={async (id) => {
            await deleteCandidateLink(id);
            showToast('Enlace eliminado.', 'success');
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
            await deleteService(id);
            showToast('Servicio eliminado.', 'success');
          }}
        />

        <ExperienceSection
          items={profile?.experience}
          isOwn={canEdit}
          onAdd={() => openExperience()}
          onEdit={openExperience}
          onDelete={async (id) => {
            await deleteExperience(id);
            showToast('Experiencia eliminada.', 'success');
          }}
        />

        <DocumentsSection
          cvName={profile?.cv_name}
          coverLetter={profile?.cover_letter}
          isOwn={canEdit}
          cvLoading={cvLoading}
          coverSaving={coverLoading}
          onUploadCV={handleUploadCV}
          onSaveCoverLetter={handleSaveCoverLetter}
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
      />
      <CertificationModal
        isOpen={certOpen}
        onClose={() => setCertOpen(false)}
        initial={editingCert}
        onSave={saveCert}
        loading={saving}
      />
      <LanguageModal
        isOpen={languageOpen}
        onClose={() => setLanguageOpen(false)}
        initial={editingLanguage}
        onSave={saveLanguage}
        loading={saving}
      />
    </PageContainer>
  );
}
