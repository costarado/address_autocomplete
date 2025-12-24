async function getAccessToken() {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    refresh_token: process.env.ZOHO_REFRESH_TOKEN,
  });

  const res = await fetch(
    `${process.env.ZOHO_ACCOUNTS_DOMAIN}/oauth/v2/token`,
    {
      method: "POST",
      body: params,
    }
  );

  return res.json();
}

exports.handler = async (event) => {
  const { contactId } = event.queryStringParameters || {};

  if (!contactId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "contactId required" }),
    };
  }

  const tokenData = await getAccessToken();
  if (!tokenData.access_token) {
    return {
      statusCode: 500,
      body: JSON.stringify(tokenData),
    };
  }

  const res = await fetch(
    `${process.env.ZOHO_API_DOMAIN}/crm/v2/Contacts/${contactId}`,
    {
      headers: {
        Authorization: `Zoho-oauthtoken ${tokenData.access_token}`,
      },
    }
  );

  const json = await res.json();
  const c = json.data && json.data[0];

  if (!c) {
    return { statusCode: 404, body: "Contact not found" };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      mailing: {
        street: c.Mailing_Street || "",
        city: c.Mailing_City || "",
        state: c.Mailing_State || "",
        zip: c.Mailing_Zip || "",
        country: c.Mailing_Country || "",
      },
      shipping: {
        street: c.Other_Street || "",
        city: c.Other_City || "",
        state: c.Other_State || "",
        zip: c.Other_Zip || "",
        country: c.Other_Country || "",
      },
    }),
  };
};
