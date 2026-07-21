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
    const result = await onSubmit?.({
      content: trimmedContent,
      imageFile,
      topicIds: selectedTopics.map((topic) => topic.id),
    });
    // #region agent log
    fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4306af'},body:JSON.stringify({sessionId:'4306af',runId:'post-fix',hypothesisId:'A',location:'PostComposer.jsx:handleSubmit',message:'publish result before clear',data:{hasResult:result!==undefined,ok:result?.ok??null,willClear:result?.ok===true,contentLen:trimmedContent.length,topicCount:selectedTopics.length},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (result?.ok !== true) return;
    setContent('');
    setSelectedTopics([]);
    clearImage();
  };

  return (
    <form onSubmit={handleSubmit} className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-app-bg text-app-text">
      <header className="flex h-topbar shrink-0 items-center gap-space-sm border-b border-app-border px-space-base pt-safe sm:px-space-lg">
        <button
          type="button"
          onClick={handleClose}
          className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-radius-circular text-app-muted transition-colors hover:bg-app-surface active:bg-app-surface"
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

        <div className="min-w-0 flex-1">
          <p className="truncate text-body-small font-semibold text-app-text">
            Nueva publicación
          </p>
        </div>

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

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-xl min-h-0 flex-1 flex-col px-space-base pt-space-md pb-space-base sm:px-space-lg sm:pt-space-lg">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Comparte tus ideas…"
            rows={6}
            autoFocus
            className="w-full min-h-[9rem] flex-1 resize-none border-0 bg-transparent text-body leading-relaxed text-app-text outline-none placeholder:text-app-subtle placeholder:opacity-80 sm:min-h-[12rem]"
          />

          {imagePreview && (
            <div className="relative mt-space-md shrink-0">
              <img
                src={imagePreview}
                alt=""
                className="max-h-52 w-full rounded-radius-lg object-cover sm:max-h-64"
              />
              <button
                type="button"
                onClick={clearImage}
                className="absolute right-space-sm top-space-sm inline-flex min-h-touch min-w-touch items-center justify-center rounded-radius-circular bg-black/50 text-white transition-colors hover:bg-black/70"
                aria-label="Quitar imagen"
              >
                <AppIcon icon={X} size={ICON_SIZES.sm} className="text-white" />
              </button>
            </div>
          )}

          {uploadError && (
            <p className="mt-space-sm shrink-0 text-body-small text-error-600">{uploadError}</p>
          )}

          <div className="mt-space-lg shrink-0 pt-space-sm sm:mt-auto sm:pt-space-md">
            <TopicSelector
              selected={selectedTopics}
              onChange={setSelectedTopics}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      <footer
        className="keyboard-aware-footer flex shrink-0 items-center justify-between gap-space-sm border-t border-app-border bg-app-card px-space-base py-space-sm sm:px-space-lg"
        style={{ paddingBottom: footerPaddingBottom }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileInputChange}
        />
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={openFilePicker}
            className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-radius-circular text-app-muted transition-colors hover:bg-app-surface active:bg-app-surface"
            aria-label="Añadir imagen"
          >
            <AppIcon icon={Image} size={ICON_SIZES.md} />
          </button>
          <button
            type="button"
            onClick={openFilePicker}
            className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-radius-circular text-app-muted transition-colors hover:bg-app-surface active:bg-app-surface"
            aria-label="Añadir archivo"
          >
            <AppIcon icon={Plus} size={ICON_SIZES.md} />
          </button>
        </div>
        <p className="text-caption text-app-subtle">
          {hasTopics ? 'Listo para publicar' : 'Falta elegir temas'}
        </p>
      </footer>
    </form>
  );
}
