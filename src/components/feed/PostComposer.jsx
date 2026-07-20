import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import AppIcon from '../common/AppIcon';
import AppAvatar from '../common/AppAvatar';
import { avatarTypeFromRole } from '../../constants/avatarDefaults';
import { X, Image, Plus, ICON_SIZES } from '../../constants/icons';
import { validateFile } from '../../utils/validateFile';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { isEmployerRole } from '../../constants/roles';
import { useKeyboard } from '../../hooks/useKeyboard';
import { getUploadPhaseLabel } from '../../constants/uploadPhases';
import TopicSelector from './TopicSelector';

export default function PostComposer({ onSubmit, loading = false, uploadPhase = null, onClose }) {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { profile } = useProfile();
  const avatarType = avatarTypeFromRole(role, { profile });
  const fileInputRef = useRef(null);
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [selectedTopics, setSelectedTopics] = useState([]);

  const isCompany = isEmployerRole(role);
  const trimmedContent = content.trim();
  const hasText = Boolean(trimmedContent);
  const hasImage = Boolean(imageFile);
  const hasTopics = selectedTopics.length >= 1 && selectedTopics.length <= 3;
  const canPublish = (hasText || hasImage) && hasTopics;
  const handleClose = onClose ?? (() => navigate(-1));
  const { footerPaddingBottom } = useKeyboard();

  const handleImageSelect = (file) => {
    if (!file) return;

    const validation = validateFile(file, 'postImage');
    if (!validation.valid) {
      setUploadError(validation.error);
      return;
    }

    setUploadError('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    handleImageSelect(file);
    e.target.value = '';
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setUploadError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canPublish) return;
    await onSubmit?.({
      content: trimmedContent,
      imageFile,
      topicIds: selectedTopics.map((topic) => topic.id),
    });
    setContent('');
    setSelectedTopics([]);
    clearImage();
  };

  return (
    <form onSubmit={handleSubmit} className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-app-bg text-app-text">
      <header className="flex h-topbar shrink-0 items-center gap-space-sm border-b border-app-border px-space-base pt-safe">
        <button
          type="button"
          onClick={handleClose}
          className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-radius-circular text-app-muted transition-colors hover:bg-app-surface"
          aria-label="Cerrar"
        >
          <AppIcon icon={X} size={ICON_SIZES.md} />
        </button>

        <AppAvatar
          type={avatarType}
          src={isCompany ? profile?.logo_path : profile?.avatar_path}
          name={isCompany ? profile?.company_name : profile?.full_name}
          alt={isCompany ? profile?.company_name : profile?.full_name}
          size="sm"
          variant={isCompany ? 'rounded' : 'circular'}
        />

        <div className="flex-1" />

        <Button
          type="submit"
          size="sm"
          loading={loading}
          disabled={!canPublish}
          className="!rounded-full px-5 disabled:bg-app-disabled disabled:text-app-text-disabled"
        >
          {loading ? getUploadPhaseLabel(uploadPhase) || 'Publicando...' : 'Publicar'}
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-space-base pt-space-md pb-space-md">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Comparte tus ideas…"
          rows={8}
          autoFocus
          className="w-full flex-1 resize-none border-0 bg-transparent text-body leading-relaxed text-app-text outline-none placeholder:text-app-subtle placeholder:opacity-80"
        />

        {imagePreview && (
          <div className="relative mt-4 shrink-0">
            <img src={imagePreview} alt="" className="max-h-56 w-full rounded-xl object-cover" />
            <button
              type="button"
              onClick={clearImage}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
              aria-label="Quitar imagen"
            >
              <AppIcon icon={X} size={ICON_SIZES.sm} className="text-white" />
            </button>
          </div>
        )}

        {uploadError && <p className="mt-2 shrink-0 text-sm text-red-600">{uploadError}</p>}

        <div className="mt-auto pt-space-md">
          <TopicSelector
            selected={selectedTopics}
            onChange={setSelectedTopics}
            disabled={loading}
          />
        </div>
      </div>

      <footer
        className="keyboard-aware-footer flex shrink-0 items-center justify-end gap-0.5 border-t border-app-border bg-app-card px-space-base py-space-sm"
        style={{ paddingBottom: footerPaddingBottom }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileInputChange}
        />
        <button
          type="button"
          onClick={openFilePicker}
          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-radius-circular text-app-muted transition-colors hover:bg-app-surface"
          aria-label="Añadir imagen"
        >
          <AppIcon icon={Image} size={ICON_SIZES.md} />
        </button>
        <button
          type="button"
          onClick={openFilePicker}
          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-radius-circular text-app-muted transition-colors hover:bg-app-surface"
          aria-label="Añadir archivo"
        >
          <AppIcon icon={Plus} size={ICON_SIZES.md} />
        </button>
      </footer>
    </form>
  );
}
