export default function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json');
  const key=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY||'';
  res.status(200).json({supabaseUrl:'https://tyscbvqiqtfhiscqqrbz.supabase.co',supabasePublishableKey:key});
}
