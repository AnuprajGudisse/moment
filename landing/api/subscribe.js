// Vercel Serverless Function: Subscribe waitlist
// Expects env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE

module.exports = async (req, res) => {
  // Basic CORS for cross-origin previews (adjust if needed)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      return res.status(500).json({ error: 'Server not configured' });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    const email = (body?.email || '').trim();
    const source = (body?.source || 'landing').trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isEmail) return res.status(400).json({ error: 'Invalid email' });

    const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/waitlist?on_conflict=email`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`,
        'Prefer': 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({ email, source }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(502).json({ error: 'Upstream insert failed', detail: text });
    }

    const data = await resp.json();
    return res.status(200).json({ ok: true, data });
  } catch (e) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
};

