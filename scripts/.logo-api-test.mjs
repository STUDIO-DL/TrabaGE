import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const root = 'C:/Users/user/Desktop/TrabaGE/TrabaGE';
const env = fs.readFileSync(path.join(root,'.env.local'),'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.+)/m)[1].trim();
const anon = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/m)[1].trim();
const service = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/m)[1].trim();
const admin = createClient(url, service, { auth: { persistSession: false }});

async function testRole(role, companyName) {
  const email = `qa-logo-${role}-${Date.now()}@trabage-qa.test`;
  const password = 'TestPass1!';
  const meta = role === 'organization'
    ? { role:'organization', account_kind:'organization', company_name: companyName, company_type:'Institucion publica', city:'Malabo' }
    : { role:'business', account_kind:'business', company_name: companyName, sector:'Tecnologia', city:'Malabo' };
  const { data: created, error: ce } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: meta });
  if (ce) return { role, fail: 'createUser: '+ce.message };
  const uid = created.user.id;
  await new Promise(r=>setTimeout(r,1500));
  const sb = createClient(url, anon, { auth: { persistSession: false }});
  await sb.auth.signInWithPassword({ email, password });
  await sb.rpc('provision_user_profile', { p_user_id: uid, p_overrides: { company_name: companyName } });
  const buf = await sharp({ create:{ width:8, height:8, channels:3, background:{ r:10,g:10,b:10}}}).webp().toBuffer();
  const filePath = `logos/${uid}/logo.webp`;
  const up = await sb.storage.from('company-assets').upload(filePath, buf, { upsert: true, contentType:'image/webp' });
  const prof = await sb.from('company_profiles').update({ logo_path: filePath }).eq('user_id', uid).select('logo_path').maybeSingle();
  await admin.auth.admin.deleteUser(uid);
  return { role, uploadError: up.error?.message || null, profileError: prof.error?.message || null, logo_path: prof.data?.logo_path || null };
}

const results = [];
for (const [role, name] of [['organization','ZARREL'], ['business','ZARREL Business QA']]) {
  results.push(await testRole(role, name));
}
console.log(JSON.stringify(results, null, 2));
