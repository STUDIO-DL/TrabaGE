import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { useNotificationContext } from '../context/NotificationContext';
import { messagesService } from '../services/messages.service';
import { rolePath } from '../constants/roles';
import { notifyGuestBlocked } from '../utils/guestMode';

export function useStartConversation() {
  const navigate = useNavigate();
  const { user, role, isPreviewMode } = useAuth();
  const { showToast } = useNotificationContext();
  const [starting, setStarting] = useState(false);

  const startConversation = useCallback(
    async (otherUserId) => {
      if (!otherUserId) return { error: { message: 'Usuario no válido.' } };

      if (isPreviewMode || !user) {
        notifyGuestBlocked(showToast);
        return { error: { message: 'Inicia sesión para enviar mensajes.' } };
      }

      if (otherUserId === user.id) {
        return { error: { message: 'No puedes enviarte mensajes a ti mismo.' } };
      }

      setStarting(true);

      const { data: conversationId, error } = await messagesService.getOrCreateConversation(otherUserId);

      setStarting(false);

      if (error) {
        showToast(error.message ?? 'No se pudo abrir la conversación.', 'error');
        return { error };
      }

      navigate(rolePath(role, `/messages/${conversationId}`));
      return { data: conversationId, error: null };
    },
    [isPreviewMode, navigate, role, showToast, user],
  );

  return { startConversation, starting };
}
