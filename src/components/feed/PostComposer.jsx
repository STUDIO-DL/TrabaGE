import { useState } from 'react';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import FileUpload from '../ui/FileUpload';
import AppIcon from '../common/AppIcon';
import { X, ICON_SIZES } from '../../constants/icons';
import { FILE_HINTS } from '../../utils/validateFile';

export default function PostComposer({ onSubmit, loading = false }) {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadError, setUploadError] = useState('');

  const handleImageSelect = (file, error) => {
    if (error) {
      setUploadError(error);
      return;
    }
    setUploadError('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setUploadError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    await onSubmit?.({ content: content.trim(), imageFile });
    setContent('');
    clearImage();
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <Textarea
        placeholder="¿Qué quieres compartir?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
      />

      {imagePreview && (
        <div className="relative mt-3">
          <img src={imagePreview} alt="" className="max-h-48 w-full rounded-xl object-cover" />
          <button
            type="button"
            onClick={clearImage}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white"
            aria-label="Quitar imagen"
          >
            <AppIcon icon={X} size={ICON_SIZES.sm} className="text-white" />
          </button>
        </div>
      )}

      {uploadError && <p className="mt-2 text-xs text-red-600">{uploadError}</p>}

      <div className="mt-3 flex items-center justify-between gap-3">
        <FileUpload
          label={imageFile ? 'Cambiar imagen' : 'Imagen'}
          accept="image/jpeg,image/png,image/webp"
          fileType="postImage"
          hint={FILE_HINTS.postImage}
          onUpload={handleImageSelect}
        />
        <Button type="submit" loading={loading} disabled={!content.trim()}>
          Publicar
        </Button>
      </div>
    </form>
  );
}
