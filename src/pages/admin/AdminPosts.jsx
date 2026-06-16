import { useEffect, useMemo, useState } from 'react';
import AdminTable from '../../components/admin/AdminTable';
import Button from '../../components/ui/Button';
import { useNotificationContext } from '../../context/NotificationContext';
import { adminService } from '../../services/admin.service';
import { DEFAULT_COMPANY_LOGO, DEFAULT_USER_AVATAR } from '../../constants/images';
import { formatDate } from '../../utils/formatDate';

export default function AdminPosts() {
  const { showToast } = useNotificationContext();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  const loadPosts = async () => {
    setLoading(true);
    const { data, error } = await adminService.getPosts();
    if (error) showToast(error.message, 'error');
    setPosts(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleDelete = async (post) => {
    if (!window.confirm('¿Eliminar esta publicación?')) return;
    setActionId(post.id);
    const { error } = await adminService.deletePost(post.id);
    setActionId(null);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Publicación eliminada', 'success');
    await loadPosts();
  };

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
                  ? row.author.avatar || DEFAULT_COMPANY_LOGO
                  : row.author?.avatar || DEFAULT_USER_AVATAR
              }
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
            <span>{row.author?.name ?? 'Usuario'}</span>
          </div>
        ),
      },
      {
        key: 'type',
        label: 'Tipo',
        render: (row) => (row.author_type === 'company' ? 'Empresa' : 'Candidato'),
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
              onClick={() => {
                const feedPath =
                  row.author_type === 'company' ? '/company/feed' : '/candidate/feed';
                window.open(feedPath, '_blank', 'noopener,noreferrer');
              }}
            >
              Ver
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
    [actionId],
  );

  return (
    <AdminTable
      columns={columns}
      rows={posts.map((post) => ({ ...post, id: post.id }))}
      loading={loading}
      emptyMessage="No hay publicaciones."
    />
  );
}
