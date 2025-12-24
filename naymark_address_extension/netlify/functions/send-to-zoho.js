// netlify/functions/send-to-zoho.js
exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const data = JSON.parse(event.body || "{}");
    const { recordId, addressType, payload } = data;

    if (!recordId || !addressType || !payload) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing required parameters" }) };
    }

    const {
      ZOHO_CLIENT_ID,
      ZOHO_CLIENT_SECRET,
      ZOHO_REFRESH_TOKEN,
      ZOHO_API_DOMAIN = "https://www.zohoapis.com",
      ZOHO_ACCOUNTS_DOMAIN = "https://accounts.zoho.com",
    } = process.env;

    if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Missing Zoho OAuth env vars" }) };
    }

    // 1) Refresh access token
    const tokenResp = await fetch(`${ZOHO_ACCOUNTS_DOMAIN}/oauth/v2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: ZOHO_REFRESH_TOKEN,
        client_id: ZOHO_CLIENT_ID,
        client_secret: ZOHO_CLIENT_SECRET,
        grant_type: "refresh_token",
      }).toString(),
    });

    const tokenJson = await tokenResp.json();
    if (!tokenResp.ok || !tokenJson.access_token) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ step: "refresh_token", status: tokenResp.status, details: tokenJson }),
      };
    }
    const accessToken = tokenJson.access_token;

    // 2) Map fields
    const zohoData = {};
    if (addressType === "mailing") {
      zohoData.Mailing_Street = payload.street || "";
      zohoData.Mailing_House = payload.house || ""; // если нет такого поля — удалите
      zohoData.Mailing_City = payload.city || "";
      zohoData.Mailing_Zip = payload.zip || "";
    } else if (addressType === "other") {
      zohoData.Other_Street = payload.street || "";
      zohoData.Other_House = payload.house || ""; // если нет такого поля — удалите
      zohoData.Other_City = payload.city || "";
      zohoData.Other_Zip = payload.zip || "";
    } else {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid addressType" }) };
    }

    // 3) Update contact
    const resp = await fetch(`${ZOHO_API_DOMAIN}/crm/v2/Contacts/${recordId}`, {
      method: "PUT",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: [zohoData] }),
    });

    const result = await resp.json();
    if (!resp.ok) {
      return {
        statusCode: resp.status,
        headers,
        body: JSON.stringify({ step: "update_contact", details: result }),
      };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: result }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(e) }) };
  }
};
