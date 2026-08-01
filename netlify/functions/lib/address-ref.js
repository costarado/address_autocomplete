/**
 * Optional IL address reference via existing Supabase zip_merge RPC.
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

function padHouse(house) {
  const n = parseHouseNumber(house);
  if (n == null) return null;
  return String(n).padStart(5, "0");
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
    ref_zip5: null,
    ref_city: null,
    ref_street: null,
    ref_house: null,
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

  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/lookup_zip_merge`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_city: input.city,
        p_street: input.street,
        p_house: input.house || null,
      }),
    });

    if (!resp.ok) {
      meta.reason = `supabase_http_${resp.status}`;
      return { payload: { ...payload, ...input }, meta };
    }

    const rows = await resp.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    const zip7 = row?.zip7 != null ? String(row.zip7) : "";
    const zip5 = row?.zip5 != null ? String(row.zip5) : "";
    const refZip = zip7 || zip5;

    if (!row || !refZip) {
      meta.reason = "no_match";
      return { payload: { ...payload, ...input }, meta };
    }

    meta.hit = true;
    meta.ref_zip = refZip;
    meta.ref_zip5 = zip5 || null;
    meta.ref_city = row.location_name || null;
    meta.ref_street = row.street_name || null;
    meta.ref_house = row.house_number || padHouse(input.house);

    const enriched = { ...payload, ...input };
    const applyNames = flagEnabled(env.ADDRESS_REF_APPLY_NAMES);

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
  padHouse,
  flagEnabled,
};
