# TrabaGE — Project Summary

> Documento maestro de referencia para desarrolladores.  
> Generado a partir del análisis del código fuente real.  
> **Fecha del resumen:** 15 de julio de 2026

---

## 1. Información General

| Campo | Valor |
|-------|-------|
| **Nombre** | TrabaGE |
| **Versión** | `0.1.0` |
| **Descripción** | Plataforma digital de empleo y oportunidades profesionales para Guinea Ecuatorial. Conecta talento (Cuenta Personal) con Business y Organizaciones. |
| **Objetivo** | Facilitar perfiles profesionales, ofertas de empleo, postulaciones, networking, feed de contenido y recomendaciones inteligentes basadas en reglas. |
| **Estado actual** | Desarrollo avanzado, preparado para producción. Funcionalidades core implementadas y endurecidas. |
| **Fase** | **Pre-producción / MVP+** — listo para lanzamiento operacional tras aplicar migraciones y desplegar Edge Functions en Supabase remoto. |
| **Dominio producción** | `https://trabage.org` |
| **Desarrollador** | ZARREL |

---

## 2. Stack Tecnológico

### Frontend

| Tecnología | Versión | Uso |
|------------|---------|-----|
| React | `^19.1.0` | UI y componentes |
| React DOM | `^19.1.0` | Renderizado |
| React Router DOM | `^6.30.1` | Routing SPA |
| Vite | `^6.3.5` | Build y dev server |
| Tailwind CSS | `^3.4.17` | Estilos utility-first |
| Lucide React | `^1.18.0` | Iconografía |
| vite-plugin-pwa | `^0.21.2` | PWA / Service Worker |

### Backend

| Tecnología | Uso |
|------------|-----|
| **Supabase** | Backend-as-a-Service: PostgreSQL, Auth, Storage, Edge Functions, RLS |
| **PostgreSQL 17** | Base de datos (local según `supabase/config.toml`) |
| **Deno** | Runtime de Edge Functions |

### Base de datos

- PostgreSQL gestionado por Supabase
- **64 migraciones SQL** (`001` → `064`)
- Full-Text Search (FTS) en perfiles, empleos y posts
- RLS habilitado en todas las tablas de aplicación

### Autenticación

- Supabase Auth
- Email + contraseña (verificación obligatoria)
- Google OAuth
- JWT con refresh token rotation
- Contraseña mínima: 10 caracteres con mayúscula, minúscula, número y símbolo

### Notificaciones

- **In-app:** tabla `notifications` en Supabase
- **Push:** OneSignal (`react-onesignal`)
- Preferencias granulares persistidas en `notification_preferences`

### Almacenamiento

- Supabase Storage (8 buckets)
- Subida validada client-side y server-side (MIME, tamaño, rutas)

### Arquitectura

```
SPA React (Vite) ──► Supabase Client SDK
                         ├── PostgreSQL + RLS + RPCs
                         ├── Auth
                         ├── Storage
                         └── Edge Functions (Deno)
                              ├── send_push
                              ├── match_job_recommendations
                              ├── send_welcome_email
                              └── process_matching_recalc
```

### Routing

- React Router v6 con lazy loading (`React.lazy` + `Suspense`)
- Rutas protegidas: `ProtectedRoute`, `RoleRoute`
- Redirects legacy: `/candidate/*` → `/personal/*`, `/company/*` → `/business/*`

### State Management

- **React Context** (no Redux/Zustand):
  - `AuthContext` — sesión, rol, perfiles
  - `ThemeContext` — light/dark mode
  - `NotificationContext` — toasts in-app
- **Custom hooks** — lógica de dominio desacoplada (19 hooks)

### Servicios externos

| Servicio | Uso |
|----------|-----|
| Supabase | Backend completo |
| OneSignal | Push notifications |
| Sentry | Error tracking (`@sentry/react ^9.30.0`) |
| Formspree | Formulario de contacto (help center) |
| Google OAuth | Login/registro social |
| Netlify | Hosting y deploy |

### Firebase

**No utilizado.** No hay dependencias ni configuración de Firebase en el proyecto.

---

## 3. Arquitectura del Proyecto

> TrabaGE es una SPA React, no Flutter. La estructura real es:

```
TrabaGE/
├── public/                    # Assets estáticos, PWA, icons, manifest, SW
├── scripts/                   # Scripts Node/PowerShell (admin, icons, Supabase CLI)
├── supabase/
│   ├── config.toml            # Config local de Supabase
│   ├── migrations/            # 64 migraciones SQL
│   └── functions/             # 4 Edge Functions (Deno)
├── src/
│   ├── App.jsx                # Router principal
│   ├── main.jsx               # Entry point
│   ├── assets/                # Imágenes, branding, empty states
│   ├── components/            # Componentes UI por dominio (145 archivos)
│   │   ├── admin/             # Panel de administración
│   │   ├── auth/              # Login/registro social
│   │   ├── common/            # Componentes compartidos (avatar, skeleton, etc.)
│   │   ├── company/           # Perfil, dashboard, verificación empresa
│   │   ├── feed/              # Cards de feed (post, news, event, course)
│   │   ├── jobs/              # Listado, filtros, cards de empleo
│   │   ├── layout/            # BottomNav, TopBar, PageContainer
│   │   ├── notifications/     # Vista de notificaciones
│   │   ├── profile/           # Secciones de perfil candidato + modals
│   │   ├── routing/           # ProtectedRoute, RoleRoute
│   │   ├── search/            # Búsqueda global
│   │   ├── settings/          # Configuración, apariencia, notificaciones
│   │   └── ui/                # Design system base (Button, Input, Modal, etc.)
│   ├── config/                # Supabase, OneSignal, Sentry, env
│   ├── constants/             # Tokens, roles, preferencias, sectores (31 archivos)
│   ├── context/               # AuthContext, ThemeContext, NotificationContext
│   ├── data/                  # Help center, textos legales
│   ├── hooks/                 # 19 custom hooks
│   ├── pages/                 # Páginas por ruta (55 archivos)
│   │   ├── admin/             # 9 páginas admin
│   │   ├── auth/              # Login, registro, callback, password
│   │   ├── candidate/         # Flujo personal (importa desde pages/candidate/)
│   │   ├── company/           # Flujo business/organization
│   │   ├── setup/             # Onboarding post-registro
│   │   └── shared/            # Legal, perfiles públicos, 404
│   ├── services/              # Capa de acceso a datos (22 servicios)
│   ├── styles/                # CSS global + variables de tema
│   └── utils/                 # Utilidades puras (40 archivos)
├── index.html
├── vite.config.js
├── tailwind.config.js
├── netlify.toml
├── package.json
└── .env.example
```

### Descripción de carpetas clave

| Carpeta | Responsabilidad |
|---------|-----------------|
| `components/` | UI reutilizable organizada por dominio de negocio |
| `components/ui/` | Primitivos del design system (Button, Input, Modal, Toast…) |
| `pages/` | Páginas contenedoras conectadas a rutas |
| `services/` | Llamadas a Supabase (CRUD, RPCs, Storage) |
| `hooks/` | Estado y lógica reutilizable por componentes |
| `context/` | Estado global (auth, tema, toasts) |
| `constants/` | Configuración estática, tokens, enums de UI |
| `utils/` | Funciones puras (matching, validación, formateo) |
| `config/` | Inicialización de clientes externos |
| `supabase/migrations/` | Schema, RLS, triggers, RPCs |
| `supabase/functions/` | Lógica server-side en Deno |

---

## 4. Design System

### Colores

| Token | Valor | Uso |
|-------|-------|-----|
| **Primary (brand)** | `#2563EB` | Botones, links, acentos |
| **Success** | `#16A34A` | Estados positivos |
| **Warning** | `#D97706` | Alertas |
| **Error** | `#DC2626` | Errores, peligro |
| **Surfaces** | CSS vars `--app-bg`, `--app-card`, `--app-surface` | Fondos light/dark |
| **Text** | `--app-text`, `--app-muted`, `--app-subtle` | Jerarquía tipográfica |

Escala primary completa: `50` → `900` definida en `src/constants/designTokens.js`.

### Tipografía

- **Fuente:** Inter + system fallbacks
- **Escala:** display (40px) → caption (12px)
- **Clases Tailwind:** `text-display`, `text-heading-xl`, `text-body`, `text-caption`, etc.

### Spacing

Escala canónica: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64` px.  
Clases: `space-xs` → `space-5xl`. Aliases legacy para pantallas auth/onboarding.

### Radius

| Token | Valor |
|-------|-------|
| `sm` | 8px |
| `md` | 12px |
| `lg` | 16px |
| `xl` | 24px |
| `btnPrimary` | 14px |
| `circular` | 9999px |

### Iconografía

- **Lucide React** — stroke 2 por defecto
- Tamaños: `sm` (16px), `md` (18px), `lg` (22px), `xl` (28px)
- Iconos custom en `src/constants/icons.js`

### Componentes reutilizables (UI base)

Ver sección 13 para lista completa. Exportados desde `src/components/ui/index.js`.

### Animaciones

| Token | Valor |
|-------|-------|
| `fast` | 150ms |
| `normal` | 250ms |
| `slow` | 400ms |
| Easing | `cubic-bezier(0.16, 1, 0.3, 1)` |

Clase `.theme-transition` para cambios de tema fluidos.

### Responsive

- **Mobile-first** — shell principal `max-w-lg` (32rem)
- Breakpoints: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px
- Safe area insets para iOS (`env(safe-area-inset-*)`)
- Bottom navigation fija en móvil

### Dark Mode

- Activado por clase `dark` en `<html>`
- Variables CSS semánticas para light/dark
- Persistencia: Supabase (`appearance_preferences`) + `localStorage` fallback
- Anti-FOUC: script inline en `index.html`

### Elevación

4 niveles de sombra (`elevation-1` → `elevation-4`) con opacidad adaptativa al tema.

---

## 5. Tipos de Cuenta

### Modelo oficial (migración 064)

| Rol DB | UI | Tabla perfil | Ruta base |
|--------|-----|-------------|-----------|
| `personal` | Cuenta Personal | `candidate_profiles` | `/personal/*` |
| `business` | Cuenta Business | `company_profiles` | `/business/*` |
| `organization` | Cuenta de Organización | `company_profiles` | `/organization/*` |
| `admin` | Administrador | — | `/admin/*` |

> Valores legacy `candidate`, `company`, `institution` se normalizan en runtime.

### Cuenta Personal

**Para:** personas que buscan empleo.

| Capacidad | Estado |
|-----------|--------|
| Crear y editar perfil profesional completo | ✅ |
| Buscar y filtrar empleos | ✅ |
| Aplicar a ofertas con CV | ✅ |
| Guardar empleos | ✅ |
| Seguir Business/Organizaciones | ✅ |
| Feed inteligente personalizado | ✅ |
| Publicar posts | ✅ |
| Ver recomendaciones de empleo | ✅ |
| Gestionar postulaciones (retirar) | ✅ |
| Perfil público compartible | ✅ |
| Configuración, tema, notificaciones | ✅ |

**No puede:** publicar empleos, ver candidatos, acceder al panel admin.

### Cuenta Business

**Para:** negocios que publican ofertas y buscan talento.

| Capacidad | Estado |
|-----------|--------|
| Perfil de empresa completo | ✅ |
| Publicar/editar/duplicar empleos | ✅ |
| Gestionar candidatos y estados | ✅ |
| Dashboard con métricas | ✅ |
| Verificación de empresa (PDF) | ✅ |
| Feed y publicar posts | ✅ |
| Seguidores | ✅ |
| Notificaciones de nuevas postulaciones | ✅ |

**No puede:** aplicar a empleos como candidato, acceder al panel admin.

### Cuenta de Organización

**Para:** universidades, centros de formación, ONGs, instituciones públicas.

| Diferencia vs Business | Detalle |
|------------------------|---------|
| Registro | Requiere tipo de organización |
| `company_type` | `Institucion publica` o `ONG` |
| Rutas | Prefijo `/organization/*` |
| Funcionalidad | Comparte las mismas páginas employer que Business |

### Administrador

| Capacidad | Estado |
|-----------|--------|
| Dashboard con estadísticas | ✅ |
| Gestión de usuarios (activar, rol, eliminar) | ✅ |
| Moderación de empleos y posts | ✅ |
| Gestión de verificaciones | ✅ |
| Gestión de reportes | ✅ |
| Envío de notificaciones broadcast | ✅ |
| Configuración de plataforma | ✅ |

**Asignación:** solo vía RPC `promote_to_admin` o script `scripts/create-admins.mjs`. No seleccionable en registro público.

---

## 6. Funcionalidades Implementadas

### Autenticación y onboarding

| Feature | Estado | Notas |
|---------|--------|-------|
| Registro email/contraseña | ✅ | Verificación email obligatoria |
| Login email/contraseña | ✅ | |
| Google OAuth (login) | ✅ | Rechaza cuentas no registradas |
| Google OAuth (registro) | ✅ | Preserva tipo de cuenta |
| Apple OAuth | ⚠️ Parcial | Método en `auth.service.js`, sin botón UI |
| Recuperación de contraseña | ✅ | Email reset link |
| Cambio de contraseña | ✅ | Requiere contraseña actual |
| Onboarding (3 pantallas) | ✅ | |
| Setup post-registro | ✅ | Personal y Business/Organization |
| Modo invitado (preview) | ✅ | Datos demo en localStorage |
| Eliminación de cuenta | ✅ | RPC `delete_own_account` |

### Perfiles

| Feature | Estado |
|---------|--------|
| Perfil personal completo (bio, experiencia, educación, skills, idiomas, certificaciones, servicios, documentos, links) | ✅ |
| Perfil empresa (logo, cover, servicios, contacto, redes sociales) | ✅ |
| Perfil público compartible (`/profile/:userId`) | ✅ |
| Perfil empresa público (`/company/:companyId`) | ✅ |
| Completitud de perfil | ✅ |
| Calidad de perfil (scoring) | ✅ |

### Empleos

| Feature | Estado |
|---------|--------|
| Publicar empleos (Business/Organization) | ✅ |
| Editar / duplicar / cambiar estado | ✅ |
| Listado con filtros y ordenación | ✅ |
| Detalle público de empleo | ✅ |
| Aplicar con CV y respuestas | ✅ |
| Re-aplicar (postulación retirada) | ✅ |
| Empleos guardados | ✅ |
| Contador de postulaciones | ✅ |

### Social y contenido

| Feature | Estado |
|---------|--------|
| Feed inteligente personalizado | ✅ |
| Publicar posts (texto + imagen) | ✅ |
| Detalle de post | ✅ |
| Seguir Business/Organization | ✅ |
| Compartir contenido (URLs deep link) | ✅ |
| Reportar contenido/usuarios | ✅ |

### Matching y recomendaciones

| Feature | Estado |
|---------|--------|
| Motor de matching determinístico (cliente) | ✅ |
| Cache de scores (`job_matches`) | ✅ |
| Recálculo por cambio de perfil/empleo | ✅ |
| Ranking de empleos para candidato | ✅ |
| Ranking de candidatos para empleo | ✅ |
| Notificaciones de recomendación | ✅ |
| Edge Function de matching | ✅ |

### Búsqueda

| Feature | Estado |
|---------|--------|
| Búsqueda global (personas, business, organizaciones) | ✅ |
| Historial de búsqueda | ✅ |
| Búsqueda de empleos (sección Jobs) | ✅ |
| FTS en perfiles y empleos | ✅ |

### Notificaciones

| Feature | Estado |
|---------|--------|
| Bandeja in-app | ✅ |
| Push (OneSignal) | ✅ |
| Preferencias granulares por categoría | ✅ |
| Filtrado server-side antes de enviar push | ✅ |
| Marcar leídas / eliminar | ✅ |

### Configuración

| Feature | Estado |
|---------|--------|
| Pantalla de configuración unificada | ✅ |
| Cambio de contraseña | ✅ |
| Tema claro/oscuro | ✅ |
| Preferencias de notificaciones | ✅ |
| Cerrar sesión / eliminar cuenta | ✅ |
| Centro de ayuda | ✅ |
| Documentos legales (privacidad, términos) | ✅ |

### Admin

| Feature | Estado |
|---------|--------|
| Dashboard | ✅ |
| Usuarios (CRUD, roles, activar/desactivar) | ✅ |
| Empresas | ✅ |
| Verificaciones | ✅ |
| Empleos (moderar, ocultar, eliminar) | ✅ |
| Posts (moderar, ocultar, eliminar) | ✅ |
| Reportes | ✅ |
| Notificaciones broadcast | ✅ |
| Settings de plataforma | ✅ |

### PWA e infraestructura

| Feature | Estado |
|---------|--------|
| PWA instalable | ✅ |
| Service Worker (Workbox) | ✅ |
| Favicon e iconos multi-tamaño | ✅ |
| Manifest con share_target | ✅ |
| Sentry error tracking | ✅ |
| Code splitting (lazy routes + manual chunks) | ✅ |
| Security headers (Netlify) | ✅ |
| Rate limiting server-side | ✅ |
| Email de bienvenida (Edge Function) | ✅ |

---

## 7. Funcionalidades Pendientes o Parciales

### No implementadas

| Feature | Estado | Evidencia |
|---------|--------|-----------|
| Chat / mensajería | ⬜ No existe | Sin tablas, rutas ni componentes de chat |
| Premium / suscripciones / pagos | ⬜ No existe | Sin módulo de billing |
| Marketplace dedicado | ⬜ No existe | Solo mención legal como "marketplace laboral" |
| Apple Sign-In (UI) | ⬜ Parcial | Método en servicio, sin botón |
| Tests automatizados (unit/e2e) | ⬜ No existe | Sin Jest, Vitest, Cypress ni Playwright |
| Internacionalización (i18n) | ⬜ No existe | App en español hardcoded |

### Parcialmente implementadas

| Feature | Estado | Detalle |
|---------|--------|---------|
| Eventos en feed | ⚠️ Parcial | Tabla `feed_events`, card `FeedEventCard`, sin UI de gestión ni registro |
| Cursos/becas en feed | ⚠️ Parcial | Tabla `feed_courses`, card `FeedCourseCard`, sin admin UI ni API externa |
| Noticias en feed | ⚠️ Parcial | Tabla `news_articles`, card `FeedNewsCard`, sin CMS de administración |
| Recomendaciones automáticas (Edge Function) | ⚠️ Parcial | Scorer del Edge Function difiere del cliente; umbral 70 casi inalcanzable server-side |
| Fallback de feed | ⚠️ Parcial | Si falla RPC, no incluye eventos/cursos/recomendaciones |
| Fallback de búsqueda | ⚠️ Parcial | Si falla RPC, retorna vacío sin búsqueda local |

---

## 8. Base de Datos

### Tablas (36)

#### Cuentas y perfiles

| Tabla | PK | Descripción |
|-------|-----|-------------|
| `user_roles` | `user_id` | Rol: personal, business, organization, admin |
| `candidate_profiles` | `user_id` | Perfil de cuenta personal |
| `company_profiles` | `user_id` | Perfil de business/organization |
| `education` | `id` | Formación académica |
| `experience` | `id` | Experiencia laboral |
| `certifications` | `id` | Certificaciones |
| `skills` | `id` | Habilidades |
| `services` | `id` | Servicios ofrecidos (candidato) |
| `languages` | `id` | Idiomas y nivel |
| `candidate_links` | `id` | Links de portfolio |
| `company_services` | `id` | Servicios de empresa |

#### Empleo y actividad

| Tabla | PK | Descripción |
|-------|-----|-------------|
| `jobs` | `id` | Ofertas de empleo |
| `applications` | `id` | Postulaciones (unique candidate+job) |
| `saved_jobs` | `id` | Empleos guardados |
| `posts` | `id` | Publicaciones sociales |
| `notifications` | `id` | Notificaciones in-app |
| `follows` | `id` | Seguimiento business/organization |
| `reports` | `id` | Reportes de contenido |
| `verification_requests` | `id` | Solicitudes de verificación |

#### Matching, búsqueda y feed

| Tabla | PK | Descripción |
|-------|-----|-------------|
| `job_matches` | `id` | Scores candidato↔empleo cacheados |
| `job_candidate_matches` | `(job_id, candidate_id)` | Scores empleo↔candidato |
| `recommendation_analytics` | `id` | Eventos de recomendación |
| `recommendation_recalc_events` | `id` | Cola de recálculo |
| `user_search_history` | `id` | Historial de búsqueda |
| `user_search_frequent` | compuesto | Búsquedas frecuentes |
| `news_articles` | `id` | Artículos para feed |
| `feed_events` | `id` | Eventos para feed |
| `feed_courses` | `id` | Cursos para feed |
| `feed_suggestions` | `id` | Sugerencias personalizadas |

#### Configuración y operaciones

| Tabla | PK | Descripción |
|-------|-----|-------------|
| `platform_settings` | `id=1` | Config global (singleton) |
| `security_rate_events` | `id` | Eventos de rate limiting |
| `notification_preferences` | `user_id` | Preferencias push |
| `appearance_preferences` | `user_id` | Tema (light/dark) |
| `welcome_emails_sent` | `user_id` | Control de email bienvenida |
| `welcome_email_outbox` | `id` | Cola de emails |
| `welcome_email_logs` | `id` | Logs de envío |

### Enums

No hay `CREATE TYPE` en PostgreSQL. Los valores enum-like se implementan con columnas `TEXT` + `CHECK` constraints:

- `user_roles.role`: personal, business, organization, admin
- `jobs.status`: draft, active, paused, closed, hidden
- `applications.status`: pending, viewed, contacted, accepted, rejected, withdrawn
- `follows.target_type`: business, organization
- `posts.author_type`: personal, business, organization
- `reports.status`: pending, reviewed, dismissed
- `verification_requests.status`: pending, approved, rejected

### Relaciones principales

```
auth.users
  └── user_roles (1:1)
  ├── candidate_profiles (1:1, si personal)
  │     ├── education, experience, skills, languages, certifications, services, candidate_links (1:N)
  │     ├── applications (1:N)
  │     ├── saved_jobs (1:N)
  │     └── job_matches (1:N)
  └── company_profiles (1:1, si business/organization)
        ├── company_services (1:N)
        ├── jobs (1:N)
        │     ├── applications (1:N)
        │     └── job_candidate_matches (1:N)
        ├── verification_requests (1:N)
        └── posts (1:N, como author)

follows: user_id → target (business|organization)
notifications: recipient_id → user
reports: reporter_id → target (user|post|job)
```

### RLS (Row Level Security)

Habilitado en las 36 tablas. Patrones:

| Patrón | Ejemplo |
|--------|---------|
| Owner-scoped | Usuario solo lee/escribe sus propias filas (`auth.uid()`) |
| Public read (activos) | Perfiles/jobs/posts activos visibles públicamente |
| Company-scoped | Empresa accede a sus jobs, applications, candidatos |
| Admin override | `get_my_role() = 'admin'` o `require_admin()` |
| Service-role only | Colas internas (recalc, rate events, welcome email) |

### Storage Buckets (8)

| Bucket | Público | Contenido |
|--------|---------|-----------|
| `avatars` | ✅ | Avatares legacy |
| `candidate-avatars` | ✅ | Avatares de candidatos |
| `company-logos` | ✅ | Logos de empresa |
| `post-images` | ✅ | Imágenes de posts |
| `candidate-documents` | ❌ | Documentos de candidato |
| `candidate-cvs` | ❌ | CVs de postulaciones |
| `verification-documents` | ❌ | Docs verificación legacy |
| `company-verifications` | ❌ | PDFs de verificación empresa |

### RPCs principales (selección)

| RPC | Propósito |
|-----|-----------|
| `get_my_role` | Obtener rol del usuario autenticado |
| `set_initial_user_role` | Asignar rol inicial post-registro |
| `global_search` | Búsqueda global multi-entidad |
| `search_discovery` | Búsqueda de descubrimiento |
| `get_personalized_feed` | Feed inteligente unificado |
| `get_ranked_jobs_for_candidate` | Empleos ordenados por match |
| `get_ranked_candidates_for_job` | Candidatos ordenados por match |
| `upsert_job_matches` | Batch upsert de scores |
| `ensure_notification_preferences` | Crear/obtener preferencias |
| `filter_push_recipients` | Filtrar destinatarios push |
| `create_notification` | Crear notificación deduplicada |
| `submit_verification_request` | Enviar verificación empresa |
| `assert_rate_limit` | Enforce rate limiting |
| `admin_list_users` | Listar usuarios (admin) |
| `admin_set_user_role` | Cambiar rol (admin) |
| `promote_to_admin` | Promover a admin |
| `delete_own_account` | Eliminar cuenta propia |

### Triggers principales

| Trigger | Función |
|---------|---------|
| `on_auth_user_created` | Bootstrap de rol/perfil al registrarse |
| `tsvector_update_*` | Mantener FTS en perfiles, jobs, posts |
| `recommendation_*_changed` | Encolar recálculo de matching |
| `enforce_write_rate_limits` | Rate limit en writes |
| `protect_*_admin_fields` | Proteger campos de moderación |
| `prevent_dual_profile_types` | Evitar perfil candidato + empresa |
| `enforce_company_setup_before_publish` | Bloquear publicación sin setup |
| `on_company_follow_notify` | Notificar nuevo seguidor |

---

## 9. Flujo del Usuario

### Cuenta Personal

```
Splash → Onboarding → Registro (tipo: Personal)
  → Verificación email → Auth callback
  → Setup personal (nombre, ciudad, bio mínima)
  → /personal/feed (home)

Uso normal:
  Feed → Explorar empleos → Aplicar → Seguir empresas
  → Gestionar postulaciones → Editar perfil → Configuración
```

### Cuenta Business

```
Splash → Onboarding → Registro (tipo: Business)
  → Verificación email → Auth callback
  → Setup business (nombre empresa, sector)
  → /business/dashboard (home)

Uso normal:
  Dashboard → Publicar empleo → Ver candidatos
  → Gestionar estados de postulación → Editar perfil empresa
  → Solicitar verificación → Feed → Configuración
```

### Cuenta de Organización

```
Splash → Onboarding → Registro (tipo: Organización)
  → Selección tipo org (universidad, ONG, etc.)
  → Verificación email → Auth callback
  → Setup organization
  → /organization/dashboard (home)

Uso normal: idéntico a Business con rutas /organization/*
```

### Administrador

```
Login (credenciales admin) → /admin (dashboard)
  → Gestión usuarios/empresas/empleos/posts/reportes
  → Moderación y verificaciones
```

---

## 10. Sistema de Autenticación

### Proveedores

| Método | Implementado | Detalle |
|--------|-------------|---------|
| Email + contraseña | ✅ | Registro, login, verificación |
| Google OAuth | ✅ | Login y registro separados |
| Apple OAuth | ⚠️ | Solo método backend, sin UI |

### Flujo de registro

1. Usuario selecciona tipo de cuenta (Personal / Business / Organización)
2. Completa formulario (email, contraseña fuerte, ciudad, campos específicos)
3. Acepta términos
4. Supabase envía email de verificación
5. Click en link → `/auth/callback` → sesión activa
6. `set_initial_user_role` asigna rol
7. `bootstrapProfile` crea fila en `candidate_profiles` o `company_profiles`
8. Redirect a setup si `setup_complete = false`

### Flujo Google

- **Login:** si no existe cuenta TrabaGE, rechaza y elimina sesión OAuth huérfana
- **Registro:** preserva `accountKind` seleccionado antes del redirect OAuth
- Provider leído de `auth.users.app_metadata.provider`

### Restauración de sesión

```javascript
// AuthContext.jsx
supabase.auth.getSession()        // al iniciar app
supabase.auth.onAuthStateChange() // listener continuo
// Paralelo: fetch role + profile
// Timeout de seguridad: 4 segundos
```

### Verificación

- Email confirmation: **obligatoria** (`enable_confirmations = true`)
- Contraseña: mínimo 10 chars, `lower_upper_letters_digits_symbols`
- Cambio seguro de contraseña: requiere contraseña actual
- Frecuencia máxima de cambio: 60 segundos

### Gestión de roles

- Almacenados en `user_roles`
- Asignación inicial: RPC `set_initial_user_role` (excluye admin)
- Normalización legacy: `candidate`→`personal`, `company`→`business`/`organization`
- Admin: solo vía `promote_to_admin` o script

---

## 11. Sistema de Matching

### Tipo

**Determinístico basado en reglas.** No usa IA, embeddings ni ML.

### Scoring (cliente — `calculateJobMatch.js`)

| Señal | Peso |
|-------|------|
| Rol/título (equivalencias ES/EN) | 25 |
| Skills y keywords | 28 |
| Experiencia | 15 |
| Ubicación | 10 |
| Modalidad/tipo de empleo | 10 |
| Disponibilidad | 5 |
| Idiomas | 4 |
| Educación | 3 |
| Actividad reciente | 5 |
| Preferencias salario/sector | hasta 3 |
| Completitud de perfil | hasta 2 |

- **Umbral de match:** 70 (de 100, cap aplicado)
- **Equivalencias:** grupos de roles y skills en español/inglés (`matchingEquivalences.js`)
- **Señales adicionales:** empresas seguidas, postulaciones previas

### Pipeline

```
Cambio perfil/empleo
  → Trigger encola recalc (recommendation_recalc_events)
  → process_matching_recalc (Edge Function) o cliente
  → calculateJobMatch() calcula score
  → upsert_job_matches (RPC batch)
  → get_ranked_jobs_for_candidate / get_ranked_candidates_for_job
  → Notificación si score ≥ 70 (vía match_job_recommendations)
```

### Cache

- Tabla `job_matches`: scores candidato→empleo
- Tabla `job_candidate_matches`: scores empleo→candidato
- Recálculo automático por triggers en cambios de perfil/secciones

### Nota importante

El scorer de la Edge Function `match_job_recommendations` usa pesos reducidos y un máximo práctico de ~71, mientras el cliente calcula hasta 100. Esto puede causar que las notificaciones automáticas de recomendación requieran un match casi perfecto server-side.

---

## 12. Notificaciones

### Arquitectura

```
Evento en DB (trigger/service)
  → create_notification (RPC, in-app)
  → send_push (Edge Function)
      → filter_push_recipients (RPC, respeta preferencias)
      → OneSignal API
```

### OneSignal

- SDK: `react-onesignal ^3.0.1`
- Inicialización sin prompt automático
- Permiso solicitado desde panel de preferencias (acción del usuario)
- User vinculado por Supabase UUID
- Tags sincronizados con preferencias

### Permisos

| Estado | Comportamiento |
|--------|---------------|
| `default` | No se ha pedido permiso |
| `granted` | Push habilitado |
| `denied` | UI muestra mensaje, no re-pregunta |

### Tipos de notificación

| Categoría | Tipos DB | Preferencia |
|-----------|----------|-------------|
| Empleo — ofertas | `job_recommendation`, `new_job` | `employment_new_jobs` |
| Empleo — postulaciones | `application_viewed`, `application_contacted`, `application_accepted`, `application_rejected` | `employment_application_updates` |
| Empleo — nuevas (employer) | `new_application` | `employment_new_applications` |
| Empresas — seguidores | `new_follower`, `company_new_follower` | `companies_new_followers` |
| Empresas — verificación | `verification_*`, `company_verified` | `companies_verified` |
| Actividad | `new_post`, `company_update` | `activity_post_interactions` |
| Cuenta | `login`, `password_changed`, `security_alert` | `account_security` (siempre activo) |

### UI

- Bandeja: `/personal/notifications`, `/business/notifications`
- Preferencias: `/personal/settings/notifications`, `/business/settings/notifications`
- Grupos diferentes para candidato vs employer
- Guardado optimista con sync a Supabase y OneSignal tags

---

## 13. Componentes Reutilizables

### UI Base (`components/ui/`)

| Componente | Archivo | Descripción |
|------------|---------|-------------|
| Button | `Button.jsx` | Botón con variantes y tamaños |
| Input | `Input.jsx` | Campo de texto |
| Textarea | `Textarea.jsx` | Área de texto |
| Select | `Select.jsx` | Selector dropdown |
| Card | `Card.jsx` | Contenedor con padding/sombra |
| Badge | `Badge.jsx` | Etiqueta de estado |
| Chip / Tag | `Chip.jsx` | Chip seleccionable |
| Modal | `Modal.jsx` | Diálogo modal |
| BottomSheet | `BottomSheet.jsx` | Panel inferior deslizable |
| Toast / Snackbar | `Toast.jsx` | Notificación temporal |
| Spinner | `Spinner.jsx` | Indicador de carga |
| Avatar | `Avatar.jsx` | Imagen de perfil circular |
| SearchBar | `SearchBar.jsx` | Barra de búsqueda |
| EmptyState | `EmptyState.jsx` | Estado vacío con ilustración |
| FileUpload | `FileUpload.jsx` | Subida de archivos |
| AutocompleteInput | `AutocompleteInput.jsx` | Input con sugerencias |
| DynamicListInput | `DynamicListInput.jsx` | Lista dinámica de inputs |
| ErrorBoundary | `ErrorBoundary.jsx` | Captura errores de render |

### Skeletons (`components/common/Skeleton.jsx`)

`SkeletonText`, `JobCardSkeleton`, `JobListSkeleton`, `PostCardSkeleton`, `PostListSkeleton`, `NotificationItemSkeleton`, `NotificationListSkeleton`, `ApplicationCardSkeleton`, `ApplicationListSkeleton`, `ProfileCardSkeleton`, `CompanyCardSkeleton`

### Dominio

| Componente | Ubicación |
|------------|-----------|
| JobCard | `components/jobs/JobCard.jsx` |
| JobsFilterPanel | `components/jobs/JobsFilterPanel.jsx` |
| PostCard | `components/feed/PostCard.jsx` |
| PostComposer | `components/feed/PostComposer.jsx` |
| FeedItemRenderer | `components/feed/FeedItemRenderer.jsx` |
| FeedEventCard | `components/feed/FeedEventCard.jsx` |
| FeedCourseCard | `components/feed/FeedCourseCard.jsx` |
| FeedNewsCard | `components/feed/FeedNewsCard.jsx` |
| FeedRecommendationCard | `components/feed/FeedRecommendationCard.jsx` |
| NotificationItem | `components/notifications/NotificationItem.jsx` |
| NotificationsView | `components/notifications/NotificationsView.jsx` |
| CandidateCard | `components/candidate/CandidateCard.jsx` |
| ApplicantCard | `components/company/ApplicantCard.jsx` |
| FollowButton | `components/follow/FollowButton.jsx` |
| UserAvatar | `components/common/UserAvatar.jsx` |
| EmptyState | `components/common/EmptyState.jsx` |
| ReportModal | `components/common/ReportModal.jsx` |
| ContentActionMenu | `components/common/ContentActionMenu.jsx` |
| BottomNav | `components/layout/BottomNav.jsx` |
| TopBar | `components/layout/TopBar.jsx` |
| PageContainer | `components/layout/PageContainer.jsx` |
| MobileScreenLayout | `components/layout/MobileScreenLayout.jsx` |
| SettingsScreen | `components/settings/SettingsScreen.jsx` |
| AppearanceScreen | `components/settings/AppearanceScreen.jsx` |
| NotificationPreferencesPanel | `components/settings/NotificationPreferencesPanel.jsx` |
| GlobalSearch | `components/search/GlobalSearch.jsx` |
| AdminTable | `components/admin/AdminTable.jsx` |
| AdminLayout | `components/admin/AdminLayout.jsx` |

### Perfil (secciones modulares)

`ProfileHero`, `AboutSection`, `ExperienceSection`, `EducationSection`, `SkillsSection`, `LanguagesSection`, `CertificationsSection`, `ServicesSection`, `DocumentsSection`, `ContactSection`, `PortfolioLinksSection`, `EmploymentPreferencesSection`

Modals: `BasicInfoModal`, `ExperienceModal`, `EducationModal`, `LanguageModal`, `CertificationModal`, `DeleteAccountModal`

---

## 14. Servicios

| Servicio | Archivo | Responsabilidad |
|----------|---------|-----------------|
| `authService` | `auth.service.js` | Login, registro, OAuth, password, logout, delete account |
| `authFlow` | `authFlow.js` | Orquestación post-auth (redirect, setup) |
| `profileService` | `profile.service.js` | CRUD perfiles candidato |
| `profileBootstrap` | `profileBootstrap.js` | Inicialización de perfil al registrarse |
| `companyService` | `company.service.js` | CRUD perfiles empresa |
| `jobsService` | `jobs.service.js` | CRUD empleos, guardados, estados |
| `applicationsService` | `applications.service.js` | Postulaciones, reapply, estados |
| `postsService` | `posts.service.js` | Posts, feed paginado |
| `feedService` | `feed.service.js` | Feed inteligente, ranking, fallback |
| `followsService` | `follows.service.js` | Follow/unfollow, listas |
| `notificationsService` | `notifications.service.js` | CRUD notificaciones, push |
| `notificationPreferencesService` | `notificationPreferences.service.js` | Preferencias push |
| `appearanceService` | `appearance.service.js` | Tema light/dark |
| `searchService` | `search.service.js` | Búsqueda global RPC |
| `jobMatchesService` | `jobMatches.service.js` | Scores, recálculo, ranking |
| `jobRecommendationsService` | `jobRecommendations.service.js` | Recomendaciones vía Edge Function |
| `matchingRecalcService` | `matchingRecalc.service.js` | Disparar recálculo |
| `storageService` | `storage.service.js` | Upload/download Supabase Storage |
| `verificationService` | `verification.service.js` | Verificación de empresa |
| `reportsService` | `reports.service.js` | Reportar contenido |
| `adminService` | `admin.service.js` | Operaciones del panel admin |
| `analyticsService` | `analytics.service.js` | Tracking de eventos |

---

## 15. Dependencias

### Producción

| Paquete | Versión | Uso |
|---------|---------|-----|
| `react` | ^19.1.0 | Framework UI |
| `react-dom` | ^19.1.0 | DOM rendering |
| `react-router-dom` | ^6.30.1 | Routing SPA |
| `@supabase/supabase-js` | ^2.50.0 | Cliente Supabase |
| `lucide-react` | ^1.18.0 | Iconos |
| `react-onesignal` | ^3.0.1 | Push notifications |
| `@sentry/react` | ^9.30.0 | Error tracking |

### Desarrollo

| Paquete | Versión | Uso |
|---------|---------|-----|
| `vite` | ^6.3.5 | Build tool |
| `@vitejs/plugin-react` | ^4.5.2 | Plugin React para Vite |
| `tailwindcss` | ^3.4.17 | CSS framework |
| `autoprefixer` | ^10.4.21 | CSS prefixes |
| `postcss` | ^8.5.6 | CSS processing |
| `vite-plugin-pwa` | ^0.21.2 | PWA generation |
| `eslint` | ^9.29.0 | Linting |
| `sharp` | ^0.34.5 | Generación de iconos PWA |

---

## 16. Configuración

### Variables de entorno (frontend)

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `VITE_SUPABASE_URL` | ✅ | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Clave anon/public |
| `VITE_SUPABASE_PROJECT_REF` | Opcional | Referencia del proyecto |
| `VITE_ONESIGNAL_APP_ID` | ✅ | App ID de OneSignal |
| `VITE_ONESIGNAL_SAFARI_WEB_ID` | Opcional | Safari Web Push ID |
| `VITE_SENTRY_DSN` | Opcional | DSN de Sentry |
| `VITE_APP_URL` | ✅ | URL base de la app |
| `VITE_APP_ENV` | Opcional | Entorno (development/production) |

### Secrets (Edge Functions — server-side)

| Secret | Función |
|--------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Acceso admin a DB |
| `ONESIGNAL_APP_ID` | Push |
| `ONESIGNAL_REST_API_KEY` | Push API |
| `TRABAGE_ALLOWED_ORIGIN` | CORS |
| `SMTP_*` | Email de bienvenida |
| `WELCOME_WEBHOOK_SECRET` | Webhook email |

### URLs

| Entorno | URL |
|---------|-----|
| Producción | `https://trabage.org` |
| Desarrollo | `http://localhost:5173` |
| Supabase callback | `https://<ref>.supabase.co/auth/v1/callback` |
| OAuth redirect | `/auth/callback` |

### Supabase Auth config

| Setting | Valor |
|---------|-------|
| `site_url` | `https://trabage.org` |
| `minimum_password_length` | 10 |
| `password_requirements` | `lower_upper_letters_digits_symbols` |
| `enable_confirmations` | true |
| Google OAuth | enabled |

### Scripts npm

| Script | Comando |
|--------|---------|
| `dev` | `vite` (puerto 5173) |
| `build` | `vite build` |
| `preview` | `vite preview` |
| `lint` | `eslint .` |
| `create-admins` | Crear usuarios admin |
| `verify-admins` | Verificar admins |
| `generate-icons` | Generar iconos PWA |

---

## 17. Estado del Proyecto

### Completamente terminado

- Autenticación (email + Google) con roles y verificación
- Tres tipos de cuenta + admin con rutas y permisos
- Perfiles completos (personal y empresa)
- CRUD de empleos, postulaciones, guardados
- Feed inteligente con ranking y paginación
- Motor de matching determinístico con cache
- Búsqueda global FTS
- Notificaciones in-app + push con preferencias
- Panel de administración completo
- Configuración (password, tema, notificaciones, logout, delete)
- PWA con iconos y manifest
- Seguridad: RLS, rate limits, upload validation, CSP, CORS
- Dark mode con persistencia
- Documentos legales y centro de ayuda
- Code splitting y lazy loading

### Necesita revisión

| Área | Detalle |
|------|---------|
| Migraciones remotas | Confirmar que las 64 migraciones están aplicadas en Supabase producción |
| Edge Functions | Verificar deploy de las 4 funciones con secrets correctos |
| Scorer server vs cliente | Inconsistencia de pesos en `match_job_recommendations` |
| Lint | 2 warnings menores (`no-unused-vars`) |
| Assets pesados | Imágenes empty-state ~1 MB cada una |
| Commits | Mensajes crípticos en historial reciente |

### Falta implementar

- Chat / mensajería
- Premium / pagos / suscripciones
- Tests automatizados
- i18n
- Apple Sign-In (UI)
- CMS admin para news/events/courses
- Gestión de eventos (registro, detalle)
- Marketplace dedicado

### Podría mejorarse

- Optimizar imágenes de empty states
- Unificar scorer cliente/servidor
- Añadir fallback local para búsqueda y feed
- Añadir tests e2e para flujos críticos
- Mejorar mensajes de commit
- Documentar API de RPCs en OpenAPI/Swagger

---

## 18. Recomendaciones (Tech Lead)

### Arquitectura

- Considerar extraer lógica de matching a un módulo compartido entre cliente y Edge Function
- Evaluar React Query / TanStack Query para cache y estado de servidor
- Separar `pages/candidate/` y `pages/company/` en `pages/personal/` y `pages/employer/` para alinear con el modelo de rutas

### Rendimiento

- Comprimir imágenes de empty states (ahorro ~3-4 MB en bundle)
- Implementar virtualización en listas largas (empleos, feed)
- Precargar rutas críticas post-login
- Revisar bundle `telemetry` (271 KB gzip 88 KB — Sentry + OneSignal)

### Seguridad

- Verificar que migración 064 está aplicada en producción
- Rotar secrets periódicamente
- Añadir monitoring de rate limit events
- Considerar CAPTCHA en registro si hay abuso

### UX

- Completar UI de eventos y cursos o remover cards del feed hasta tener contenido
- Mejorar feedback de errores en formularios largos (perfil)
- Añadir skeleton loaders consistentes en todas las páginas
- Implementar infinite scroll en más listas (aplicaciones, notificaciones)

### Código

- Resolver 2 warnings de ESLint
- Añadir Vitest para utils y servicios críticos (matching, validación)
- Estandarizar mensajes de error en español
- Documentar RPCs con comentarios SQL consistentes

### Refactorizaciones sugeridas

| Prioridad | Refactor | Impacto |
|-----------|----------|---------|
| Alta | Unificar scorer matching | Notificaciones de recomendación correctas |
| Media | Renombrar `pages/candidate/` → `pages/personal/` | Consistencia con modelo de cuentas |
| Media | Extraer constantes de rutas a un solo archivo | Mantenibilidad |
| Baja | Migrar `company_profiles` → `employer_profiles` | Claridad semántica (requiere migración DB) |

---

## Diagrama de arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React SPA)                  │
│  ┌─────────┐  ┌──────────┐  ┌─────────────────────┐  │
│  │  Pages  │  │Components│  │  Hooks + Context      │  │
│  └────┬────┘  └────┬─────┘  └──────────┬──────────┘  │
│       └─────────────┼───────────────────┘              │
│                     ▼                                    │
│              ┌─────────────┐                             │
│              │  Services   │                             │
│              └──────┬──────┘                             │
└─────────────────────┼───────────────────────────────────┘
                      │ Supabase Client SDK
                      ▼
┌─────────────────────────────────────────────────────────┐
│                      SUPABASE                            │
│  ┌──────┐  ┌─────────┐  ┌─────────┐  ┌─────────────┐ │
│  │ Auth │  │PostgreSQL│  │ Storage │  │Edge Functions│ │
│  │      │  │ + RLS   │  │ (8 buckets)│  │ (4 funcs)  │ │
│  └──────┘  │ + RPCs  │  └─────────┘  └──────┬──────┘ │
│             │ + Triggers│                      │        │
│             └─────────┘                        │        │
└────────────────────────────────────────────────┼────────┘
                                                 │
                      ┌──────────────────────────┼────────┐
                      ▼                          ▼        ▼
                 ┌──────────┐            ┌──────────┐ ┌───────┐
                 │ OneSignal│            │  Sentry  │ │SMTP   │
                 │  (Push)  │            │ (Errors) │ │(Email)│
                 └──────────┘            └──────────┘ └───────┘
```

---

## Diagrama de flujo de cuenta

```
                    ┌──────────────┐
                    │  Registro    │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────────┐
        │ Personal │ │ Business │ │ Organization │
        └────┬─────┘ └────┬─────┘ └──────┬───────┘
             │             │               │
             ▼             ▼               ▼
      candidate_     company_         company_
      profiles       profiles         profiles
             │             │               │
             ▼             └───────┬───────┘
        /personal/*         /business/*  /organization/*
             │                     │           │
             ▼                     ▼           ▼
        Empleos              Dashboard    Dashboard
        Aplicar              Publicar     Publicar
        Feed                 Candidatos   Candidatos
```

---

*Documento generado a partir del análisis del código fuente de TrabaGE v0.1.0.  
Para actualizar: re-ejecutar análisis sobre `src/`, `supabase/migrations/` y `package.json`.*
