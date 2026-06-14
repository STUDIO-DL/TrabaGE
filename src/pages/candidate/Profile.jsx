import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import CandidateProfileLayout from '../../components/profile/CandidateProfileLayout';
import ProfileSidebar from '../../components/profile/ProfileSidebar';
import AboutSection from '../../components/profile/AboutSection';
import ContactSection from '../../components/profile/ContactSection';
import ExperienceSection from '../../components/profile/ExperienceSection';
import EducationSection from '../../components/profile/EducationSection';
import CertificationsSection from '../../components/profile/CertificationsSection';
import SkillsSection from '../../components/profile/SkillsSection';
import LanguagesSection from '../../components/profile/LanguagesSection';
import DocumentsSection from '../../components/profile/DocumentsSection';
import ExperienceModal from '../../components/profile/modals/ExperienceModal';
import EducationModal from '../../components/profile/modals/EducationModal';
import CertificationModal from '../../components/profile/modals/CertificationModal';
import LanguageModal from '../../components/profile/modals/LanguageModal';
import SettingsModal from '../../components/profile/modals/SettingsModal';
import DeleteAccountModal from '../../components/profile/modals/DeleteAccountModal';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { useCandidateProfile } from '../../hooks/useCandidateProfile';
import { useNotificationContext } from '../../context/NotificationContext';
import { validateFile } from '../../utils/validateFile';
import { generateProfileUrl } from '../../utils/generateShareUrl';
import { authService } from '../../services/auth.service';

export default function Profile() {
  const { user, logout } = useAuth();
  const { showToast } = useNotificationContext();
  const {
    profile,
    loading,
    updateBasicInfo,
    uploadAvatar,
    uploadCV,
    uploadCoverLetter,
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
    addLanguage,
    updateLanguage,
    deleteLanguage,
  } = useCandidateProfile();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
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
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [cvLoading, setCvLoading] = useState(false);
  const [coverLoading, setCoverLoading] = useState(false);

  const handleSaveField = async (field, value) => {
    setSavingField(field);
    const { error } = await updateBasicInfo({ [field]: value });
    setSavingField(null);
    showToast(error ? error.message : 'Guardado', error ? 'error' : 'success');
  };

  const handleSaveAbout = async (about) => {
    setAboutSaving(true);
    const { error } = await updateBasicInfo({ about });
    setAboutSaving(false);
    showToast(error ? error.message : 'Descripción guardada', error ? 'error' : 'success');
  };

  const handleSaveContact = async (data) => {
    setContactSaving(true);
    const { error } = await updateBasicInfo(data);
    setContactSaving(false);
    showToast(error ? error.message : 'Contacto guardado', error ? 'error' : 'success');
  };

  const handleSaveSettings = async (data) => {
    setSaving(true);
    const result = await updateBasicInfo(data);
    setSaving(false);
    if (!result.error) showToast('Configuración guardada', 'success');
    return result;
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    const { error } = await authService.deleteAccount();
    setDeleteLoading(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Cuenta eliminada', 'success');
    await logout();
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
    showToast(error ? error.message : 'Foto actualizada', error ? 'error' : 'success');
  };

  const handleUploadCV = async (file, errorMsg) => {
    if (errorMsg) return showToast(errorMsg, 'error');
    setCvLoading(true);
    const { error } = await uploadCV(file);
    setCvLoading(false);
    showToast(error ? error.message : 'CV subido', error ? 'error' : 'success');
  };

  const handleUploadCover = async (file, errorMsg) => {
    if (errorMsg) return showToast(errorMsg, 'error');
    setCoverLoading(true);
    const { error } = await uploadCoverLetter(file);
    setCoverLoading(false);
    showToast(error ? error.message : 'Carta subida', error ? 'error' : 'success');
  };

  const saveExperience = async (data, id) => {
    setSaving(true);
    const result = id ? await updateExperience(id, data) : await addExperience(data);
    setSaving(false);
    if (!result.error) showToast('Experiencia guardada', 'success');
    return result;
  };

  const saveEducation = async (data, id) => {
    setSaving(true);
    const result = id ? await updateEducation(id, data) : await addEducation(data);
    setSaving(false);
    if (!result.error) showToast('Educación guardada', 'success');
    return result;
  };

  const saveCert = async (data, id) => {
    setSaving(true);
    const result = id ? await updateCertification(id, data) : await addCertification(data);
    setSaving(false);
    if (!result.error) showToast('Certificación guardada', 'success');
    return result;
  };

  const saveLanguage = async (data, id) => {
    setSaving(true);
    const result = id ? await updateLanguage(id, data) : await addLanguage(data);
    setSaving(false);
    if (!result.error) showToast('Idioma guardado', 'success');
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

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(generateProfileUrl(user?.id));
      showToast('Enlace copiado', 'success');
    } catch {
      showToast('No se pudo copiar el enlace', 'error');
    }
  };

  if (loading) {
    return (
      <PageContainer topBar={false} className="max-w-none">
        <Spinner fullscreen />
      </PageContainer>
    );
  }

  return (
    <PageContainer topBar={false} className="max-w-none">
      <CandidateProfileLayout
        title="Mi perfil"
        backButton={false}
        profile={profile}
        email={user?.email}
        isOwn
        onAvatarChange={handleAvatar}
        avatarLoading={avatarLoading}
        onShare={handleShare}
        onSettings={() => setSettingsOpen(true)}
        onLogout={logout}
        onDeleteAccount={() => setDeleteOpen(true)}
        onSaveField={handleSaveField}
        savingField={savingField}
        sidebar={
          <>
            <ProfileSidebar profile={profile} email={user?.email} />
            <LanguagesSection
              items={profile?.languages}
              isOwn
              onAdd={() => openLanguage()}
              onEdit={openLanguage}
              onDelete={async (id) => {
                await deleteLanguage(id);
                showToast('Idioma eliminado', 'success');
              }}
            />
          </>
        }
      >
        <AboutSection
          about={profile?.about}
          isOwn
          onSave={handleSaveAbout}
          saving={aboutSaving}
        />

        <ContactSection
          contactEmail={profile?.contact_email}
          contactWhatsapp={profile?.contact_whatsapp}
          isOwn
          onSave={handleSaveContact}
          loading={contactSaving}
        />

        <EducationSection
          items={profile?.education}
          isOwn
          onAdd={() => openEducation()}
          onEdit={openEducation}
          onDelete={async (id) => {
            await deleteEducation(id);
            showToast('Educación eliminada', 'success');
          }}
        />

        <CertificationsSection
          items={profile?.certifications}
          isOwn
          onAdd={() => openCert()}
          onEdit={openCert}
          onDelete={async (id) => {
            await deleteCertification(id);
            showToast('Certificación eliminada', 'success');
          }}
        />

        <SkillsSection
          items={profile?.skills}
          isOwn
          onAdd={async (name) => {
            const { error } = await addSkill(name);
            showToast(error ? error.message : 'Habilidad añadida', error ? 'error' : 'success');
          }}
          onDelete={async (id) => {
            await deleteSkill(id);
            showToast('Habilidad eliminada', 'success');
          }}
        />

        <ExperienceSection
          items={profile?.experience}
          isOwn
          onAdd={() => openExperience()}
          onEdit={openExperience}
          onDelete={async (id) => {
            await deleteExperience(id);
            showToast('Experiencia eliminada', 'success');
          }}
        />

        <DocumentsSection
          cvName={profile?.cv_name}
          coverLetterName={profile?.cover_letter_name}
          isOwn
          cvLoading={cvLoading}
          coverLoading={coverLoading}
          onUploadCV={handleUploadCV}
          onUploadCoverLetter={handleUploadCover}
        />

        <Link to={`/profile/${user?.id}`}>
          <Button variant="secondary" fullWidth>
            Ver perfil público
          </Button>
        </Link>
      </CandidateProfileLayout>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        profile={profile}
        onSave={handleSaveSettings}
        loading={saving}
      />
      <DeleteAccountModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteAccount}
        loading={deleteLoading}
      />
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
