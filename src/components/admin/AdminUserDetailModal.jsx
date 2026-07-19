import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { AdminUserDetailSkeleton } from '../common/Skeleton';
import AdminStatusBadge from './AdminStatusBadge';
import { adminService } from '../../services/admin.service';
import AppAvatar from '../common/AppAvatar';
import {
  AvatarType,
  avatarTypeFromRole,
} from '../../constants/avatarDefaults';
import { formatDate } from '../../utils/formatDate';
import { ROLE_LABELS } from '../../constants/roles';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-gray-50 py-2 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</span>
      <span className="text-sm text-gray-800 sm:max-w-[60%] sm:text-right">{value || '—'}</span>
    </div>
  );
}

export default function AdminUserDetailModal({ user, isOpen, onClose, onUpdated }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [detail, setDetail] = useState(null);
  const [exists, setExists] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    company_name: '',
    city: '',
    contact_email: '',
  });

  const isCompany =
    user?.role === 'company' || user?.role === 'business' || user?.role === 'organization';

  useEffect(() => {
    if (!isOpen || !user) return;
    let active = true;
    setLoading(true);
    setSaveError('');
    setDetail(null);
    setExists(false);

    adminService.getUserDetail(user.user_id, user.role).then((result) => {
      if (!active) return;
      setDetail(result.data);
      setExists(result.exists);
      setForm({
        full_name: result.data?.full_name ?? '',
        company_name: result.data?.company_name ?? '',
        city: result.data?.city ?? '',
        contact_email: result.data?.contact_email ?? '',
      });
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [isOpen, user]);

  if (!user) return null;

  const displayName =
    detail?.full_name ||
    detail?.company_name ||
    user.full_name ||
    user.company_name ||
    user.email ||
    '';
  const avatarType = isCompany
    ? avatarTypeFromRole(user.role, { companyType: detail?.company_type ?? user.company_type })
    : AvatarType.PERSONAL;
  const avatarPath =
    detail?.avatar_path ||
    detail?.logo_path ||
    detail?.avatar_url ||
    detail?.logo_url ||
    user.avatar_path ||
    user.logo_path ||
    user.avatar_url ||
    user.logo_url;

  const openFullProfile = () => {
    const path = isCompany ? `/companies/${user.user_id}` : `/profile/${user.user_id}`;
    onClose();
    navigate(path);
  };

  const saveProfile = async () => {
    setSaving(true);
    setSaveError('');
    const { error } = await adminService.updateUserProfile(user.user_id, form);
    setSaving(false);
    if (error) {
      setSaveError(getSupabaseErrorMessage(error, 'No se pudieron guardar los cambios.'));
      return;
    }
    onUpdated?.();
    const result = await adminService.getUserDetail(user.user_id, user.role);
    setDetail(result.data);
    setExists(result.exists);
  };

  const candidateSections = detail
    ? [
        ['Educación', detail.education?.length ?? 0],
        ['Experiencia', detail.experience?.length ?? 0],
        ['Certificaciones', detail.certifications?.length ?? 0],
        ['Habilidades', detail.skills?.length ?? 0],
        ['Servicios', detail.services?.length ?? 0],
        ['Idiomas', detail.languages?.length ?? 0],
      ]
    : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle del usuario">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <AppAvatar
            type={avatarType}
            src={avatarPath}
            name={displayName}
            alt={displayName}
            size="lg"
            variant={isCompany ? 'rounded' : 'circular'}
            className="h-14 w-14"
          />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-gray-900">{displayName}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
              <AdminStatusBadge
                status={user.is_active ? 'active' : 'inactive'}
                label={user.is_active ? 'Activo' : 'Inactivo'}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-2">
          <DetailRow label="Email" value={user.email} />
          <DetailRow label="Ciudad" value={detail?.city || user.city} />
          <DetailRow label="Registrado" value={formatDate(user.created_at)} />
          <DetailRow label="ID de usuario" value={<span className="break-all">{user.user_id}</span>} />
        </div>

        {loading ? (
          <AdminUserDetailSkeleton />
        ) : !exists ? (
          <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800">
            Este usuario todavía no ha completado su perfil. Solo se muestran los datos básicos
            de la cuenta.
          </div>
        ) : isCompany ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white px-4 py-2">
              <DetailRow label="Empresa / institución" value={detail.company_name} />
              <DetailRow label="Sector" value={detail.sector} />
              <DetailRow label="Descripción" value={detail.description} />
              <DetailRow label="Email de contacto" value={detail.contact_email} />
              <DetailRow label="WhatsApp" value={detail.contact_whatsapp || detail.whatsapp} />
              <DetailRow label="Sitio web" value={detail.website} />
            </div>
            <div className="grid gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-4 sm:grid-cols-2">
              <Input
                label="Nombre de empresa"
                value={form.company_name}
                onChange={(event) => setForm((prev) => ({ ...prev, company_name: event.target.value }))}
              />
              <Input
                label="Ciudad"
                value={form.city}
                onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
              />
              <Input
                label="Email de contacto"
                type="email"
                value={form.contact_email}
                onChange={(event) => setForm((prev) => ({ ...prev, contact_email: event.target.value }))}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white px-4 py-2">
              <DetailRow label="Titular" value={detail.headline} />
              <DetailRow label="Sobre mí" value={detail.about} />
              <DetailRow
                label="Años de experiencia"
                value={
                  detail.years_experience != null ? `${detail.years_experience}` : null
                }
              />
              <DetailRow label="Email de contacto" value={detail.contact_email} />
              <DetailRow label="WhatsApp" value={detail.contact_whatsapp} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {candidateSections.map(([label, count]) => (
                <div
                  key={label}
                  className="rounded-xl border border-gray-100 bg-gray-50/60 p-2 text-center"
                >
                  <p className="text-base font-semibold text-gray-900">{count}</p>
                  <p className="text-[11px] text-gray-500">{label}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-4 sm:grid-cols-2">
              <Input
                label="Nombre"
                value={form.full_name}
                onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
              />
              <Input
                label="Ciudad"
                value={form.city}
                onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
              />
              <Input
                label="Email de contacto"
                type="email"
                value={form.contact_email}
                onChange={(event) => setForm((prev) => ({ ...prev, contact_email: event.target.value }))}
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          {saveError && <p className="w-full text-sm text-red-600">{saveError}</p>}
          {exists && user.role !== 'admin' && (
            <Button variant="secondary" loading={saving} onClick={saveProfile}>
              Guardar cambios
            </Button>
          )}
          {exists && (
            <Button variant="secondary" onClick={openFullProfile}>
              Abrir perfil completo
            </Button>
          )}
          <Button variant="primary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
