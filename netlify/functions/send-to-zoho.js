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

    const {
      ZOHO_CLIENT_ID,
      ZOHO_CLIENT_SECRET,
      ZOHO_REFRESH_TOKEN,
      ZOHO_API_DOMAIN,
      ZOHO_ACCOUNTS_DOMAIN,
    } = process.env;

    // refresh token
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
    if (!tokenJson.access_token) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify(tokenJson),
      };
    }

    const accessToken = tokenJson.access_token;

    const data = {};
    if (addressType === "mailing") {
      data.Mailing_Street = payload.street || "";
      data.Mailing_City = payload.city || "";
      data.Mailing_Zip = payload.zip || "";
    } else if (addressType === "other") {
      data.Other_Street = payload.street || "";
      data.Other_City = payload.city || "";
      data.Other_Zip = payload.zip || "";
    }

    const resp = await fetch(
      `${ZOHO_API_DOMAIN}/crm/v2/Contacts/${recordId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: [data] }),
      }
    );

    const result = await resp.json();

    return {
      statusCode: resp.ok ? 200 : resp.status,
      headers,
      body: JSON.stringify(result),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: String(e) }),
    };
  }
};
