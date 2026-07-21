import { isEmployerAuthor } from '../../constants/authorTypes';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminTable from '../../components/admin/AdminTable';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { useNotificationContext } from '../../context/NotificationContext';
import { adminService } from '../../services/admin.service';
import AppAvatar from '../../components/common/AppAvatar';
import { AvatarType, avatarTypeFromAuthorType } from '../../constants/avatarDefaults';
import { formatDate } from '../../utils/formatDate';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';
import { NEWS_CATEGORIES } from '../../constants/feedContentTypes';

const EMPTY_NEWS_FORM = {
  title: '',
  summary: '',
  url: '',
  category: 'employment',
  source: '',
};

export default function AdminPosts() {
  const { showToast } = useNotificationContext();
  const [activeTab, setActiveTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [newsArticles, setNewsArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [query, setQuery] = useState('');
  const [newsForm, setNewsForm] = useState(EMPTY_NEWS_FORM);
  const [savingNews, setSavingNews] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await adminService.getPosts();
    if (error) showToast(getSupabaseErrorMessage(error), 'error');
    setPosts(data ?? []);
    setLoading(false);
  }, [showToast]);

  const loadNews = useCallback(async () => {
    setLoading(true);
    const { data, error } = await adminService.getNewsArticles();
    if (error) showToast(getSupabaseErrorMessage(error), 'error');
    setNewsArticles(data ?? []);
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    if (activeTab === 'posts') loadPosts();
    else loadNews();
  }, [activeTab, loadPosts, loadNews]);

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

  const handleCreateNews = useCallback(async () => {
    const title = newsForm.title.trim();
    if (!title) {
      showToast('El título es obligatorio.', 'error');
      return;
    }

    setSavingNews(true);
    const { error } = await adminService.createNewsArticle({
      title,
      summary: newsForm.summary.trim() || null,
      url: newsForm.url.trim() || null,
      category: newsForm.category,
      source: newsForm.source.trim() || null,
      admin_created: true,
      is_active: true,
    });
    setSavingNews(false);

    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }

    showToast('Noticia publicada en el feed', 'success');
    setNewsForm(EMPTY_NEWS_FORM);
    await loadNews();
  }, [loadNews, newsForm, showToast]);

  const handleToggleNewsActive = useCallback(async (article) => {
    setActionId(article.id);
    const nextActive = !article.is_active;
    const { error } = await adminService.setNewsActive(article.id, nextActive);
    setActionId(null);
    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }
    showToast(nextActive ? 'Noticia activada' : 'Noticia desactivada', 'success');
    await loadNews();
  }, [loadNews, showToast]);

  const handleDeleteNews = useCallback(async (article) => {
    if (!window.confirm('¿Eliminar esta noticia?')) return;
    setActionId(article.id);
    const { error } = await adminService.deleteNewsArticle(article.id);
    setActionId(null);
    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }
    showToast('Noticia eliminada', 'success');
    await loadNews();
  }, [loadNews, showToast]);

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

  const filteredNews = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return newsArticles;

    return newsArticles.filter((article) =>
      [article.title, article.summary, article.category, article.source]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [newsArticles, query]);

  const postColumns = useMemo(
    () => [
      {
        key: 'author',
        label: 'Autor',
        render: (row) => {
          const authorType = row.author?.type === 'company' ? 'business' : row.author?.type;
          const avatarType = avatarTypeFromAuthorType(authorType);

          return (
            <div className="flex items-center gap-2">
              <AppAvatar
                type={avatarType}
                src={row.author?.avatar}
                name={row.author?.name}
                alt={row.author?.name}
                size="sm"
                variant={avatarType === AvatarType.PERSONAL ? 'circular' : 'rounded'}
                className="h-8 w-8"
              />
              <span>{row.author?.name?.trim() || row.author?.email || ''}</span>
            </div>
          );
        },
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
        render: (row) => (isEmployerAuthor(row.author_type) ? 'Business' : 'Personal'),
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

  const newsColumns = useMemo(
    () => [
      {
        key: 'title',
        label: 'Título',
        render: (row) => <span className="font-medium text-gray-900">{row.title}</span>,
      },
      {
        key: 'category',
        label: 'Categoría',
        render: (row) => NEWS_CATEGORIES.find((item) => item.value === row.category)?.label ?? row.category,
      },
      {
        key: 'source',
        label: 'Fuente',
        render: (row) => row.source || '—',
      },
      {
        key: 'status',
        label: 'Estado',
        render: (row) => (
          <AdminStatusBadge
            status={row.is_active ? 'active' : 'hidden'}
            label={row.is_active ? 'Activa' : 'Inactiva'}
          />
        ),
      },
      {
        key: 'published_at',
        label: 'Publicada',
        render: (row) => formatDate(row.published_at),
      },
      {
        key: 'actions',
        label: 'Acciones',
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={row.is_active ? 'secondary' : 'primary'}
              loading={actionId === row.id}
              onClick={() => handleToggleNewsActive(row)}
            >
              {row.is_active ? 'Desactivar' : 'Activar'}
            </Button>
            <Button
              size="sm"
              variant="danger"
              loading={actionId === row.id}
              onClick={() => handleDeleteNews(row)}
            >
              Eliminar
            </Button>
          </div>
        ),
      },
    ],
    [actionId, handleDeleteNews, handleToggleNewsActive],
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={activeTab === 'posts' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('posts')}
        >
          Publicaciones
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'news' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('news')}
        >
          Noticias del feed
        </Button>
      </div>

      {activeTab === 'news' && (
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900">Nueva noticia manual</h3>
          <Input
            label="Título"
            value={newsForm.title}
            onChange={(event) => setNewsForm((prev) => ({ ...prev, title: event.target.value }))}
            required
          />
          <Textarea
            label="Resumen"
            value={newsForm.summary}
            onChange={(event) => setNewsForm((prev) => ({ ...prev, summary: event.target.value }))}
            rows={3}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="URL externa"
              value={newsForm.url}
              onChange={(event) => setNewsForm((prev) => ({ ...prev, url: event.target.value }))}
              placeholder="https://..."
            />
            <Input
              label="Fuente"
              value={newsForm.source}
              onChange={(event) => setNewsForm((prev) => ({ ...prev, source: event.target.value }))}
            />
          </div>
          <Select
            label="Categoría"
            value={newsForm.category}
            onChange={(event) => setNewsForm((prev) => ({ ...prev, category: event.target.value }))}
            options={NEWS_CATEGORIES.map((item) => ({ value: item.value, label: item.label }))}
          />
          <Button loading={savingNews} onClick={handleCreateNews}>
            Publicar noticia
          </Button>
        </div>
      )}

      <Input
        label={activeTab === 'posts' ? 'Buscar publicaciones' : 'Buscar noticias'}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={activeTab === 'posts' ? 'Buscar por autor, contenido o estado' : 'Buscar por título, categoría o fuente'}
      />

      {activeTab === 'posts' ? (
        <AdminTable
          columns={postColumns}
          rows={filteredPosts.map((post) => ({ ...post, id: post.id }))}
          loading={loading}
          emptyMessage="No hay publicaciones."
        />
      ) : activeTab === 'news' ? (
        <AdminTable
          columns={newsColumns}
          rows={filteredNews.map((article) => ({ ...article, id: article.id }))}
          loading={loading}
          emptyMessage="No hay noticias."
        />
      ) : null}
    </div>
  );
}
