const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const HMLR_ATTRIBUTION = 'Contains HM Land Registry data © Crown copyright and database right. This data is licensed under the Open Government Licence v3.0.';
const UPRN_ATTRIBUTION = 'UPRNs contain OS data © Crown copyright and database rights. This data is licensed under the Open Government Licence v3.0.';

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function normaliseUuid(value) {
  const s = String(value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s) ? s : null;
}

function normaliseUprn(value) {
  const s = String(value || '').trim();
  return /^\d{1,12}$/.test(s) ? s : null;
}

function supabase(path, options = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json(res, 503, { error: 'HMLR property matching is not configured on the server.' });
  }

  const query = req.query || {};
  const propertyId = normaliseUuid(query.property_id || query.propertyId || query.id);
  const requestedUprn = normaliseUprn(query.uprn);

  if (!propertyId && !requestedUprn) {
    return json(res, 400, { error: 'Provide a valid property_id or UPRN.' });
  }

  try {
    let property = null;
    let uprn = requestedUprn;

    if (propertyId) {
      const propertyResponse = await supabase(`properties?id=eq.${encodeURIComponent(propertyId)}&select=id,uprn,inspire_id,address_line_1,address_line_2,town_city,county,postcode,identity_status,identity_confidence,identity_match_method,identity_matched_at`);
      if (!propertyResponse.ok) {
        return json(res, 502, { error: 'Unable to load property identity data.' });
      }
      const rows = await propertyResponse.json();
      property = rows[0] || null;
      if (!property) return json(res, 404, { error: 'Property not found.' });
      uprn = uprn || normaliseUprn(property.uprn);
    }

    if (!uprn) {
      return json(res, 200, {
        property_id: property?.id || null,
        uprn: null,
        matched: false,
        method: 'uprn_required',
        transaction_ids: [],
        transactions: [],
        message: 'No valid UPRN is stored for this property. UPRN matching cannot be asserted.',
        attribution: [HMLR_ATTRIBUTION, UPRN_ATTRIBUTION]
      });
    }

    const lookupResponse = await supabase(`hmlr_uprn_lookup?uprn=eq.${encodeURIComponent(uprn)}&select=transaction_id,uprn,published_month&order=published_month.desc`);
    if (!lookupResponse.ok) {
      const detail = await lookupResponse.text();
      return json(res, 502, { error: 'Unable to query the HMLR UPRN lookup table.', detail: detail.slice(0, 500) });
    }

    const lookupRows = await lookupResponse.json();
    const transactionIds = [...new Set(lookupRows.map(row => row.transaction_id).filter(Boolean))];
    let transactions = [];

    if (transactionIds.length) {
      const inList = transactionIds.map(id => `"${id}"`).join(',');
      const txResponse = await supabase(`hmlr_price_paid_transactions?transaction_id=in.(${encodeURIComponent(inList)})&select=transaction_id,price,transaction_date,postcode,paon,saon,street,locality,town_city,district,county,property_type,tenure,new_build,category,record_status&order=transaction_date.desc`);
      if (txResponse.ok) transactions = await txResponse.json();
    }

    const matched = transactionIds.length > 0;
    const method = matched ? 'uprn_transaction_id' : 'uprn_no_published_transaction';
    const confidence = matched ? 100 : 0;

    return json(res, 200, {
      property_id: property?.id || null,
      uprn,
      matched,
      method,
      confidence,
      lookup_rows: lookupRows,
      transaction_ids: transactionIds,
      transactions,
      source: 'HM Land Registry Transaction unique identifier and UPRN Look Up Table',
      attribution: [HMLR_ATTRIBUTION, UPRN_ATTRIBUTION],
      note: 'A deterministic UPRN → transaction-ID relationship is treated as a match. No match is asserted when the lookup dataset contains no relationship.'
    });
  } catch (error) {
    return json(res, 500, { error: 'Unexpected HMLR property matching error.' });
  }
};
