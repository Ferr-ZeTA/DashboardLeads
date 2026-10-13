const API_URL = 'https://prospektia.red.com.sv/api/metrics/reuniones'

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.RED_API_KEY
  if (!apiKey) {
    return response.status(500).json({ error: 'RED_API_KEY no está configurada en el servidor.' })
  }

  const requestUrl = new URL(request.url, 'http://localhost')
  const offset = requestUrl.searchParams.get('offset') ?? '0'
  if (!/^\d+$/.test(offset)) {
    return response.status(400).json({ error: 'El parámetro offset debe ser un entero no negativo.' })
  }

  let upstream
  try {
    upstream = await fetch(`${API_URL}?offset=${encodeURIComponent(offset)}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-API-Key': apiKey,
      },
    })
  } catch {
    return response.status(502).json({ error: 'No fue posible conectar con el API de reuniones.' })
  }

  const body = await upstream.text()
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
  return response.status(upstream.status).send(body)
}
