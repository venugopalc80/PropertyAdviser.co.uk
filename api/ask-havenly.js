export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const rawQuery = req.body?.query;
  if (typeof rawQuery !== 'string') return res.status(400).json({ error: 'Please enter a property search.' });
  const query = rawQuery.trim();
  if (!query) return res.status(400).json({ error: 'Please enter a property search.' });
  if (query.length > 500) return res.status(413).json({ error: 'Please keep your search under 500 characters.' });

  const supabaseUrl = process.env.SUPABASE_URL || 'https://tyscbvqiqtfhiscqqrbz.supabase.co';
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!key) return res.status(500).json({ error: 'Supabase is not configured on the server.' });

  const token = req.headers.authorization || `Bearer ${key}`;
  const requestedK = Number(req.body?.k);
  const k = Number.isFinite(requestedK) ? Math.max(1, Math.min(Math.floor(requestedK), 8)) : 6;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/ask-havenly`, {
      method: 'POST',
      headers: { Authorization: token, apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, k })
    });
    const data = await response.json().catch(() => ({ error: 'Invalid response from property search.' }));
    return res.status(response.status).json(data);
  } catch {
    return res.status(502).json({ error: 'Property search is temporarily unavailable.' });
  }
}
