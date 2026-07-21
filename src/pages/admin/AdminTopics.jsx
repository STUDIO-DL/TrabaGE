import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminTable from '../../components/admin/AdminTable';
import AdminStatusBadge from '../../components/admin/AdminStatusBadge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useNotificationContext } from '../../context/NotificationContext';
import { adminService } from '../../services/admin.service';
import { formatDate } from '../../utils/formatDate';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';

export default function AdminTopics() {
  const { showToast } = useNotificationContext();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [query, setQuery] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const loadTopics = useCallback(async () => {
    setLoading(true);
    const { data, error } = await adminService.listTopics();
    if (error) showToast(getSupabaseErrorMessage(error), 'error');
    setTopics(data ?? []);
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name) {
      showToast('El nombre del tema es obligatorio.', 'error');
      return;
    }

    setCreating(true);
    const { error } = await adminService.createTopic(name);
    setCreating(false);

    if (error) {
      showToast(getSupabaseErrorMessage(error, 'No se pudo crear el tema.'), 'error');
      return;
    }

    showToast('Tema creado', 'success');
    setNewName('');
    await loadTopics();
  }, [loadTopics, newName, showToast]);

  const handleRename = useCallback(
    async (topic) => {
      const next = window.prompt('Nuevo nombre del tema', topic.name);
      if (next == null) return;
      const name = next.trim();
      if (!name || name === topic.name) return;

      setActionId(topic.id);
      const { error } = await adminService.updateTopic(topic.id, { name });
      setActionId(null);

      if (error) {
        showToast(getSupabaseErrorMessage(error, 'No se pudo actualizar el tema.'), 'error');
        return;
      }

      showToast('Tema actualizado', 'success');
      await loadTopics();
    },
    [loadTopics, showToast],
  );

  const handleToggleActive = useCallback(
    async (topic) => {
      setActionId(topic.id);
      const nextActive = !topic.is_active;
      const { error } = await adminService.updateTopic(topic.id, { isActive: nextActive });
      setActionId(null);

      if (error) {
        showToast(getSupabaseErrorMessage(error, 'No se pudo cambiar el estado.'), 'error');
        return;
      }

      showToast(nextActive ? 'Tema activado' : 'Tema desactivado', 'success');
      await loadTopics();
    },
    [loadTopics, showToast],
  );

  const handleDelete = useCallback(
    async (topic) => {
      if (Number(topic.usage_count) > 0) {
        showToast('No se puede eliminar: el tema está en uso. Desactívalo en su lugar.', 'error');
        return;
      }

      if (!window.confirm(`¿Eliminar el tema «${topic.name}»?`)) return;

      setActionId(topic.id);
      const { error } = await adminService.deleteUnusedTopic(topic.id);
      setActionId(null);

      if (error) {
        showToast(getSupabaseErrorMessage(error, 'No se pudo eliminar el tema.'), 'error');
        return;
      }

      showToast('Tema eliminado', 'success');
      await loadTopics();
    },
    [loadTopics, showToast],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return topics;
    return topics.filter((topic) =>
      [topic.name, topic.slug].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [query, topics]);

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Nombre',
        render: (row) => (
          <div>
            <p className="font-medium text-gray-900">{row.name}</p>
            <p className="text-xs text-gray-500">{row.slug}</p>
          </div>
        ),
      },
      {
        key: 'usage',
        label: 'Usos',
        render: (row) => Number(row.usage_count ?? 0),
      },
      {
        key: 'status',
        label: 'Estado',
        render: (row) => (
          <AdminStatusBadge
            status={row.is_active ? 'active' : 'hidden'}
            label={row.is_active ? 'Activo' : 'Inactivo'}
          />
        ),
      },
      {
        key: 'updated_at',
        label: 'Actualizado',
        render: (row) => formatDate(row.updated_at),
      },
      {
        key: 'actions',
        label: 'Acciones',
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              loading={actionId === row.id}
              onClick={() => handleRename(row)}
            >
              Editar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              loading={actionId === row.id}
              onClick={() => handleToggleActive(row)}
            >
              {row.is_active ? 'Desactivar' : 'Activar'}
            </Button>
            <Button
              size="sm"
              variant="danger"
              loading={actionId === row.id}
              disabled={Number(row.usage_count) > 0}
              onClick={() => handleDelete(row)}
            >
              Eliminar
            </Button>
          </div>
        ),
      },
    ],
    [actionId, handleDelete, handleRename, handleToggleActive],
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">Nuevo tema</h2>
        <p className="mt-1 text-sm text-gray-500">
          Los temas forman el catálogo oficial. No se permiten duplicados.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre del tema"
            className="sm:max-w-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreate();
              }
            }}
          />
          <Button loading={creating} onClick={handleCreate}>
            Crear tema
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar tema…"
          className="sm:max-w-xs"
        />
        <p className="text-sm text-gray-500">{filtered.length} temas</p>
      </div>

      <AdminTable
        columns={columns}
        rows={filtered}
        loading={loading}
        emptyMessage="No hay temas en el catálogo."
      />
    </div>
  );
}
