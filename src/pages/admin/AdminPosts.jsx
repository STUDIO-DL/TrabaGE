import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminTable from '../../components/admin/AdminTable';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useNotificationContext } from '../../context/NotificationContext';
import { adminService } from '../../services/admin.service';
import { getCompanyLogoUrl } from '../../constants/images';
import { formatDate } from '../../utils/formatDate';
import { resolveUserAvatar } from '../../utils/resolveUserAvatar';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';

export default function AdminPosts() {
  const { showToast } = useNotificationContext();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [query, setQuery] = useState('');

  const loadPosts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await adminService.getPosts();
    if (error) showToast(getSupabaseErrorMessage(error), 'error');
    setPosts(data ?? []);
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleDelete = useCallback(async (post) => {
    if (!window.confirm('¿Eliminar esta publicación?')) return;
    setActionId(post.id);
    const { error } = await adminService.deletePost(post.id);
    setActionId(null);
    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }
    showToast('Publicación eliminada', 'success');
    await loadPosts();
  }, [loadPosts, showToast]);

  const handleToggleHidden = useCallback(async (post) => {
    setActionId(post.id);
    const nextHidden = !post.is_hidden;
    const { error } = await adminService.setPostHidden(post.id, nextHidden);
    setActionId(null);
    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }
    showToast(nextHidden ? 'Publicación oculta' : 'Publicación restaurada', 'success');
    await loadPosts();
  }, [loadPosts, showToast]);

  const filteredPosts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return posts;

    return posts.filter((post) =>
      [
        post.content,
        post.author?.name,
        post.author_type,
        post.is_hidden ? 'oculta' : 'visible',
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [posts, query]);

  const columns = useMemo(
    () => [
      {
        key: 'author',
        label: 'Autor',
        render: (row) => (
          <div className="flex items-center gap-2">
            <img
              src={
                row.author?.type === 'company'
                  ? getCompanyLogoUrl(row.author.avatar)
                  : resolveUserAvatar(row.author?.avatar)
              }
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
            <span>{row.author?.name ?? 'Usuario'}</span>
          </div>
        ),
      },
      {
        key: 'content',
        label: 'Contenido',
        render: (row) => (
          <span className="block max-w-xs truncate text-gray-700">
            {row.content || 'Sin texto'}
          </span>
        ),
      },
      {
        key: 'type',
        label: 'Tipo',
        render: (row) => (row.author_type === 'company' ? 'Empresa' : 'Candidato'),
      },
      {
        key: 'status',
        label: 'Estado',
        render: (row) => (
          <AdminStatusBadge
            status={row.is_hidden ? 'hidden' : 'active'}
            label={row.is_hidden ? 'Oculta' : 'Visible'}
          />
        ),
      },
      {
        key: 'created_at',
        label: 'Creada',
        render: (row) => formatDate(row.created_at),
      },
      {
        key: 'reports',
        label: 'Reportes',
        render: (row) => row.reports_count ?? 0,
      },
      {
        key: 'actions',
        label: 'Acciones',
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => window.open(`/feed/post/${row.id}`, '_blank', 'noopener,noreferrer')}
            >
              Ver
            </Button>
            <Button
              size="sm"
              variant={row.is_hidden ? 'primary' : 'secondary'}
              loading={actionId === row.id}
              onClick={() => handleToggleHidden(row)}
            >
              {row.is_hidden ? 'Restaurar' : 'Ocultar'}
            </Button>
            <Button
              size="sm"
              variant="danger"
              loading={actionId === row.id}
              onClick={() => handleDelete(row)}
            >
              Eliminar
            </Button>
          </div>
        ),
      },
    ],
    [actionId, handleDelete, handleToggleHidden],
  );

  return (
    <div className="space-y-4">
      <Input
        label="Buscar publicaciones"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por autor, contenido o estado"
      />
      <AdminTable
        columns={columns}
        rows={filteredPosts.map((post) => ({ ...post, id: post.id }))}
        loading={loading}
        emptyMessage="No hay publicaciones."
      />
    </div>
  );
}
