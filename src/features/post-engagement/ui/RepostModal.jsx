import { useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Textarea from '../../../components/ui/Textarea';

export default function RepostModal({
  isOpen,
  onClose,
  onRepostDirect,
  onRepostWithComment,
  loading = false,
}) {
  const [mode, setMode] = useState('choose');
  const [commentary, setCommentary] = useState('');

  const handleClose = () => {
    setMode('choose');
    setCommentary('');
    onClose?.();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Compartir en TrabaGE" size="sm">
      {mode === 'choose' ? (
        <div className="space-y-space-sm">
          <p className="text-body-small text-app-muted">
            Comparte esta publicación con tu red manteniendo la referencia al autor original.
          </p>
          <Button
            fullWidth
            variant="secondary"
            onClick={async () => {
              const result = await onRepostDirect?.();
              if (result?.ok !== false) handleClose();
            }}
            loading={loading}
          >
            Repost directo
          </Button>
          <Button fullWidth onClick={() => setMode('quote')} disabled={loading}>
            Repost con comentario
          </Button>
        </div>
      ) : (
        <div className="space-y-space-md">
          <Textarea
            value={commentary}
            onChange={(e) => setCommentary(e.target.value)}
            placeholder="Añade un comentario a tu repost…"
            rows={3}
            maxLength={2000}
          />
          <div className="flex justify-end gap-space-sm">
            <Button variant="ghost" onClick={() => setMode('choose')} disabled={loading}>
              Atrás
            </Button>
            <Button
              onClick={async () => {
                const result = await onRepostWithComment?.(commentary.trim() || null);
                if (result?.ok !== false) handleClose();
              }}
              loading={loading}
            >
              Publicar repost
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
