export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const query = String(req.body?.query || '').trim();
  if (!query) return res.status(400).json({ error: 'Please enter a property search.' });
  const supabaseUrl = process.env.SUPABASE_URL || 'https://tyscbvqiqtfhiscqqrbz.supabase.co';
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!key) return res.status(500).json({ error: 'Supabase is not configured on the server.' });
  const token = req.headers.authorization || `Bearer ${key}`;
  const response = await fetch(`${supabaseUrl}/functions/v1/ask-havenly`, {
    method: 'POST',
    headers: { Authorization: token, apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const data = await response.json();
  return res.status(response.status).json(data);
}
