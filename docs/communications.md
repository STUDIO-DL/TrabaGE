# Centro de Comunicaciones TrabaGE

Canal oficial entre TrabaGE y los usuarios. Gestión íntegra desde el Panel de Administración (`/admin/communications`).

## Arquitectura

```
src/features/communications/
  domain/          # Constantes, labels, mappers de formulario
  data/            # communications.service (RPCs Supabase)
  admin/           # Formularios y estadísticas del panel
  ui/              # Superficies de usuario (modal, tarjeta, sheet)
  index.js         # API pública del módulo
```

Capas:

| Capa | Responsabilidad |
|------|-----------------|
| Domain | Tipos, audiencias, comportamientos, payload mappers |
| Data | Persistencia vía RPCs SECURITY DEFINER |
| Application UI | Admin list/form/stats; host global de usuario |
| Presentation | Reutiliza `Modal`, `BottomSheet`, `AdminTable`, FCM push |

## Base de datos

Migración: `supabase/migrations/124_communications_campaigns.sql`

| Tabla | Contenido |
|-------|-----------|
| `communication_campaigns` | Definición de campaña |
| `communication_user_states` | Estado por usuario (sin duplicar el payload) |
| `communication_responses` | Ratings / comentarios |
| `communication_events` | Historial append-only |

### Estados de usuario

`not_shown` → `shown` → `opened` → `responded` | `dismissed` | `expired`

### Superficies

- **Feedback / Encuesta**: tarjeta flotante inferior → bottom sheet (~65%).
- **Resto**: modal elegante; si `allow_dismiss = false`, el usuario debe usar el CTA principal (legal).

## Aplicar migración

```powershell
supabase db push
```

## Audiencias inteligentes

`audience.rules[]` + `audience.rule_logic` (`and` | `or`) se evalúan en SQL con
`communication_user_matches_audience` (usa `get_profile_completion` y tablas de
actividad). Migración: `125_smart_communication_audiences.sql`.

Ejemplo:

```json
{
  "roles": ["personal"],
  "rule_logic": "and",
  "rules": [
    { "id": "profile_pct_lt", "value": 50 },
    { "id": "registered_days_gte", "days": 7 }
  ]
}
```

## Automatización

`automation: { enabled, min_interval_days }` + cron `process_communication_automations`
(cada 6 h si `pg_cron` está disponible). No reenvía antes del intervalo (por defecto 15 días)
ni a usuarios ya convertidos.

## Conversión

- `conversion_goal`: `profile_complete` | `cta_click`
- Estados: `cta_clicked_at`, `converted_at`
- Stats: mostrados, abiertos, CTA, convertidos, tasas

Plantilla admin: **Completar perfil (inteligente)** → CTA `/personal/profile/edit-intro`.

## Extender

1. Añadir un `campaign_type` en el CHECK SQL + `CAMPAIGN_TYPE_OPTIONS`.
2. Añadir un `SEGMENT_RULE_OPTIONS` id + rama en `communication_user_matches_rule`.
3. Push: flag `send_push` reutiliza `adminService.sendAdminPushBroadcast` / edge `send_push`.
