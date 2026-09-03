/* Havenly Supabase bootstrap.
   The publishable key is safe for browser use and is also supplied by /api/config at runtime.
   Never put a Supabase service_role key in this file or in client-side code. */
window.HAVENLY_SUPABASE_URL='https://tyscbvqiqtfhiscqqrbz.supabase.co';
window.HAVENLY_SUPABASE_PUBLISHABLE_KEY=window.HAVENLY_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_Xb0tXC0ox8RrnR1AHD-geQ_TRPW4hOD';
window.HAVENLY_SUPABASE_CONFIGURED=false;

window.havenlySupabaseReady=(async()=>{
  try{
    if(!window.HAVENLY_SUPABASE_PUBLISHABLE_KEY){
      const response=await fetch('/api/config',{headers:{Accept:'application/json'},cache:'no-store'});
      if(response.ok){
        const config=await response.json();
        if(config.supabaseUrl) window.HAVENLY_SUPABASE_URL=config.supabaseUrl;
        if(config.supabasePublishableKey) window.HAVENLY_SUPABASE_PUBLISHABLE_KEY=config.supabasePublishableKey;
      }
    }else{
      // Still allow the runtime endpoint to override the public key when configured.
      try{
        const response=await fetch('/api/config',{headers:{Accept:'application/json'},cache:'no-store'});
        if(response.ok){
          const config=await response.json();
          if(config.supabaseUrl) window.HAVENLY_SUPABASE_URL=config.supabaseUrl;
          if(config.supabasePublishableKey) window.HAVENLY_SUPABASE_PUBLISHABLE_KEY=config.supabasePublishableKey;
        }
      }catch(_error){}
    }
    if(!window.HAVENLY_SUPABASE_PUBLISHABLE_KEY) return null;
    window.HAVENLY_SUPABASE_CONFIGURED=true;
    if(!window.supabase){
      await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
    }
    return window.supabase.createClient(window.HAVENLY_SUPABASE_URL,window.HAVENLY_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  }catch(error){
    console.warn('Havenly Supabase configuration is unavailable.',error);
    return null;
  }
})();