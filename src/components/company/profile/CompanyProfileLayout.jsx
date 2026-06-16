import { useEffect, useMemo, useState } from 'react';
import ProfilePageShell from '../../profile/ProfilePageShell';
import { generateCompanyUrl } from '../../../utils/generateShareUrl';
import { useNotificationContext } from '../../../context/NotificationContext';
import { companyService } from '../../../services/company.service';
import { storageService } from '../../../services/storage.service';
import { jobsService } from '../../../services/jobs.service';
import { getPreviewMediaUrls } from '../../../constants/preview';
import { validateFile } from '../../../utils/validateFile';
import { compressProfileImage } from '../../../utils/imageCompression';
import { logoPath, companyCoverPath } from '../../../constants/storage';
import CompanyProfileView from './CompanyProfileView';

export default function CompanyProfileLayout({
  profile,
  userId,
  isPreviewMode,
  onPreviewAction,
  onLogout,
  onUploadComplete,
}) {
  const { showToast } = useNotificationContext();
  const [jobs, setJobs] = useState([]);
  const [logoLoading, setLogoLoading] = useState(false);
  const [coverLoading, setCoverLoading] = useState(false);
  const [contactSaving, setContactSaving] = useState(false);
  const [previewMedia, setPreviewMedia] = useState({ cover: null, logo: null });
  const [previewServices, setPreviewServices] = useState(null);
  const [previewContact, setPreviewContact] = useState(null);

  useEffect(() => {
    if (!isPreviewMode) return;
    const stored = getPreviewMediaUrls();
    setPreviewMedia({
      cover: stored.cover_url,
      logo: stored.logo_path,
    });
  }, [isPreviewMode]);

  const displayProfile = useMemo(() => {
    if (!profile) return profile;
    return {
      ...profile,
      cover_url: previewMedia.cover ?? profile.cover_url,
      logo_path: previewMedia.logo ?? profile.logo_path,
      company_services: previewServices ?? profile.company_services ?? [],
      ...(previewContact ?? {}),
    };
  }, [profile, previewMedia.cover, previewMedia.logo, previewServices, previewContact]);
  useEffect(() => {
    if (!userId) return;

    if (isPreviewMode) {
      setJobs([]);
      return;
    }

    jobsService.getCompanyJobs(userId).then(({ data }) => {
      setJobs(data ?? []);
    });
  }, [userId, isPreviewMode]);

  const handlePreviewAction = (action) => {
    if (isPreviewMode) {
      onPreviewAction?.(action);
    }
  };

  const handleShare = async () => {
    if (!userId) return;
    try {
      await navigator.clipboard.writeText(generateCompanyUrl(userId));
      showToast('Enlace copiado', 'success');
    } catch {
      showToast('No se pudo copiar el enlace', 'error');
    }
  };

  const uploadImage = async (file, type) => {
    const validation = validateFile(file, type === 'logo' ? 'logo' : 'image');
    if (!validation.valid) {
      showToast(validation.error, 'error');
      return;
    }

    const setLoading = type === 'logo' ? setLogoLoading : setCoverLoading;
    const mediaKey = type === 'logo' ? 'logo' : 'cover';

    if (isPreviewMode) {
      onPreviewAction?.('upload-image');
      return;
    }

    if (!userId) return;

    setLoading(true);

    let compressed;
    try {
      compressed = await compressProfileImage(file);
    } catch (compressError) {
      setLoading(false);
      showToast(compressError.message, 'error');
      return;
    }

    const oldPath = type === 'logo' ? profile?.logo_path : profile?.cover_url;
    const upload =
      type === 'logo'
        ? storageService.uploadCompanyLogo(userId, compressed, oldPath)
        : storageService.uploadCompanyCover(userId, compressed, oldPath);

    const { error: uploadError } = await upload;

    if (uploadError) {
      setLoading(false);
      showToast(uploadError.message, 'error');
      return;
    }

    const path = type === 'logo' ? logoPath(userId) : companyCoverPath(userId);
    const field = type === 'logo' ? 'logo_path' : 'cover_url';

    const { error: saveError } = await companyService.upsertCompanyProfile({
      user_id: userId,
      company_name: profile?.company_name?.trim() || 'Mi empresa',
      [field]: path,
    });
    setLoading(false);

    if (saveError) {
      showToast(saveError.message, 'error');
      return;
    }

    setPreviewMedia((prev) => ({
      ...prev,
      [mediaKey]: path,
    }));
    showToast(type === 'logo' ? 'Logo actualizado' : 'Portada actualizada', 'success');
    onUploadComplete?.();
  };

  const handleAddService = async (name) => {
    if (isPreviewMode) {
      onPreviewAction?.('add-service');
      return;
    }

    if (!userId) return;

    const { error } = await companyService.addCompanyService({
      company_id: userId,
      name,
    });

    if (error) {
      showToast(error.message, 'error');
      return;
    }

    showToast('Servicio añadido', 'success');
    onUploadComplete?.();
  };

  const handleDeleteService = async (id) => {
    if (isPreviewMode) {
      onPreviewAction?.('delete-service');
      return;
    }

    const { error } = await companyService.deleteCompanyService(id);

    if (error) {
      showToast(error.message, 'error');
      return;
    }

    showToast('Servicio eliminado', 'success');
    onUploadComplete?.();
  };

  const handleSaveContact = async (contactData) => {
    if (isPreviewMode) {
      onPreviewAction?.('save-contact');
      return;
    }

    if (!userId) return;

    setContactSaving(true);
    const { error } = await companyService.upsertCompanyProfile({
      user_id: userId,
      company_name: profile?.company_name?.trim() || 'Mi empresa',
      ...contactData,
    });
    setContactSaving(false);

    if (error) {
      showToast(error.message, 'error');
      return;
    }

    showToast('Contacto guardado', 'success');
    onUploadComplete?.();
  };

  const readOnly = isPreviewMode;

  return (
    <ProfilePageShell
      title="Perfil de empresa"
      backButton
      compactBack
      onShare={handleShare}
      isOwn={!readOnly}
      onSettings={readOnly ? undefined : () => handlePreviewAction('settings')}
      onLogout={readOnly ? undefined : onLogout}
      onDeleteAccount={readOnly ? undefined : () => handlePreviewAction('delete-account')}
    >
      <CompanyProfileView
        profile={displayProfile}
        companyId={userId}
        jobs={jobs}
        readOnly={readOnly}
        onEditName={readOnly ? undefined : () => handlePreviewAction('edit-name')}
        onEditAbout={readOnly ? undefined : () => handlePreviewAction('edit-about')}
        onBookmark={readOnly ? undefined : () => handlePreviewAction('bookmark')}
        onUploadLogo={readOnly ? undefined : (file) => uploadImage(file, 'logo')}
        onUploadCover={readOnly ? undefined : (file) => uploadImage(file, 'cover')}
        onAddService={readOnly ? undefined : handleAddService}
        onDeleteService={readOnly ? undefined : handleDeleteService}
        onSaveContact={readOnly ? undefined : handleSaveContact}
        contactSaving={contactSaving}
        logoLoading={logoLoading}
        coverLoading={coverLoading}
      />
    </ProfilePageShell>
  );
}
