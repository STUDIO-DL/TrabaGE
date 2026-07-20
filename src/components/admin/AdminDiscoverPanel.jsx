import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminTable from './AdminTable';
import AdminStatusBadge from './AdminStatusBadge';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import { useNotificationContext } from '../../context/NotificationContext';
import { adminService } from '../../services/admin.service';
import { formatDate } from '../../utils/formatDate';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';
import { EVENT_TYPES } from '../../constants/feedContentTypes';

const EMPTY_EVENT_FORM = {
  title: '',
  description: '',
  event_type: 'job_fair',
  location: '',
  starts_at: '',
};

const EMPTY_COURSE_FORM = {
  title: '',
  provider: '',
  url: '',
  category: 'education',
};

const COURSE_CATEGORIES = [
  { value: 'education', label: 'Formación' },
  { value: 'scholarship', label: 'Beca' },
  { value: 'certification', label: 'Certificación' },
  { value: 'program', label: 'Programa' },
];

export default function AdminDiscoverPanel() {
  const { showToast } = useNotificationContext();
  const [subTab, setSubTab] = useState('events');
  const [events, setEvents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [eventForm, setEventForm] = useState(EMPTY_EVENT_FORM);
  const [courseForm, setCourseForm] = useState(EMPTY_COURSE_FORM);
  const [saving, setSaving] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await adminService.getFeedEvents();
    if (error) showToast(getSupabaseErrorMessage(error), 'error');
    setEvents(data ?? []);
    setLoading(false);
  }, [showToast]);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    const { data, error } = await adminService.getFeedCourses();
    if (error) showToast(getSupabaseErrorMessage(error), 'error');
    setCourses(data ?? []);
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    if (subTab === 'events') void loadEvents();
    else void loadCourses();
  }, [subTab, loadEvents, loadCourses]);

  const handleCreateEvent = useCallback(async () => {
    const title = eventForm.title.trim();
    if (!title || !eventForm.starts_at) {
      showToast('Título y fecha de inicio son obligatorios.', 'error');
      return;
    }
    setSaving(true);
    const { error } = await adminService.createFeedEvent({
      title,
      description: eventForm.description.trim() || null,
      event_type: eventForm.event_type,
      location: eventForm.location.trim() || null,
      starts_at: new Date(eventForm.starts_at).toISOString(),
      organizer_type: 'admin',
      is_active: true,
    });
    setSaving(false);
    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }
    showToast('Evento creado', 'success');
    setEventForm(EMPTY_EVENT_FORM);
    await loadEvents();
  }, [eventForm, loadEvents, showToast]);

  const handleCreateCourse = useCallback(async () => {
    const title = courseForm.title.trim();
    if (!title) {
      showToast('El título es obligatorio.', 'error');
      return;
    }
    setSaving(true);
    const { error } = await adminService.createFeedCourse({
      title,
      provider: courseForm.provider.trim() || null,
      url: courseForm.url.trim() || null,
      category: courseForm.category,
      is_active: true,
    });
    setSaving(false);
    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }
    showToast('Curso/beca creado', 'success');
    setCourseForm(EMPTY_COURSE_FORM);
    await loadCourses();
  }, [courseForm, loadCourses, showToast]);

  const handleToggleEvent = useCallback(async (event) => {
    setActionId(event.id);
    const { error } = await adminService.setFeedEventActive(event.id, !event.is_active);
    setActionId(null);
    if (error) showToast(getSupabaseErrorMessage(error), 'error');
    else await loadEvents();
  }, [loadEvents, showToast]);

  const handleDeleteEvent = useCallback(async (event) => {
    if (!window.confirm('¿Eliminar este evento?')) return;
    setActionId(event.id);
    const { error } = await adminService.deleteFeedEvent(event.id);
    setActionId(null);
    if (error) showToast(getSupabaseErrorMessage(error), 'error');
    else await loadEvents();
  }, [loadEvents, showToast]);

  const handleToggleCourse = useCallback(async (course) => {
    setActionId(course.id);
    const { error } = await adminService.setFeedCourseActive(course.id, !course.is_active);
    setActionId(null);
    if (error) showToast(getSupabaseErrorMessage(error), 'error');
    else await loadCourses();
  }, [loadCourses, showToast]);

  const handleDeleteCourse = useCallback(async (course) => {
    if (!window.confirm('¿Eliminar este curso/beca?')) return;
    setActionId(course.id);
    const { error } = await adminService.deleteFeedCourse(course.id);
    setActionId(null);
    if (error) showToast(getSupabaseErrorMessage(error), 'error');
    else await loadCourses();
  }, [loadCourses, showToast]);

  const eventColumns = useMemo(
    () => [
      { key: 'title', label: 'Título', render: (row) => row.title },
      {
        key: 'event_type',
        label: 'Tipo',
        render: (row) => EVENT_TYPES.find((item) => item.value === row.event_type)?.label ?? row.event_type,
      },
      { key: 'starts_at', label: 'Inicio', render: (row) => formatDate(row.starts_at) },
      {
        key: 'status',
        label: 'Estado',
        render: (row) => (
          <AdminStatusBadge status={row.is_active ? 'active' : 'hidden'} label={row.is_active ? 'Activo' : 'Inactivo'} />
        ),
      },
      {
        key: 'actions',
        label: 'Acciones',
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" loading={actionId === row.id} onClick={() => handleToggleEvent(row)}>
              {row.is_active ? 'Desactivar' : 'Activar'}
            </Button>
            <Button size="sm" variant="danger" loading={actionId === row.id} onClick={() => handleDeleteEvent(row)}>
              Eliminar
            </Button>
          </div>
        ),
      },
    ],
    [actionId, handleDeleteEvent, handleToggleEvent],
  );

  const courseColumns = useMemo(
    () => [
      { key: 'title', label: 'Título', render: (row) => row.title },
      {
        key: 'category',
        label: 'Categoría',
        render: (row) => COURSE_CATEGORIES.find((item) => item.value === row.category)?.label ?? row.category,
      },
      { key: 'provider', label: 'Proveedor', render: (row) => row.provider || '—' },
      {
        key: 'status',
        label: 'Estado',
        render: (row) => (
          <AdminStatusBadge status={row.is_active ? 'active' : 'hidden'} label={row.is_active ? 'Activo' : 'Inactivo'} />
        ),
      },
      {
        key: 'actions',
        label: 'Acciones',
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" loading={actionId === row.id} onClick={() => handleToggleCourse(row)}>
              {row.is_active ? 'Desactivar' : 'Activar'}
            </Button>
            <Button size="sm" variant="danger" loading={actionId === row.id} onClick={() => handleDeleteCourse(row)}>
              Eliminar
            </Button>
          </div>
        ),
      },
    ],
    [actionId, handleDeleteCourse, handleToggleCourse],
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button size="sm" variant={subTab === 'events' ? 'primary' : 'secondary'} onClick={() => setSubTab('events')}>
          Eventos
        </Button>
        <Button size="sm" variant={subTab === 'courses' ? 'primary' : 'secondary'} onClick={() => setSubTab('courses')}>
          Cursos y becas
        </Button>
      </div>

      {subTab === 'events' ? (
        <>
          <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">Nuevo evento</h3>
            <Input label="Título" value={eventForm.title} onChange={(e) => setEventForm((p) => ({ ...p, title: e.target.value }))} />
            <Textarea label="Descripción" value={eventForm.description} onChange={(e) => setEventForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label="Tipo"
                value={eventForm.event_type}
                onChange={(e) => setEventForm((p) => ({ ...p, event_type: e.target.value }))}
                options={EVENT_TYPES.map((item) => ({ value: item.value, label: item.label }))}
              />
              <Input label="Fecha y hora" type="datetime-local" value={eventForm.starts_at} onChange={(e) => setEventForm((p) => ({ ...p, starts_at: e.target.value }))} />
            </div>
            <Input label="Lugar" value={eventForm.location} onChange={(e) => setEventForm((p) => ({ ...p, location: e.target.value }))} />
            <Button loading={saving} onClick={handleCreateEvent}>Publicar evento</Button>
          </div>
          <AdminTable columns={eventColumns} rows={events} loading={loading} emptyMessage="No hay eventos." />
        </>
      ) : (
        <>
          <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">Nuevo curso o beca</h3>
            <Input label="Título" value={courseForm.title} onChange={(e) => setCourseForm((p) => ({ ...p, title: e.target.value }))} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Proveedor" value={courseForm.provider} onChange={(e) => setCourseForm((p) => ({ ...p, provider: e.target.value }))} />
              <Select
                label="Categoría"
                value={courseForm.category}
                onChange={(e) => setCourseForm((p) => ({ ...p, category: e.target.value }))}
                options={COURSE_CATEGORIES}
              />
            </div>
            <Input label="URL" value={courseForm.url} onChange={(e) => setCourseForm((p) => ({ ...p, url: e.target.value }))} placeholder="https://..." />
            <Button loading={saving} onClick={handleCreateCourse}>Publicar</Button>
          </div>
          <AdminTable columns={courseColumns} rows={courses} loading={loading} emptyMessage="No hay cursos ni becas." />
        </>
      )}
    </div>
  );
}
