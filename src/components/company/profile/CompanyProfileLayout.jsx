import { useEffect, useMemo, useState } from 'react';
import ProfilePageShell from '../../profile/ProfilePageShell';
import AppIcon from '../../common/AppIcon';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Modal from '../../ui/Modal';
import Select from '../../ui/Select';
import Textarea from '../../ui/Textarea';
import { useNotificationContext } from '../../../context/NotificationContext';
import { companyService } from '../../../services/company.service';
import { storageService } from '../../../services/storage.service';
import { jobsService } from '../../../services/jobs.service';
import { getPreviewMediaUrls } from '../../../constants/preview';
import { validateFile } from '../../../utils/validateFile';
import { compressProfileImage } from '../../../utils/imageCompression';
import { logoPath, companyCoverPath } from '../../../constants/storage';
import { getSupabaseErrorMessage } from '../../../utils/supabaseErrors';
import { CITIES } from '../../../constants/cities';
import { SECTORS } from '../../../constants/sectors';
import { Save, ICON_SIZES } from '../../../constants/icons';
import CompanyProfileView from './CompanyProfileView';
import { useFollow } from '../../../hooks/useFollow';
import { FOLLOWS_TARGET } from '../../../services/follows.service';
import { isOrganizationProfile, getOrgLabels } from '../../../utils/orgLabels';
import { TOAST } from '../../../utils/copyLabels';

const COMPANY_SIZE_OPTIONS = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1000+',
];

const COMPANY_TYPE_OPTIONS = [
  'Empresa privada',
  'Institucion publica',
  'ONG',
  'Startup',
  'Multinacional',
  'Otro',
];

function cleanText(value) {
  const trimmed = value?.trim?.() ?? '';
  return trimmed || null;
}

function cleanInteger(value) {
  const trimmed = value?.toString?.().trim?.() ?? '';
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

const SOCIAL_ALLOWED_HOSTS = {
  linkedin: ['linkedin.com'],
  facebook: ['facebook.com'],
  instagram: ['instagram.com'],
  x: ['x.com', 'twitter.com'],
  youtube: ['youtube.com', 'youtu.be'],
};

function cleanHttpsUrl(value, allowedHosts = null) {
  const trimmed = cleanText(value);
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') return null;

    if (allowedHosts?.length) {
      const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
      const allowed = allowedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
      if (!allowed) return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

function cleanSocialLinks(form) {
  const links = {
    linkedin: cleanHttpsUrl(form.linkedin, SOCIAL_ALLOWED_HOSTS.linkedin),
    facebook: cleanHttpsUrl(form.facebook, SOCIAL_ALLOWED_HOSTS.facebook),
    instagram: cleanHttpsUrl(form.instagram, SOCIAL_ALLOWED_HOSTS.instagram),
    x: cleanHttpsUrl(form.x, SOCIAL_ALLOWED_HOSTS.x),
    youtube: cleanHttpsUrl(form.youtube, SOCIAL_ALLOWED_HOSTS.youtube),
  };

  return Object.fromEntries(Object.entries(links).filter(([, value]) => Boolean(value)));
}

function CompanyEditModal({ mode, profile, loading, onClose, onSave }) {
  const isOpen = Boolean(mode);
  const [form, setForm] = useState({});

  useEffect(() => {
    if (!isOpen) return;

    setForm({
      company_name: profile?.company_name || '',
      description: profile?.description || '',
      city: profile?.city || '',
      country: profile?.country || 'Guinea Ecuatorial',
      address: profile?.address || '',
      sector: profile?.sector || '',
      company_type: profile?.company_type || '',
      company_size: profile?.company_size || '',
      founded_year: profile?.founded_year || '',
      website: profile?.website || '',
      linkedin: profile?.social_links?.linkedin || '',
      facebook: profile?.social_links?.facebook || '',
      instagram: profile?.social_links?.instagram || '',
      x: profile?.social_links?.x || '',
      youtube: profile?.social_links?.youtube || '',
    });
  }, [isOpen, profile]);

  const setField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const title =
    mode === 'name'
      ? 'Editar nombre'
      : mode === 'about'
        ? 'Editar descripcion'
        : 'Editar informacion';

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (mode === 'name') {
      const companyName = cleanText(form.company_name);
      if (!companyName) return;
      await onSave({ company_name: companyName });
      return;
    }

    if (mode === 'about') {
      await onSave({ description: cleanText(form.description) });
      return;
    }

    await onSave({
      city: cleanText(form.city),
      country: cleanText(form.country),
      address: cleanText(form.address),
      sector: cleanText(form.sector),
      company_type: cleanText(form.company_type),
      company_size: cleanText(form.company_size),
      founded_year: cleanInteger(form.founded_year),
      website: cleanHttpsUrl(form.website),
      social_links: cleanSocialLinks(form),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'name' && (
          <Input
            label="Nombre de la empresa / institucion"
            value={form.company_name || ''}
            onChange={setField('company_name')}
            required
          />
        )}

        {mode === 'about' && (
          <Textarea
            label="Descripcion"
            rows={5}
            value={form.description || ''}
            onChange={setField('description')}
          />
        )}

        {mode === 'details' && (
          <>
            <Select
              label="Ciudad"
              value={form.city || ''}
              onChange={setField('city')}
              options={[
                { value: '', label: 'Seleccionar' },
                ...CITIES.map((city) => ({ value: city, label: city })),
              ]}
            />
            <Input
              label="País"
              value={form.country || ''}
              onChange={setField('country')}
              placeholder="Guinea Ecuatorial"
            />
            <Input
              label="Dirección"
              value={form.address || ''}
              onChange={setField('address')}
              placeholder="Dirección física de la empresa"
            />
            <Select
              label="Sector"
              value={form.sector || ''}
              onChange={setField('sector')}
              options={[
                { value: '', label: 'Seleccionar' },
                ...SECTORS.map((sector) => ({ value: sector, label: sector })),
              ]}
            />
            <Select
              label="Tipo de empresa"
              value={form.company_type || ''}
              onChange={setField('company_type')}
              options={[
                { value: '', label: 'Seleccionar' },
                ...COMPANY_TYPE_OPTIONS.map((type) => ({ value: type, label: type })),
              ]}
            />
            <Select
              label="Tamano"
              value={form.company_size || ''}
              onChange={setField('company_size')}
              options={[
                { value: '', label: 'Seleccionar' },
                ...COMPANY_SIZE_OPTIONS.map((size) => ({ value: size, label: size })),
              ]}
            />
            <Input
              label="Fundada en"
              type="number"
              min="1800"
              max="2100"
              value={form.founded_year || ''}
              onChange={setField('founded_year')}
            />
            <Input
              label="Sitio web"
              type="url"
              placeholder="https://empresa.com"
              value={form.website || ''}
              onChange={setField('website')}
            />
            <Input
              label="LinkedIn"
              type="url"
              value={form.linkedin || ''}
              onChange={setField('linkedin')}
              placeholder="https://linkedin.com/company/..."
            />
            <Input
              label="Facebook"
              type="url"
              value={form.facebook || ''}
              onChange={setField('facebook')}
              placeholder="https://facebook.com/..."
            />
            <Input
              label="Instagram"
              type="url"
              value={form.instagram || ''}
              onChange={setField('instagram')}
              placeholder="https://instagram.com/..."
            />
            <Input
              label="X / Twitter"
              type="url"
              value={form.x || ''}
              onChange={setField('x')}
              placeholder="https://x.com/..."
            />
            <Input
              label="YouTube"
              type="url"
              value={form.youtube || ''}
              onChange={setField('youtube')}
              placeholder="https://youtube.com/..."
            />
          </>
        )}

        <Button type="submit" fullWidth loading={loading} className="gap-2">
          <AppIcon icon={Save} size={ICON_SIZES.default} className="text-white" />
          Guardar cambios
        </Button>
      </form>
    </Modal>
  );
}

export default function CompanyProfileLayout({
  profile,
  userId,
  isPreviewMode,
  onPreviewAction,
  onUploadComplete,
  onOpenSettings,
}) {
  const { showToast } = useNotificationContext();
  const [jobs, setJobs] = useState([]);
  const [logoLoading, setLogoLoading] = useState(false);
  const [coverLoading, setCoverLoading] = useState(false);
  const [contactSaving, setContactSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [previewMedia, setPreviewMedia] = useState({ cover: null, logo: null });
  const [previewServices] = useState(null);
  const [previewContact] = useState(null);

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

  const openEdit = (mode) => {
    if (isPreviewMode) {
      onPreviewAction?.(`edit-${mode}`);
      return;
    }

    setEditMode(mode);
  };

  const orgLabels = getOrgLabels(profile);
  const fallbackCompanyName = profile?.company_name?.trim() || orgLabels.defaultName;

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
      showToast(getSupabaseErrorMessage(uploadError), 'error');
      return;
    }

    const path = type === 'logo' ? logoPath(userId) : companyCoverPath(userId);
    const field = type === 'logo' ? 'logo_path' : 'cover_url';

    const { error: saveError } = await companyService.upsertCompanyProfile({
      user_id: userId,
      company_name: fallbackCompanyName,
      [field]: path,
    });
    setLoading(false);

    if (saveError) {
      showToast(getSupabaseErrorMessage(saveError), 'error');
      return;
    }

    setPreviewMedia((prev) => ({
      ...prev,
      [mediaKey]: path,
    }));
    showToast(type === 'logo' ? 'Logo actualizado.' : 'Portada actualizada.', 'success');
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
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }

    showToast('Servicio añadido.', 'success');
    onUploadComplete?.();
  };

  const handleDeleteService = async (id) => {
    if (isPreviewMode) {
      onPreviewAction?.('delete-service');
      return;
    }

    const { error } = await companyService.deleteCompanyService(id);

    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }

    showToast('Servicio eliminado.', 'success');
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
      company_name: fallbackCompanyName,
      ...contactData,
    });
    setContactSaving(false);

    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }

    showToast(TOAST.contactSaved, 'success');
    onUploadComplete?.();
  };

  const handleSaveProfile = async (data) => {
    if (!userId) return;

    setProfileSaving(true);
    const { error } = await companyService.upsertCompanyProfile({
      user_id: userId,
      company_name:
        data.company_name
        || profile?.company_name?.trim()
        || displayProfile?.company_name?.trim()
        || fallbackCompanyName,
      ...data,
    });
    setProfileSaving(false);

    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }

    showToast(TOAST.profileUpdated, 'success');
    setEditMode(null);
    onUploadComplete?.();
  };

  const readOnly = isPreviewMode;
  const followTarget = isOrganizationProfile(profile)
    ? FOLLOWS_TARGET.ORGANIZATION
    : FOLLOWS_TARGET.BUSINESS;

  const { followerCount } = useFollow({
    targetType: followTarget,
    targetId: userId,
    enabled: Boolean(userId) && !isPreviewMode,
  });

  return (
    <ProfilePageShell hideHeader isOwn={!readOnly}>
      <CompanyProfileView
        profile={displayProfile}
        companyId={userId}
        jobs={jobs}
        readOnly={readOnly}
        isOwn={!readOnly}
        onSettings={readOnly ? undefined : onOpenSettings}
        onEditName={readOnly ? undefined : () => openEdit('name')}
        onEditAbout={readOnly ? undefined : () => openEdit('about')}
        onEditDetails={readOnly ? undefined : () => openEdit('details')}
        onUploadLogo={readOnly ? undefined : (file) => uploadImage(file, 'logo')}
        onUploadCover={readOnly ? undefined : (file) => uploadImage(file, 'cover')}
        onAddService={readOnly ? undefined : handleAddService}
        onDeleteService={readOnly ? undefined : handleDeleteService}
        onSaveContact={readOnly ? undefined : handleSaveContact}
        contactSaving={contactSaving}
        logoLoading={logoLoading}
        coverLoading={coverLoading}
        followerCount={followerCount}
      />
      <CompanyEditModal
        mode={editMode}
        profile={displayProfile}
        loading={profileSaving}
        onClose={() => setEditMode(null)}
        onSave={handleSaveProfile}
      />
    </ProfilePageShell>
  );
}
