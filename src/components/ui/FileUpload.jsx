import { useRef } from 'react';
import Button from './Button';
import AppIcon from '../common/AppIcon';
import { Upload, ICON_SIZES } from '../../constants/icons';
import { FILE_HINTS, validateFile } from '../../utils/validateFile';
import { beginNativeFilePick, endNativeFilePick } from '../../utils/appLifecycle';

export default function FileUpload({
  accept,
  maxSize,
  hint,
  onUpload,
  label = 'Seleccionar archivo',
  fileType = 'document',
  loading = false,
  loadingLabel = null,
}) {
  const inputRef = useRef(null);
  const sizeHint = hint || maxSize || FILE_HINTS[fileType];
  const buttonLabel = loading && loadingLabel ? loadingLabel : label;

  const openPicker = () => {
    // Mark before the OS picker opens so visibilitychange soft-resumes the SPA.
    beginNativeFilePick();
    inputRef.current?.click();
  };

  const handleChange = async (e) => {
    endNativeFilePick();
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file, fileType);
    if (!validation.valid) {
      onUpload?.(null, validation.error);
      e.target.value = '';
      return;
    }

    await onUpload?.(file, null);
    e.target.value = '';
  };

  const handleCancel = () => {
    endNativeFilePick();
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
        onCancel={handleCancel}
      />
      <Button
        type="button"
        variant="secondary"
        loading={loading}
        className="inline-flex items-center gap-2"
        onClick={openPicker}
      >
        <AppIcon icon={Upload} size={ICON_SIZES.default} />
        {buttonLabel}
      </Button>
      {sizeHint && <p className="mt-1 text-xs text-gray-500">{sizeHint}</p>}
    </div>
  );
}
