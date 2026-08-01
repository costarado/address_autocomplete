const { enrichAddressPayload } = require("./lib/address-ref");

function trimEnv(value) {
  return String(value || "").trim();
}

/** Strip accidental trailing labels like " refresh_token". */
function cleanRefreshToken(value) {
  const raw = trimEnv(value);
  if (!raw) return "";
  const first = raw.split(/\s+/)[0];
  return first;
}

function isZohoRecordId(value) {
  return /^\d{10,25}$/.test(String(value || "").trim());
}

function pick(address, keys) {
  for (const key of keys) {
    const value = trimEnv(address?.[key]);
    if (value) return value;
  }
  return "";
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: "Method Not Allowed" };
  }

  try {
    const { recordId, addressType, payload } = JSON.parse(event.body || "{}");

    if (!recordId || !addressType || !payload) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing parameters" }),
      };
    }

    if (!isZohoRecordId(recordId)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Invalid recordId",
          hint: "Zoho Contact id must be a numeric CRM id from the record URL/macro",
          recordId,
        }),
      };
    }

    if (addressType !== "mailing" && addressType !== "other") {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "addressType must be mailing or other" }),
      };
    }

    const clientId = trimEnv(process.env.ZOHO_CLIENT_ID);
    const clientSecret = trimEnv(process.env.ZOHO_CLIENT_SECRET);
    const refreshToken = cleanRefreshToken(process.env.ZOHO_REFRESH_TOKEN);
    const accountsDomain = trimEnv(
      process.env.ZOHO_ACCOUNTS_DOMAIN || "https://accounts.zoho.com"
    ).replace(/\/$/, "");
    const apiDomainFallback = trimEnv(
      process.env.ZOHO_API_DOMAIN || "https://www.zohoapis.com"
    ).replace(/\/$/, "");

    if (!clientId || !clientSecret || !refreshToken) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Missing Zoho OAuth env vars" }),
      };
    }

    const { payload: address, meta: addressRef } = await enrichAddressPayload(
      payload,
      process.env
    );

    console.log(
      "address_ref",
      JSON.stringify({
        recordId,
        addressType,
        ...addressRef,
      })
    );

    const tokenResp = await fetch(`${accountsDomain}/oauth/v2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
      }).toString(),
    });

    const tokenJson = await tokenResp.json();
    if (!tokenJson.access_token) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Zoho token refresh failed",
          zoho: tokenJson,
        }),
      };
    }

    const accessToken = tokenJson.access_token;
    const apiDomain = trimEnv(tokenJson.api_domain || apiDomainFallback).replace(
      /\/$/,
      ""
    );

    const street = trimEnv(address.street);
    const city = trimEnv(address.city);
    const zip = trimEnv(address.zip);
    const house = trimEnv(address.house);
    const streetEn = pick(address, [
      "street_en",
      "street_e",
      "streetEn",
      "Street_E",
    ]);
    const cityEn = pick(address, ["city_en", "city_e", "cityEn", "City_E"]);
    const data = {};

    // Write only the selected target block — never copy mailing <-> other.
    if (addressType === "mailing") {
      data.Mailing_Street = street;
      data.Mailing_City = city;
      data.Mailing_Zip = zip;
      data.House = house;
      if (streetEn) data.Mailing_Street_E = streetEn;
      if (cityEn) data.Mailing_City_E = cityEn;
    } else {
      data.Other_Street = street;
      data.Other_City = city;
      data.Other_Zip = zip;
      data.Other_House = house;
      if (streetEn) data.Other_Street_E = streetEn;
      if (cityEn) data.Other_City_E = cityEn;
    }

    const zohoUrl = `${apiDomain}/crm/v2/Contacts/${recordId}`;
    const resp = await fetch(zohoUrl, {
      method: "PUT",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: [data] }),
    });

    const result = await resp.json();
    const debug =
      String(process.env.ADDRESS_REF_DEBUG || "").toLowerCase() === "true";

    return {
      statusCode: resp.ok ? 200 : resp.status,
      headers: {
        ...headers,
        "X-Address-Ref-Hit": addressRef.hit ? "1" : "0",
        "X-Address-Ref-Reason": addressRef.reason || "",
      },
      body: JSON.stringify(
        debug
          ? {
              zoho: result,
              address_ref: addressRef,
              saved: data,
              zoho_url: zohoUrl,
            }
          : result
      ),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: String(e) }),
    };
  }
};
