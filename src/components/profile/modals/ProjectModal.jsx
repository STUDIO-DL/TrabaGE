import { useEffect, useRef, useState } from 'react';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Textarea from '../../ui/Textarea';
import Button from '../../ui/Button';
import AppIcon from '../../common/AppIcon';
import { Camera, Save, X, ICON_SIZES } from '../../../constants/icons';
import { validateFile, FILE_HINTS } from '../../../utils/validateFile';
import {
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_TITLE_MAX_LENGTH,
} from '../../../constants/projects';
import { resolveProjectImageUrl } from '../../../utils/storagePaths';

const emptyForm = {
  title: '',
  description: '',
};

export default function ProjectModal({ isOpen, onClose, initial, onSave, loading }) {
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    setForm(
      initial
        ? {
            title: initial.title || '',
            description: initial.description || '',
          }
        : emptyForm,
    );
    setImageFile(null);
    setImagePreview(initial?.image_path ? resolveProjectImageUrl(initial.image_path) : null);
    setError('');
  }, [isOpen, initial]);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleImageSelect = (file) => {
    if (!file) return;

    const validation = validateFile(file, 'postImage');
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setError('');
    setImageFile(file);
    setImagePreview((current) => {
      if (current?.startsWith('blob:')) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  };

  const handleFileInputChange = (event) => {
    handleImageSelect(event.target.files?.[0]);
    event.target.value = '';
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview((current) => {
      if (current?.startsWith('blob:')) URL.revokeObjectURL(current);
      return initial?.image_path ? resolveProjectImageUrl(initial.image_path) : null;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.title.trim()) {
      setError('El título es obligatorio.');
      return;
    }
    if (!form.description.trim()) {
      setError('La descripción es obligatoria.');
      return;
    }
    if (!initial?.image_path && !imageFile) {
      setError('La foto del proyecto es obligatoria.');
      return;
    }

    const { error: saveError } = await onSave(
      {
        title: form.title,
        description: form.description,
        imageFile,
      },
      initial,
    );

    if (saveError) {
      setError(saveError.message);
      return;
    }

    onClose();
  };

  const descriptionLength = form.description.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initial ? 'Editar proyecto' : 'Añadir proyecto'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-app-text">
            Foto del proyecto <span className="text-red-500">*</span>
          </p>
          {imagePreview ? (
            <div className="relative overflow-hidden rounded-radius-md border border-app-divider">
              <img
                src={imagePreview}
                alt="Vista previa del proyecto"
                className="aspect-[16/10] w-full object-cover"
              />
              <div className="absolute right-2 top-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-radius-circular bg-black/55 text-white"
                  aria-label="Cambiar foto"
                >
                  <AppIcon icon={Camera} size={ICON_SIZES.sm} />
                </button>
                {imageFile && (
                  <button
                    type="button"
                    onClick={clearImage}
                    className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-radius-circular bg-black/55 text-white"
                    aria-label="Quitar foto seleccionada"
                  >
                    <AppIcon icon={X} size={ICON_SIZES.sm} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-radius-md border border-dashed border-app-border bg-app-surface px-4 py-8 text-app-muted transition-colors hover:border-primary-300 hover:text-primary-700"
            >
              <AppIcon icon={Camera} size={ICON_SIZES.lg} />
              <span className="text-sm font-medium">Seleccionar foto</span>
              <span className="text-xs">{FILE_HINTS.postImage}</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileInputChange}
          />
        </div>

        <Input
          label="Título"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          maxLength={PROJECT_TITLE_MAX_LENGTH}
          required
        />

        <div>
          <Textarea
            label="Descripción"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            rows={5}
            maxLength={PROJECT_DESCRIPTION_MAX_LENGTH}
            required
          />
          <p className="mt-1 text-caption text-app-subtle">
            {descriptionLength}/{PROJECT_DESCRIPTION_MAX_LENGTH}
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" fullWidth loading={loading} className="gap-2">
          <AppIcon icon={Save} size={ICON_SIZES.default} className="text-white" />
          Guardar
        </Button>
      </form>
    </Modal>
  );
}
