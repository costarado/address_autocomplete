// Netlify Serverless Function для отправки данных в Zoho CRM
// Разместите этот файл в папке netlify/functions/send-to-zoho.js

exports.handler = async (event, context) => {
  // Разрешаем CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Обработка preflight запроса
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Только POST запросы
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const data = JSON.parse(event.body);
    const { recordId, accessToken, apiDomain, addressType, payload } = data;

    if (!recordId || !accessToken) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required parameters' }),
      };
    }

    // Формируем данные для Zoho CRM API
    const zohoData = {};
    if (addressType === 'mailing') {
      zohoData.Mailing_Street = payload.street || '';
      zohoData.Mailing_House = payload.house || '';
      zohoData.Mailing_City = payload.city || '';
      zohoData.Mailing_Zip = payload.zip || '';
    } else if (addressType === 'other') {
      zohoData.Other_Street = payload.street || '';
      zohoData.Other_House = payload.house || '';
      zohoData.Other_City = payload.city || '';
      zohoData.Other_Zip = payload.zip || '';
    }

    // Отправляем данные в Zoho CRM через REST API
    const apiUrl = (apiDomain || 'https://www.zohoapis.com') + '/crm/v2/Contacts/' + recordId;
    
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: [zohoData]
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: result.message || 'Zoho API error', details: result }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: result }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

