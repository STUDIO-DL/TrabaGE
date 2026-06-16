import { supabase } from '../config/supabase';
import { notificationsService } from './notifications.service';
import { VERIFICATION_BUCKET } from '../utils/companyVerification';

const PUSH_FUNCTION = 'send_push';

async function sendPushNotification(recipientId, title, body, data = {}) {
  try {
    await supabase.functions.invoke(PUSH_FUNCTION, {
      body: {
        recipient_id: recipientId,
        title,
        body,
        data,
      },
    });
  } catch (error) {
    console.warn('[TrabaGE] Push notification failed:', error?.message || error);
  }
}

async function createVerificationNotification(recipientId, type, title, body, metadata = {}) {
  const { error } = await notificationsService.create({
    recipient_id: recipientId,
    type,
    title,
    body,
    metadata,
  });

  if (error) {
    console.warn('[TrabaGE] Notification create failed:', error.message);
    return;
  }

  await sendPushNotification(recipientId, title, body, { type, ...metadata });
}

export const verificationService = {
  getLatestRequest: (companyId) =>
    supabase
      .from('verification_requests')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

  getCompanyVerificationProfile: (companyId) =>
    supabase
      .from('company_profiles')
      .select(
        'user_id, company_name, is_verified, verification_status, verified_at, verified_by, verified_status',
      )
      .eq('user_id', companyId)
      .single(),

  submitRequest: async (documentPath, documentName) => {
    const { data, error } = await supabase.rpc('submit_verification_request', {
      p_document_path: documentPath,
      p_document_name: documentName,
    });

    if (error) return { data: null, error };

    await createVerificationNotification(
      data.company_id,
      'verification_submitted',
      'Solicitud enviada',
      'Tu solicitud de verificación está siendo revisada.',
      { request_id: data.id },
    );

    return { data, error: null };
  },

  reviewRequest: async (requestId, action, reviewNotes = null) => {
    const { data, error } = await supabase.rpc('review_verification_request', {
      p_request_id: requestId,
      p_action: action,
      p_review_notes: reviewNotes,
    });

    if (error) return { data: null, error };

    const companyId = data.company_id;
    if (action === 'approved') {
      await createVerificationNotification(
        companyId,
        'verification_approved',
        'Empresa verificada',
        'Tu empresa ha sido verificada correctamente.',
        { request_id: requestId },
      );
    } else {
      await createVerificationNotification(
        companyId,
        'verification_rejected',
        'Verificación rechazada',
        'Tu solicitud de verificación necesita correcciones.',
        { request_id: requestId, review_notes: reviewNotes },
      );
    }

    return { data, error: null };
  },

  getPendingRequests: () =>
    supabase
      .from('verification_requests')
      .select('*, company_profiles(company_name, logo_path, is_verified, verification_status)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),

  getSignedDocumentUrl: (documentPath, expiresIn = 3600) =>
    supabase.storage.from(VERIFICATION_BUCKET).createSignedUrl(documentPath, expiresIn),
};
