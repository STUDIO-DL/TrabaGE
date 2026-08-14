import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function loadEnv() {
  const envPath = path.join(root, '.env.local');
  if (!fs.existsSync(envPath)) throw new Error('No .env.local found');
  const env = fs.readFileSync(envPath, 'utf8');
  return {
    url: env.match(/^\s*VITE_SUPABASE_URL\s*=\s*(.+)\s*$/m)?.[1]?.trim(),
    anonKey: env.match(/^\s*VITE_SUPABASE_ANON_KEY\s*=\s*(.+)\s*$/m)?.[1]?.trim(),
  };
}

function uniqueEmail() {
  return `qa-avatar-${Date.now().toString(36)}@trabage-qa.test`;
}

async function ensureTinyImage(outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const pngPath = path.join(outDir, 'tiny-avatar.png');
  await sharp({ create: { width: 32, height: 32, channels: 3, background: { r: 120, g: 150, b: 200 } } })
    .png()
    .toFile(pngPath);
  return pngPath;
}

async function main() {
  const env = loadEnv();
  if (!env.url || !env.anonKey) throw new Error('Missing Supabase URL/ANON key in .env.local');

  const email = uniqueEmail();
  const password = 'TestPass1!';

  console.log('Using supabase:', env.url);
  const sb = createClient(env.url, env.anonKey, { auth: { persistSession: false } });

  console.log('Signing up user:', email);
  const { data: signupData, error: signupErr } = await sb.auth.signUp({ email, password });
  if (signupErr) {
    console.error('signUp failed:', signupErr.message);
    process.exit(1);
  }

  // Try to sign in (may fail if email confirmation required)
  console.log('Signing in...');
  const { data: signInData, error: signInErr } = await sb.auth.signInWithPassword({ email, password });
  if (signInErr) {
    console.error('signIn failed:', signInErr.message);
    console.error('If email confirmation is required the automated test cannot continue without service role.');
    process.exit(2);
  }

  const session = signInData.session;
  const userId = session.user.id;
  console.log('Signed in user id:', userId);

  // Create a client with session
  const authed = createClient(env.url, env.anonKey, { auth: { persistSession: false } });
  await authed.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
  });

  const outDir = path.join(root, 'tmp-avatar');
  const filePath = await ensureTinyImage(outDir);
  console.log('Generated avatar at', filePath);

  const bucket = 'candidate-avatars';
  const storagePath = `${userId}/avatar.png`;
  const file = fs.createReadStream(filePath);

  console.log('Uploading to storage...', bucket, storagePath);
  const { data: upRes, error: upErr } = await authed.storage.from(bucket).upload(storagePath, file, { upsert: true, contentType: 'image/png' });
  if (upErr) {
    console.error('storage upload error:', upErr.message || JSON.stringify(upErr));
    process.exit(3);
  }
  console.log('Upload result:', upRes);

  // Set avatar_path in candidate_profiles via upsert
  const avatarPath = `public/${bucket}/${storagePath}`; // adjust per app expectations
  console.log('Upserting candidate_profiles avatar_path ->', avatarPath);
  const { data: upsertData, error: upsertErr } = await authed
    .from('candidate_profiles')
    .upsert({ user_id: userId, avatar_path: avatarPath }, { onConflict: 'user_id' })
    .select('user_id,avatar_path')
    .maybeSingle();

  if (upsertErr) {
    console.error('upsert error:', upsertErr.message || JSON.stringify(upsertErr));
    process.exit(4);
  }

  console.log('Upsert succeeded:', upsertData);
  console.log('✅ Avatar upload + profile upsert test completed');
}

main().catch((err) => {
  console.error('❌', err.message || err);
  process.exit(1);
});
