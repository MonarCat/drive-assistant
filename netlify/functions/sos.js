const { randomUUID } = require('crypto')

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    }
  }

  const { vehicleId, lat, lng, message } = body

  if (!vehicleId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'vehicleId is required' }),
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok: true,
      alertId: randomUUID(),
      vehicleId,
      lat: lat ?? null,
      lng: lng ?? null,
      message: message || 'SOS broadcast sent',
      broadcastedAt: new Date().toISOString(),
    }),
  }
}
