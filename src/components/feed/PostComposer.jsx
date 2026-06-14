import { useState } from 'react';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import FileUpload from '../ui/FileUpload';

export default function PostComposer({ onSubmit, loading = false }) {
  const [content, setContent] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    await onSubmit?.({ content: content.trim() });
    setContent('');
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <Textarea
        placeholder="¿Qué quieres compartir?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <FileUpload
          label="Imagen"
          accept="image/jpeg,image/png,image/webp"
          fileType="image"
          onUpload={(file, error) => {
            if (error) console.warn(error);
            else console.info('Image selected:', file?.name);
          }}
        />
        <Button type="submit" loading={loading} disabled={!content.trim()}>
          Publicar
        </Button>
      </div>
    </form>
  );
}
