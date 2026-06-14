import { useRef } from 'react';
import Button from './Button';
import { validateFile } from '../../utils/validateFile';

export default function FileUpload({
  accept,
  maxSize,
  onUpload,
  label = 'Seleccionar archivo',
  fileType = 'document',
  loading = false,
}) {
  const inputRef = useRef(null);

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
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </Button>
      {maxSize && (
        <p className="mt-1 text-xs text-gray-500">Tamaño máximo: {maxSize}</p>
      )}
    </div>
  );
}
