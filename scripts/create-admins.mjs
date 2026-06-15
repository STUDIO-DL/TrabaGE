/**
 * Crea cuentas admin en Supabase (email confirmado + rol admin).
 *
 * Uso:
 *   1. cp scripts/admins.local.example.json scripts/admins.local.json
 *   2. Edita scripts/admins.local.json con vuestros 3 emails/contraseñas
 *   3. Obtén la service_role key: Supabase Dashboard → Settings → API
 *   4. En PowerShell:
 *        $env:SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"
 *        npm run create-admins
 *
 * NO subas admins.local.json ni la service_role key al repo.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const adminsPath = path.join(__dirname, 'admins.local.json');
const envPath = path.join(root, '.env.local');

function readSupabaseUrl() {
  if (!fs.existsSync(envPath)) {
    throw new Error('No se encontró .env.local. Crea uno con VITE_SUPABASE_URL.');
  }

  const env = fs.readFileSync(envPath, 'utf8');
  const url = env.match(/^\s*VITE_SUPABASE_URL\s*=\s*(.+)\s*$/m)?.[1]?.trim();
  if (!url) {
    throw new Error('VITE_SUPABASE_URL no está definida en .env.local');
  }
  return url;
}

function readAdmins() {
  if (!fs.existsSync(adminsPath)) {
    throw new Error(
      'No se encontró scripts/admins.local.json.\n' +
        'Copia scripts/admins.local.example.json → scripts/admins.local.json y edítalo.',
    );
  }

  const admins = JSON.parse(fs.readFileSync(adminsPath, 'utf8'));
  if (!Array.isArray(admins) || admins.length === 0) {
    throw new Error('scripts/admins.local.json debe ser un array con al menos un admin.');
  }

  for (const entry of admins) {
    if (!entry?.email?.trim() || !entry?.password) {
      throw new Error('Cada entrada necesita "email" y "password".');
    }
  }

  return admins;
}

async function findUserByEmail(supabase, email) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;

    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function getUserRole(supabase, userId) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo leer el rol del usuario ${userId}: ${error.message}`);
  }

  return data?.role ?? null;
}

async function ensureAdminRole(supabase, userId, email) {
  const currentRole = await getUserRole(supabase, userId);
  if (currentRole === 'admin') return;

  const { error } = await supabase.rpc('promote_to_admin', {
    target_user_id: userId,
  });

  if (error) {
    throw new Error(`No se pudo asignar rol admin a ${email}: ${error.message}`);
  }

  const verifiedRole = await getUserRole(supabase, userId);
  if (verifiedRole !== 'admin') {
    throw new Error(`El usuario ${email} no quedó con rol admin tras la promoción.`);
  }
}

async function setUserPassword(supabase, userId, email, password) {
  const { error } = await supabase.auth.admin.updateUserById(userId, { password });

  if (error) {
    throw new Error(`No se pudo actualizar la contraseña de ${email}: ${error.message}`);
  }
}

async function createOrPromoteAdmin(supabase, { email, password }) {
  const normalizedEmail = email.trim();
  let userId;
  let status = 'created';

  const { data, error } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: { role: 'admin' },
  });

  if (!error) {
    userId = data.user.id;
  } else {
    const duplicate =
      error.message?.toLowerCase().includes('already') ||
      error.message?.toLowerCase().includes('registered') ||
      error.status === 422;

    if (!duplicate) {
      throw new Error(`Error creando ${normalizedEmail}: ${error.message}`);
    }

    const existing = await findUserByEmail(supabase, normalizedEmail);
    if (!existing) {
      throw new Error(`El usuario ${normalizedEmail} parece existir pero no se pudo localizar.`);
    }

    userId = existing.id;
    status = 'promoted';
  }

  await ensureAdminRole(supabase, userId, normalizedEmail);
  await setUserPassword(supabase, userId, normalizedEmail, password);

  return { email: normalizedEmail, status, userId };
}

async function main() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) {
    console.error('❌ Falta SUPABASE_SERVICE_ROLE_KEY en el entorno.');
    console.error('   Supabase Dashboard → Project Settings → API → service_role');
    console.error('   PowerShell: $env:SUPABASE_SERVICE_ROLE_KEY="..."');
    process.exit(1);
  }

  const url = readSupabaseUrl();
  const admins = readAdmins();

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`\n🔐 TrabaGE — crear ${admins.length} admin(s) en ${url}\n`);

  const results = [];

  for (const admin of admins) {
    const result = await createOrPromoteAdmin(supabase, admin);
    results.push(result);
    const label =
      result.status === 'created' ? 'creado' : 'actualizado (admin + contraseña)';
    console.log(`✅ ${result.email} — ${label}`);
  }

  console.log('\n✨ Listo. Podéis iniciar sesión en /login y entraréis en /admin\n');
  return results;
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}\n`);
  process.exit(1);
});
