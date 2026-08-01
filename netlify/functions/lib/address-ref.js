/**
 * Optional IL address reference via Supabase RPC.
 * Fail-open: any miss/error returns original payload unchanged.
 */

function flagEnabled(value) {
  return String(value || "").toLowerCase() === "true";
}

function parseHouseNumber(house) {
  if (house == null || house === "") return null;
  const match = String(house).match(/\d+/);
  if (!match) return null;
  const n = Number.parseInt(match[0], 10);
  return Number.isFinite(n) ? n : null;
}

function trimStr(v) {
  return String(v || "").trim();
}

/**
 * @param {object} payload
 * @param {object} [env]
 * @returns {Promise<{ payload: object, meta: object }>}
 */
async function enrichAddressPayload(payload, env = process.env) {
  const input = {
    street: trimStr(payload?.street),
    house: trimStr(payload?.house),
    city: trimStr(payload?.city),
    zip: trimStr(payload?.zip),
  };

  const meta = {
    enabled: false,
    hit: false,
    applied: false,
    reason: "disabled",
    source_zip: input.zip,
    ref_zip: null,
    ref_city: null,
    ref_street: null,
  };

  if (!flagEnabled(env.ADDRESS_REF_ENABLED)) {
    return { payload: { ...payload, ...input }, meta };
  }

  meta.enabled = true;

  const supabaseUrl = trimStr(env.SUPABASE_URL).replace(/\/$/, "");
  const serviceKey = trimStr(env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseUrl || !serviceKey) {
    meta.reason = "missing_supabase_env";
    return { payload: { ...payload, ...input }, meta };
  }

  if (!input.city || !input.street) {
    meta.reason = "missing_city_or_street";
    return { payload: { ...payload, ...input }, meta };
  }

  const house = parseHouseNumber(input.house);

  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/lookup_postal_code`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_city: input.city,
        p_street: input.street,
        p_house: house,
      }),
    });

    if (!resp.ok) {
      meta.reason = `supabase_http_${resp.status}`;
      return { payload: { ...payload, ...input }, meta };
    }

    const rows = await resp.json();
    const row = Array.isArray(rows) ? rows[0] : null;

    if (!row || !row.postal_code) {
      meta.reason = "no_match";
      return { payload: { ...payload, ...input }, meta };
    }

    meta.hit = true;
    meta.ref_zip = String(row.postal_code).trim();
    meta.ref_city = row.city_he || null;
    meta.ref_street = row.street_he || null;

    const enriched = { ...payload, ...input };
    const applyNames = flagEnabled(env.ADDRESS_REF_APPLY_NAMES);

    // Always prefer reference zip when we have a hit (main reason for this layer).
    if (meta.ref_zip && meta.ref_zip !== input.zip) {
      enriched.zip = meta.ref_zip;
      meta.applied = true;
      meta.reason = input.zip ? "zip_corrected" : "zip_filled";
    } else if (meta.ref_zip && meta.ref_zip === input.zip) {
      meta.reason = "zip_already_correct";
    } else {
      meta.reason = "hit_no_zip_change";
    }

    if (applyNames) {
      if (meta.ref_city) enriched.city = meta.ref_city;
      if (meta.ref_street) enriched.street = meta.ref_street;
      meta.applied = true;
    }

    return { payload: enriched, meta };
  } catch (err) {
    meta.reason = "lookup_error";
    meta.error = String(err && err.message ? err.message : err);
    return { payload: { ...payload, ...input }, meta };
  }
}

module.exports = {
  enrichAddressPayload,
  parseHouseNumber,
  flagEnabled,
};
