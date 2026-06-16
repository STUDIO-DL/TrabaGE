import { useRef } from 'react';
import Button from './Button';
import AppIcon from '../common/AppIcon';
import { Upload, ICON_SIZES } from '../../constants/icons';
import { FILE_HINTS, validateFile } from '../../utils/validateFile';

export default function FileUpload({
  accept,
  maxSize,
  hint,
  onUpload,
  label = 'Seleccionar archivo',
  fileType = 'document',
  loading = false,
}) {
  const inputRef = useRef(null);
  const sizeHint = hint || maxSize || FILE_HINTS[fileType];

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file, fileType);
    if (!validation.valid) {
      onUpload?.(null, validation.error);
      return;
    }

    await onUpload?.(file, null);
    e.target.value = '';
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
      <Button
        type="button"
        variant="secondary"
        loading={loading}
        className="inline-flex items-center gap-2"
        onClick={() => inputRef.current?.click()}
      >
        <AppIcon icon={Upload} size={ICON_SIZES.default} />
        {label}
      </Button>
      {sizeHint && <p className="mt-1 text-xs text-gray-500">{sizeHint}</p>}
    </div>
  );
}
