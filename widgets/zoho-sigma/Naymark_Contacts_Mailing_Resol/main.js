/* Naymark Universal Address Widget – main.js
 * Requirements:
 * - Works for Contacts (mailing/other) and SalesOrders (billing/shipping)
 * - Uses FIELD_LIBRARY.js (NAYMARK_FIELD_LIB) for mapping
 * - Autocomplete + Enter/Blur (FindPlaceFromQuery) so user doesn't need to click suggestion
 * - ZIP via Maps JS Geocoder (client-side) + English (E) via Places Details (language=en). No Hebrew->Latin transliteration.
 * - Clears fields in widget AND in Zoho when starting a new search (so old values don't stick)
 * - Approve and Close: populates ALL mapped fields (including empty strings) after META filtering, then closes.
 */
(() => {
  'use strict';

  // -----------------------------
  // Helpers
  // -----------------------------
  const $ = (id) => document.getElementById(id);
  const safe = (v) => (v ?? '').toString();
  const trim = (v) => safe(v).trim();

  

  // NOTE:
  // We **do not** transliterate Hebrew -> Latin for (E) fields.
  // The user asked to populate English fields strictly from Google (in English),
  // because transliteration produces gibberish.
const UI = {
    module: $('moduleSelect'),
    target: $('targetSelect'),
    search: $('search'),

    streetHe: $('street_he'),
    streetEn: $('street_en'),
    cityHe: $('city_he'),
    cityEn: $('city_en'),
    house: $('house'),
    zip: $('zip'),
    entryHe: $('entry_he'),
    entryEn: $('entry_en'),
    apt: $('apt'),
    country: $('country'),

    approve: $('btn_approve'),
    status: $('status'),
  };

  function setStatus(msg, kind = 'info') {
    if (!UI.status) return;
    UI.status.textContent = msg;
    UI.status.style.color = (kind === 'error') ? '#b00020' : (kind === 'ok' ? '#0a7b0a' : '#3a4a6a');
  }

  function anyValue() {
    const ids = ['street_he','street_en','city_he','city_en','house','zip','entry_he','entry_en','apt','country'];
    return ids.some((id) => trim($(id)?.value));
  }

  function setApproveEnabled() {
    if (!UI.approve) return;
    UI.approve.disabled = !anyValue();
  }

  function clearUIFields() {
    ['street_he','street_en','city_he','city_en','house','zip','entry_he','entry_en','apt','country'].forEach((id) => {
      const el = $(id);
      if (el) el.value = '';
    });
    setApproveEnabled();
  }

  // -----------------------------
  // Context selector
  // -----------------------------
  function targetsForModule(moduleName) {
    if (moduleName === 'Contacts') return [
      { value: 'mailing', label: 'mailing' },
      { value: 'other',   label: 'other'   },
    ];
    return [
      { value: 'billing',  label: 'billing'  },
      { value: 'shipping', label: 'shipping' },
    ];
  }

  function defaultContext() {
    // If FIELD_LIBRARY provides detection (for legacy entry filenames), use it.
    try {
      if (window.NAYMARK_FIELD_LIB && typeof window.NAYMARK_FIELD_LIB.detectContext === 'function') {
        const c = window.NAYMARK_FIELD_LIB.detectContext();
        if (c && c.module && c.target) return c;
      }
    } catch (_) {}
    return { module: 'Contacts', target: 'mailing' };
  }

  function renderModuleAndTargets(ctx) {
    if (!UI.module || !UI.target) return;

    // module list
    UI.module.innerHTML = '';
    ['Contacts','SalesOrders'].forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      UI.module.appendChild(opt);
    });

    UI.module.value = (ctx.module === 'Sales_Orders') ? 'SalesOrders' : (ctx.module || 'Contacts');

    const renderTargets = () => {
      const selected = UI.target.value || ctx.target;
      UI.target.innerHTML = '';
      targetsForModule(UI.module.value).forEach((t) => {
        const opt = document.createElement('option');
        opt.value = t.value;
        opt.textContent = t.label;
        UI.target.appendChild(opt);
      });
      // keep selected if still valid
      const ok = Array.from(UI.target.options).some(o => o.value === selected);
      UI.target.value = ok ? selected : (UI.target.options[0] ? UI.target.options[0].value : '');
    };

    renderTargets();

    UI.module.addEventListener('change', () => {
      renderTargets();
      clearUIFields();
      setStatus('Context changed. Search address.');
    });

    UI.target.addEventListener('change', () => {
      clearUIFields();
      setStatus('Target changed. Search address.');
    });
  }

  // -----------------------------
  // Zoho META caching
  // -----------------------------
  const metaCache = new Map(); // entity -> Set(api_name)

  function getEntity() {
    return UI.module?.value || 'Contacts';
  }
  function getTarget() {
    return UI.target?.value || 'mailing';
  }

  async function getMetaSet(entity) {
    if (metaCache.has(entity)) return metaCache.get(entity);

    try {
      const meta = await ZOHO.CRM.META.getFields({ Entity: entity });
      const fields = (meta && meta.fields) ? meta.fields : [];
      const s = new Set();
      fields.forEach((f) => { if (f && f.api_name) s.add(f.api_name); });
      metaCache.set(entity, s);
      return s;
    } catch (_) {
      const s = new Set();
      metaCache.set(entity, s);
      return s;
    }
  }

  function pickExisting(candidates, metaSet) {
    if (!Array.isArray(candidates)) return null;
    for (const c of candidates) {
      if (metaSet.has(c)) return c;
    }
    return null;
  }

  function getMapping(entity, target) {
    if (!window.NAYMARK_FIELD_LIB || typeof window.NAYMARK_FIELD_LIB.getMapping !== 'function') return null;
    return window.NAYMARK_FIELD_LIB.getMapping(entity, target);
  }

  function buildPayloadFromUI(entity, target, metaSet, { includeEmpty }) {
    const mapping = getMapping(entity, target);
    if (!mapping) return {};

    const values = {
      street_he: trim(UI.streetHe?.value),
      street_en: trim(UI.streetEn?.value),
      city_he:   trim(UI.cityHe?.value),
      city_en:   trim(UI.cityEn?.value),
      house:     trim(UI.house?.value),
      entry_he:  trim(UI.entryHe?.value),
      entry_en:  trim(UI.entryEn?.value),
      apt:       trim(UI.apt?.value),
      zip:       trim(UI.zip?.value),
      country:   trim(UI.country?.value),
    };

    const payload = {};
    Object.keys(mapping).forEach((logicalKey) => {
      const api = pickExisting(mapping[logicalKey], metaSet);
      if (!api) return;
      const v = values[logicalKey] ?? '';
      if (includeEmpty) payload[api] = v;
      else if (v) payload[api] = v;
    });
    return payload;
  }

  let pageLoadData = null;

  function getRecordId() {
    const d = pageLoadData || {};
    // Detail/List custom buttons often send EntityId as an array: ["123..."]
    let id =
      d.EntityId ||
      d.entityId ||
      d.RecordID ||
      d.recordId ||
      (Array.isArray(d.data) && d.data[0] && (d.data[0].id || d.data[0].ID || d.data[0].EntityId)) ||
      (d.data && (d.data.EntityId || d.data.id)) ||
      null;

    if (Array.isArray(id)) id = id[0];
    if (id == null) return null;
    id = String(id).trim();
    return id || null;
  }

  async function populateZoho(payload) {
    if (!payload || Object.keys(payload).length === 0) return;

    // Detail view: populate() does NOT persist. Use updateRecord when we have an id.
    const recordId = getRecordId();
    const entity = getEntity();
    if (recordId && ZOHO?.CRM?.API?.updateRecord) {
      const apiData = Object.assign({ id: recordId }, payload);
      const res = await ZOHO.CRM.API.updateRecord({
        Entity: entity,
        APIData: apiData,
        Trigger: ["workflow"],
      });
      const row = res?.data?.[0] || res?.[0] || null;
      if (row && row.status && String(row.status).toLowerCase() === "error") {
        throw new Error(row.message || row.code || "updateRecord failed");
      }
      if (row && row.code && String(row.code).toUpperCase() !== "SUCCESS") {
        throw new Error(row.message || row.code || "updateRecord failed");
      }
      return res;
    }

    // Create / Edit form: fill fields in the open UI form.
    await ZOHO.CRM.UI.Record.populate(payload);
  }

  async function clearZohoFieldsForCurrentContext() {
    // On Detail, never wipe CRM fields while searching — only clear the widget UI.
    if (getRecordId()) return;

    const entity = getEntity();
    const target = getTarget();
    const metaSet = await getMetaSet(entity);
    const mapping = getMapping(entity, target);
    if (!mapping) return;

    const payload = {};
    Object.keys(mapping).forEach((logicalKey) => {
      const api = pickExisting(mapping[logicalKey], metaSet);
      if (api) payload[api] = '';
    });

    try {
      await ZOHO.CRM.UI.Record.populate(payload);
    } catch (e) {
      // don't break the search flow
      console.warn('Clear populate failed', e);
    }
  }

  // -----------------------------
  // Google Places / Geocoding (bilingual)
  // -----------------------------
  const GOOGLE_KEY = window.NAYMARK_GOOGLE_KEY || '';
  const DUMMY_DIV = document.createElement('div');
  let placesService = null;
  let autocomplete = null;
  let lastResolvedText = '';
  let geocoderDeniedOnce = false; // cache REQUEST_DENIED to avoid spamming console
  let lastZipResolution = { source: 'none', status: 'INIT' }; // for user-friendly status messages

  function parseAddressComponents(comps) {
    comps = comps || [];
    const find = (type) => comps.find(c => (c.types || []).includes(type)) || null;

    const streetNumber = find('street_number');
    const route = find('route');
    const locality = find('locality');
    const postalTown = find('postal_town');
    const sublocality = find('sublocality') || find('sublocality_level_1');
    const postal = find('postal_code');
    const country = find('country');

    const street = route ? (route.long_name || '') : '';
    const house  = streetNumber ? (streetNumber.long_name || '') : '';
    const city   = locality ? (locality.long_name || '') :
      (postalTown ? (postalTown.long_name || '') :
      (sublocality ? (sublocality.long_name || '') : ''));

    return {
      street,
      house,
      city,
      zip: postal ? (postal.long_name || '') : '',
      country: country ? (country.long_name || '') : '',
    };
  }

  // --- Google data sources ---
  // 1) ZIP: use Maps JavaScript API Geocoder (client-side). Works under Maps JS key restrictions
  //    and does NOT require the Geocoding *web service* to be enabled (which is often denied).
  // 2) English fields: pull from Google in English via Places Details (language=en)
  //    using PlacesService.getDetails (JS), NOT the Places Web Service (CORS-blocked in browsers).

  function geocodeJsByPlaceId(placeId) {
    return new Promise((resolve) => {
      try {
        // If we already saw REQUEST_DENIED, skip further Geocoder calls to reduce noise.
        if (geocoderDeniedOnce) {
          return resolve({ ok: false, res: null, status: 'REQUEST_DENIED_CACHED' });
        }
        if (!window.google || !google.maps || !google.maps.Geocoder) {
          return resolve({ ok: false, res: null, status: 'NO_GEOCODER' });
        }

        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ placeId }, (results, status) => {
          if (status === 'REQUEST_DENIED') geocoderDeniedOnce = true;
          if (status === 'OK' && results && results[0]) resolve({ ok: true, res: results[0], status });
          else resolve({ ok: false, res: null, status: status || 'UNKNOWN' });
        });
      } catch (_) {
        resolve({ ok: false, res: null, status: 'GEOCODER_ERROR' });
      }
    });
  }

  // NOTE: we intentionally do NOT call https://maps.googleapis.com/maps/api/place/details/json
  // from the browser (it is a Web Service endpoint and is commonly blocked by CORS).
  // Instead we use the already-loaded Maps JS Places library.
  function placeDetailsJsByPlaceId(placeId, language) {
    return new Promise((resolve) => {
      try {
        if (!placesService) return resolve({ ok: false, res: null, status: 'PLACES_NOT_READY' });
        const req = {
          placeId,
          fields: ['address_components', 'formatted_address', 'place_id', 'name'],
          region: 'IL',
        };
        if (language) req.language = language;
        placesService.getDetails(req, (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            resolve({ ok: true, res: place, status: 'OK' });
          } else {
            resolve({ ok: false, res: null, status: status || 'UNKNOWN' });
          }
        });
      } catch (_) {
        resolve({ ok: false, res: null, status: 'PLACES_DETAILS_ERROR' });
      }
    });
  }

  // --- Supabase ZIP fallback (optional) ---
  // Logic (per requirement):
  //   Google (Places/Geocoder) -> if ZIP missing, try Supabase -> if still missing, keep empty.
  // Supabase is only used if configured via window.NAYMARK_SUPABASE_*.
  // Allow a couple of common config names so we don't break existing deployments.

  function decodeBase64Url(input) {
    try {
      const s = String(input || '').replace(/-/g, '+').replace(/_/g, '/');
      const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
      return atob(s + pad);
    } catch (_) {
      return '';
    }
  }

  function deriveSupabaseUrlFromKey(key) {
    // Supabase anon/service keys are JWTs that often include a "ref" claim.
    // This lets us derive https://<ref>.supabase.co if URL wasn't provided.
    try {
      const parts = String(key || '').split('.');
      if (parts.length < 2) return '';
      const payloadJson = decodeBase64Url(parts[1]);
      if (!payloadJson) return '';
      const payload = JSON.parse(payloadJson);
      const ref = payload && typeof payload.ref === 'string' ? payload.ref : '';
      if (ref) return `https://${ref}.supabase.co`;
      const iss = payload && typeof payload.iss === 'string' ? payload.iss : '';
      if (iss && iss.startsWith('https://') && iss.includes('.supabase.co')) {
        return iss.replace(/\/auth\/v1\/?$/, '');
      }
      return '';
    } catch (_) {
      return '';
    }
  }

  function getSupabaseConfig() {
    const urlRaw = window.NAYMARK_SUPABASE_URL || window.SUPABASE_URL || '';
    const keyRaw = window.NAYMARK_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY || window.SUPABASE_KEY || '';
    // Prefer explicit config. If nothing is configured, we do NOT force RPC unless there is no table.
    // (This avoids breaking older deployments that might rely on table lookup only.)
    const rpcRaw = window.NAYMARK_SUPABASE_ZIP_RPC || window.SUPABASE_ZIP_RPC || '';
    const table = window.NAYMARK_SUPABASE_ZIP_TABLE || window.SUPABASE_ZIP_TABLE || '';
    const colCity = window.NAYMARK_SUPABASE_ZIP_COL_CITY || 'city_he';
    const colStreet = window.NAYMARK_SUPABASE_ZIP_COL_STREET || 'street_he';
    const colHouse = window.NAYMARK_SUPABASE_ZIP_COL_HOUSE || 'house';
    const colZip = window.NAYMARK_SUPABASE_ZIP_COL_ZIP || 'zip';

    let url = trim(urlRaw);
    const key = trim(keyRaw);
    if (!url && key) {
      url = deriveSupabaseUrlFromKey(key);
    }

    const rpc = trim(rpcRaw) || (!trim(table) ? 'resolve_il_zip' : '');

    return {
      url,
      key,
      rpc: trim(rpc),
      table: trim(table),
      colCity,
      colStreet,
      colHouse,
      colZip,
    };
  }

  function normalizeHebForMatch(v) {
    const s = String(v || '').normalize('NFKC');
    // Remove Hebrew diacritics (nikud/taamim) + common punctuation variance.
    return s
      .replace(/[\u0591-\u05C7]/g, '')
      .replace(/["'״׳`]/g, '')
      .replace(/[\u2010-\u2015]/g, '-')
      .replace(/[.,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function firstZipFromSupabasePayload(payload, colZip) {
    const pick = (o) => {
      if (!o || typeof o !== 'object') return '';
      // Support our specific RPC (resolve_il_zip) which returns {zip7, zip5}
      // plus generic column names.
      const keys = ['zip7', 'zip5', 'zip', 'postal_code', 'postcode', 'post_code', colZip];
      for (const k of keys) {
        const v = o[k];
        if (typeof v === 'string' && trim(v)) return trim(v);
        if (typeof v === 'number' && String(v)) return String(v);
      }
      return '';
    };
    if (Array.isArray(payload)) {
      for (const row of payload) {
        const z = pick(row);
        if (z) return z;
      }
      return '';
    }
    return pick(payload);
  }

  function normalizeEntranceForSupabase(v) {
    const s = trim(v);
    if (!s) return null;
    // The widget historically uses "manual" as a placeholder/value.
    // Passing it into the RPC would block matches (because entrance becomes non-null).
    if (s.toLowerCase() === 'manual') return null;
    return s;
  }

  function digitsOrEmpty(v) {
    return trim(v).replace(/[^0-9]/g, '');
  }

  async function lookupZipInSupabase({ street_he, city_he, street_en, city_en, house, entrance }) {
    const cfg = getSupabaseConfig();
    if (!cfg.url || !cfg.key) return { ok: false, zip: '', status: 'NO_SUPABASE_CONFIG' };
    const headers = {
      apikey: cfg.key,
      Authorization: 'Bearer ' + cfg.key,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    // 1) Prefer RPC if provided (most flexible, schema-independent)
    // IMPORTANT: We MUST NOT assume whether zip_merge stores HE or EN.
    // To avoid "address definitely has ZIP but widget shows empty", we try a small ordered
    // set of (city, street) variants:
    //   - Hebrew first
    //   - English (with and without road-type suffix like "Street")
    //   - Wildcardized variants (space/hyphen -> %) because the SQL function uses ILIKE '%<input>%'
    // This still preserves the overall logic: Google -> (only if missing) Supabase -> blank.
    if (cfg.rpc) {
      const p_house = trim(house);
      if (!digitsOrEmpty(p_house)) return { ok: false, zip: '', status: 'NO_HOUSE' };

      const heCity0 = trim(city_he);
      const heStreet0 = trim(street_he);
      const enCity0 = trim(city_en);
      const enStreet0 = trim(street_en);
      if ((!heCity0 && !enCity0) || (!heStreet0 && !enStreet0)) {
        return { ok: false, zip: '', status: 'NO_CITY_OR_STREET' };
      }

      const wildcardize = (s) => {
        const t = trim(s);
        if (!t) return '';
        // Use % between tokens so it matches "X Y", "X-Y", "X־Y" etc.
        return t.replace(/[\s\-־]+/g, '%').replace(/%{2,}/g, '%');
      };

      const stripHeStreetPrefix = (s) => {
        const t = trim(s);
        if (!t) return '';
        return t.replace(/^(רחוב|רח׳|רח\.|שדרות|שד׳|שד\.|דרך)\s+/u, '').trim();
      };

      const stripEnRoadType = (s) => {
        let t = trim(s);
        if (!t) return '';
        // Remove common road-type suffixes.
        t = t.replace(/[\s,.-]+$/g, '');
        t = t.replace(/\b(street|st\.?|road|rd\.?|avenue|ave\.?|boulevard|blvd\.?|drive|dr\.?|lane|ln\.?|way|place|pl\.?|square|sq\.?|highway|hwy\.?)\b\s*$/i, '').trim();
        // Also remove leading "Street"-like tokens if Google ever returns them.
        t = t.replace(/^\b(street|st\.?|road|rd\.?|avenue|ave\.?|boulevard|blvd\.?|drive|dr\.?|lane|ln\.?|way|place|pl\.?|square|sq\.?|highway|hwy\.?)\b\s+/i, '').trim();
        return t;
      };

      const stripEnCityNoise = (s) => {
        let t = trim(s);
        if (!t) return '';
        t = t.replace(/^city of\s+/i, '').trim();
        return t;
      };

      const heCity = stripHeStreetPrefix(heCity0); // harmless, but keeps symmetry
      const heStreet = stripHeStreetPrefix(heStreet0);
      const enCity = stripEnCityNoise(enCity0);
      const enStreetClean = stripEnRoadType(enStreet0);

      const pairs = [];
      const seen = new Set();
      const pushPair = (city, street, tag) => {
        const c = trim(city);
        const s = trim(street);
        if (!c || !s) return;
        const key = `${c}|||${s}`;
        if (seen.has(key)) return;
        seen.add(key);
        pairs.push({ city: c, street: s, tag });
      };

      // Hebrew-first (most IL datasets are Hebrew)
      pushPair(heCity, heStreet, 'HE');
      pushPair(wildcardize(heCity), heStreet, 'HE_CITY_W');
      pushPair(heCity, wildcardize(heStreet), 'HE_STREET_W');
      pushPair(wildcardize(heCity), wildcardize(heStreet), 'HE_BOTH_W');

      // English (Google) – try clean street without "Street" first
      pushPair(enCity, enStreetClean || enStreet0, 'EN_CLEAN');
      pushPair(wildcardize(enCity), enStreetClean || enStreet0, 'EN_CITY_W');
      pushPair(enCity, wildcardize(enStreetClean || enStreet0), 'EN_STREET_W');
      pushPair(wildcardize(enCity), wildcardize(enStreetClean || enStreet0), 'EN_BOTH_W');
      pushPair(enCity0, enStreet0, 'EN_RAW');

      // Mixed fallbacks (rare but can happen depending on dataset)
      pushPair(enCity, heStreet, 'MIX_ENCITY_HEST');
      pushPair(heCity, enStreetClean || enStreet0, 'MIX_HECITY_ENST');

      const rpcUrl = `${cfg.url.replace(/\/$/, '')}/rest/v1/rpc/${encodeURIComponent(cfg.rpc)}`;

      const p_entrance = normalizeEntranceForSupabase(entrance);

      const callRpc = async (city, street, entr) => {
        const r = await fetch(rpcUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            p_city: city,
            p_street: street,
            p_house,
            p_entrance: entr,
          }),
        });
        const j = await r.json().catch(() => null);
        return firstZipFromSupabasePayload(j, cfg.colZip);
      };

      try {
        // 1) If entrance is provided, try it first (more specific)
        if (p_entrance) {
          for (const p of pairs) {
            const z = await callRpc(p.city, p.street, p_entrance);
            if (z) return { ok: true, zip: z, status: `OK:${p.tag}:WITH_ENTRANCE` };
          }
        }

        // 2) Fallback without entrance (matches either NULL entrance or any entrance as per SQL logic)
        for (const p of pairs) {
          const z = await callRpc(p.city, p.street, null);
          if (z) return { ok: true, zip: z, status: `OK:${p.tag}:NO_ENTRANCE` };
        }
        return { ok: false, zip: '', status: 'NOT_FOUND' };
      } catch (_) {
        return { ok: false, zip: '', status: 'RPC_FETCH_ERROR' };
      }
    }

    // 2) Table/view lookup if configured
    if (cfg.table) {
      // Guard rails: avoid overly-broad queries that could return a wrong ZIP.
      if (!digitsOrEmpty(house)) return { ok: false, zip: '', status: 'NO_HOUSE' };
      if (!trim(city_he) || !trim(street_he)) return { ok: false, zip: '', status: 'NO_CITY_OR_STREET' };
      const base = `${cfg.url.replace(/\/$/, '')}/rest/v1/${encodeURIComponent(cfg.table)}`;
      const enc = (v) => encodeURIComponent(String(v || '').trim());

      const buildUrl = ({ withHouse, useIlike }) => {
        const qs = [];
        qs.push(`select=${encodeURIComponent(cfg.colZip)}`);

        const cityVal = useIlike ? normalizeHebForMatch(city_he) : trim(city_he);
        const streetVal = useIlike ? normalizeHebForMatch(street_he) : trim(street_he);
        const cityOp = useIlike ? 'ilike' : 'eq';
        const streetOp = useIlike ? 'ilike' : 'eq';
        const cityPattern = useIlike ? `*${cityVal}*` : cityVal;
        const streetPattern = useIlike ? `*${streetVal}*` : streetVal;

        if (cityPattern) qs.push(`${encodeURIComponent(cfg.colCity)}=${cityOp}.${enc(cityPattern)}`);
        if (streetPattern) qs.push(`${encodeURIComponent(cfg.colStreet)}=${streetOp}.${enc(streetPattern)}`);
        if (withHouse && trim(house)) qs.push(`${encodeURIComponent(cfg.colHouse)}=eq.${enc(house)}`);
        return `${base}?${qs.join('&')}`;
      };

      const tryFetch = async (opts) => {
        const url = buildUrl(opts);
        const r = await fetch(url, { headers });
        const j = await r.json().catch(() => null);
        return firstZipFromSupabasePayload(j, cfg.colZip);
      };

      try {
        // Order of attempts:
        //  1) Exact match with house
        //  2) Exact match without house
        //  3) ILIKE (normalized) with house
        //  4) ILIKE (normalized) without house
        const attempts = [
          { withHouse: true, useIlike: false },
          { withHouse: false, useIlike: false },
          { withHouse: true, useIlike: true },
          { withHouse: false, useIlike: true },
        ];
        for (const a of attempts) {
          const z = await tryFetch(a);
          if (z) return { ok: true, zip: z, status: 'OK' };
        }
        return { ok: false, zip: '', status: 'NOT_FOUND' };
      } catch (_) {
        return { ok: false, zip: '', status: 'TABLE_FETCH_ERROR' };
      }
    }

    return { ok: false, zip: '', status: 'NO_SUPABASE_TARGET' };
  }

  function applyPlaceParsedHebrew(parsed) {
    UI.streetHe.value = parsed.street || '';
    UI.cityHe.value   = parsed.city || '';
    UI.house.value    = parsed.house || '';
    UI.zip.value      = parsed.zip || '';
    UI.country.value  = parsed.country || '';
  }

  function applyEnglishFromGoogle(enRes) {
    const en = enRes ? parseAddressComponents(enRes.address_components || []) : null;
    if (!en) return;
    if (en.street) UI.streetEn.value = en.street;
    if (en.city) UI.cityEn.value = en.city;
    if (!trim(UI.zip.value) && en.zip) UI.zip.value = en.zip;
  }

  function resolvePlaceId(placeId) {
    return new Promise((resolve, reject) => {
      if (!placesService) return reject(new Error('PlacesService not ready'));
      placesService.getDetails(
        {
          placeId,
          fields: ['address_components', 'geometry', 'place_id', 'formatted_address', 'name'],
        },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) resolve(place);
          else reject(new Error('getDetails failed: ' + status));
        }
      );
    });
  }

  async function startNewSearchFlow() {
    // clear UI + clear Zoho first (requirement)
    clearUIFields();
    await clearZohoFieldsForCurrentContext();
  }

  async function processPlace(place) {
    if (!place) return;

    await startNewSearchFlow();

    // Fill from Places result first (hebrew due to script language)
    const parsed = parseAddressComponents(place.address_components || []);
    applyPlaceParsedHebrew(parsed);

    // Track ZIP resolution source for clearer messages.
    lastZipResolution = {
      source: trim(UI.zip.value) ? 'google_places' : 'none',
      status: trim(UI.zip.value) ? 'OK' : 'NO_ZIP_FROM_PLACES',
    };

    // ZIP + English (E) fields
    // ZIP: via JS Geocoder (client-side), not Geocoding web-service.
    // English fields: via Google Places Details (language=en). NO transliteration.

    let enDenied = false;
    let enMissing = false;
    let zipFromSupabase = false;

    const placeId = place.place_id;
    if (placeId) {
      const needZip = !trim(UI.zip.value);
      const needEn = !trim(UI.streetEn.value) || !trim(UI.cityEn.value);

      const [geoJs, en] = await Promise.all([
        needZip ? geocodeJsByPlaceId(placeId) : Promise.resolve({ ok: false, res: null, status: 'SKIP' }),
        needEn ? placeDetailsJsByPlaceId(placeId, 'en') : Promise.resolve({ ok: false, res: null, status: 'SKIP' })
      ]);

      // ZIP: prefer Geocoder (often returns postal_code when Places doesn't)
      if (!trim(UI.zip.value) && geoJs.ok && geoJs.res) {
        const g = parseAddressComponents(geoJs.res.address_components || []);
        if (g.zip) UI.zip.value = g.zip;
        if (g.zip) lastZipResolution = { source: 'google_geocoder_js', status: 'OK' };
      } else if (!trim(UI.zip.value) && geoJs.status && geoJs.status !== 'SKIP') {
        lastZipResolution = { source: 'google_geocoder_js', status: geoJs.status };
      }

      // English: strict Google English (no Hebrew->Latin conversion)
      if (en.ok && en.res) {
        applyEnglishFromGoogle(en.res);
      } else if (en.status === 'REQUEST_DENIED') {
        enDenied = true;
      }

      // ZIP fallback (Supabase) – only if Google didn't return ZIP
      if (!trim(UI.zip.value)) {
        const sb = await lookupZipInSupabase({
          street_he: trim(UI.streetHe.value),
          city_he: trim(UI.cityHe.value),
          street_en: trim(UI.streetEn.value),
          city_en: trim(UI.cityEn.value),
          house: trim(UI.house.value),
          entrance: trim(UI.entryHe.value) || trim(UI.entryEn.value),
        });
        lastZipResolution = { source: 'supabase', status: sb.status || 'UNKNOWN' };
        if (sb.ok && sb.zip) {
          UI.zip.value = sb.zip;
          zipFromSupabase = true;
        }
      }

      if (!trim(UI.streetEn.value) && !trim(UI.cityEn.value)) enMissing = true;
    } else {
      enMissing = true;
    }

    setApproveEnabled();

    const hasZip = !!trim(UI.zip.value);
    const hasHouse = !!trim(UI.house.value);

    if (enDenied) {
      setStatus('Address loaded. English fields may be missing because Google Places Details (EN) is denied for this API key.', 'info');
    } else if (!hasZip && !hasHouse) {
      setStatus('Address loaded. ZIP is often returned only for a full address with house number; Google did not return ZIP for this input.', 'info');
    } else if (!hasZip) {
      // If Supabase is configured, we already tried it above.
      if (lastZipResolution.source === 'supabase' && lastZipResolution.status === 'NO_SUPABASE_CONFIG') {
        setStatus('Address loaded. Google did not return ZIP (Geocoding may be denied) and Supabase ZIP fallback is not configured (missing URL/anon key).', 'info');
      } else if (lastZipResolution.source === 'supabase' && lastZipResolution.status === 'RPC_FETCH_ERROR') {
        setStatus('Address loaded. Google did not return ZIP and Supabase ZIP lookup failed (RPC_FETCH_ERROR). Check network/CSP/permissions for resolve_il_zip.', 'info');
      } else if (lastZipResolution.source === 'supabase' && lastZipResolution.status === 'NOT_FOUND') {
        setStatus('Address loaded. Google did not return ZIP and Supabase resolve_il_zip did not find a match for this city/street/house.', 'info');
      } else {
        setStatus('Address loaded. ZIP was not returned for this address.', 'info');
      }
    } else if (enMissing) {
      setStatus('Address loaded. ZIP found, but Google did not return English Street/City for this place. You can type English manually if needed.', 'info');
    } else if (zipFromSupabase) {
      setStatus('Address loaded. ZIP was found via Supabase (Google did not return a postal code). Review Apt/Entry if needed, then Approve and Close.', 'ok');
    } else {
      setStatus('Address loaded. Review Apt/Entry if needed, then Approve and Close.', 'ok');
    }
  }

  function initAutocomplete() {
    if (!window.google || !google.maps || !google.maps.places) {
      setStatus('Google Maps not loaded.', 'error');
      return;
    }

    placesService = new google.maps.places.PlacesService(DUMMY_DIV);

    autocomplete = new google.maps.places.Autocomplete(UI.search, {
      fields: ['place_id']
    });

    autocomplete.addListener('place_changed', async () => {
      try {
        const p = autocomplete.getPlace();
        const pid = p && p.place_id ? p.place_id : '';
        const text = trim(UI.search.value);
        if (!pid && !text) return;
        setStatus('Resolving...', 'info');

        if (pid) {
          const details = await resolvePlaceId(pid);
          await processPlace(details);
        } else {
          await findAndProcessByText(text);
        }
        lastResolvedText = text;
      } catch (e) {
        console.error(e);
        setStatus('Address not found.', 'error');
      }
    });

    // Enter
    UI.search.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const text = trim(UI.search.value);
        if (!text || text === lastResolvedText) return;
        setStatus('Resolving...', 'info');
        findAndProcessByText(text).catch((err) => {
          console.error(err);
          setStatus('Address not found.', 'error');
        });
        lastResolvedText = text;
      }
    });

    // Blur
    UI.search.addEventListener('blur', () => {
      setTimeout(() => {
        const text = trim(UI.search.value);
        if (!text || text === lastResolvedText) return;
        setStatus('Resolving...', 'info');
        findAndProcessByText(text).catch((err) => {
          console.error(err);
          setStatus('Address not found.', 'error');
        });
        lastResolvedText = text;
      }, 120);
    });
  }

  function findPlaceFromQuery(text) {
    return new Promise((resolve, reject) => {
      if (!placesService) return reject(new Error('PlacesService not ready'));
      const request = {
        query: text,
        fields: ['place_id'],
      };
      placesService.findPlaceFromQuery(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0]) resolve(results[0]);
        else reject(new Error('findPlaceFromQuery failed: ' + status));
      });
    });
  }

  async function findAndProcessByText(text) {
    const r = await findPlaceFromQuery(text);
    if (!r || !r.place_id) throw new Error('No place_id');
    const details = await resolvePlaceId(r.place_id);
    await processPlace(details);
  }

  // -----------------------------
  // Approve & Close
  // -----------------------------
  async function approveAndClose() {
    try {
      const entity = getEntity();
      const target = getTarget();
      const metaSet = await getMetaSet(entity);

      // On detail we persist via API — do not wipe unrelated blanks / "manual" placeholders.
      const onDetail = !!getRecordId();
      const payload = buildPayloadFromUI(entity, target, metaSet, {
        includeEmpty: !onDetail,
      });

      // Never write placeholder "manual" into CRM.
      Object.keys(payload).forEach((k) => {
        if (String(payload[k]).trim().toLowerCase() === "manual") delete payload[k];
      });

      if (!payload || Object.keys(payload).length === 0) {
        setStatus('Nothing to populate (no matching fields in layout/meta).', 'error');
        return;
      }

      await populateZoho(payload);
      setStatus(onDetail ? 'Saved to record. Closing...' : 'Populated. Closing...', 'ok');

      // close popup safely
      try {
        if (ZOHO?.CRM?.UI?.Popup?.close) return ZOHO.CRM.UI.Popup.close();
        if (ZOHO?.CRM?.UI?.closePopup) return ZOHO.CRM.UI.closePopup();
        if (ZOHO?.embeddedApp?.close) return ZOHO.embeddedApp.close();
      } catch (_) {}
    } catch (e) {
      console.error(e);
      setStatus('Approve failed. Check console.', 'error');
    }
  }

  // -----------------------------
  // Boot
  // -----------------------------
  function bindValueChangeEnablers() {
    ['street_he','street_en','city_he','city_en','house','zip','entry_he','entry_en','apt','country'].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener('input', setApproveEnabled);
    });
  }

  ZOHO.embeddedApp.on('PageLoad', (data) => {
    try {
      pageLoadData = data || null;
      renderModuleAndTargets(defaultContext());
      clearUIFields();
      bindValueChangeEnablers();
      initAutocomplete();

      UI.approve.addEventListener('click', approveAndClose);

      const rid = getRecordId();
      console.log('Naymark PageLoad', pageLoadData, 'recordId=', rid);
      setStatus(
        rid
          ? `Ready. Detail save ON (id ${rid}). Search address, then Approve.`
          : 'Ready. No record id — Approve will only populate Edit/Create form.',
        'info'
      );
    } catch (e) {
      console.error(e);
      setStatus('Init failed. Check console.', 'error');
    }
  });

  ZOHO.embeddedApp.init();
})();
