/* Havenly Supabase bootstrap. Replace the placeholder public key during configuration.
   Never put a Supabase service_role key in this file or in client-side code. */
window.HAVENLY_SUPABASE_URL='https://tyscbvqiqtfhiscqqrbz.supabase.co';
window.HAVENLY_SUPABASE_PUBLISHABLE_KEY=window.HAVENLY_SUPABASE_PUBLISHABLE_KEY||'YOUR_SUPABASE_PUBLISHABLE_KEY';
window.HAVENLY_SUPABASE_CONFIGURED=window.HAVENLY_SUPABASE_PUBLISHABLE_KEY!=='YOUR_SUPABASE_PUBLISHABLE_KEY';

window.havenlySupabaseReady=(async()=>{
  if(!window.HAVENLY_SUPABASE_CONFIGURED) return null;
  if(!window.supabase){
    await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
  }
  return window.supabase.createClient(window.HAVENLY_SUPABASE_URL,window.HAVENLY_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
})();
