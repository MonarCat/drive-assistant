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

  const { fromId, toId } = body

  if (!fromId || !toId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'fromId and toId are required' }),
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok: true,
      message: `Poke sent from ${fromId} to ${toId}`,
      timestamp: new Date().toISOString(),
    }),
  }
}
