const DEFAULT_MODEL = 'deepseek/deepseek-chat'

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return cors(request, new Response(null, { status: 204 }), env)
    if (request.method !== 'POST') return cors(request, new Response('Method not allowed', { status: 405 }), env)

    const apiKey = env.OPENROUTER_API_KEY
    if (!apiKey) {
      return cors(request, new Response('Proxy is missing OPENROUTER_API_KEY', { status: 500 }), env)
    }

    let body
    try {
      body = await request.json()
    } catch {
      return cors(request, new Response('Invalid JSON body', { status: 400 }), env)
    }

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return cors(request, new Response('Missing or invalid "messages" in request body', { status: 400 }), env)
    }

    if (body.model !== undefined && typeof body.model !== 'string') {
      return cors(request, new Response('Invalid "model" — must be a string', { status: 400 }), env)
    }

    if (body.tools !== undefined && !Array.isArray(body.tools)) {
      return cors(request, new Response('Invalid "tools" — must be an array', { status: 400 }), env)
    }

    const model = body.model || env.OPENROUTER_MODEL || DEFAULT_MODEL
    const tools = (body.tools ?? []).filter(isValidTool).map(normalizeTool)

    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: Math.min(body.max_tokens ?? 1500, 4096),
        messages: toOpenRouterMessages(body.system, body.messages),
        ...(tools.length ? { tools } : {}),
      }),
    })

    if (!upstream.ok) {
      const text = await upstream.text()
      return cors(request, new Response(text, { status: upstream.status, headers: { 'content-type': 'application/json' } }), env)
    }

    const response = await upstream.json()
    return cors(request, Response.json(toAnthropicResponse(response)), env)
  },
}

function isValidTool(tool) {
  return tool
    && typeof tool.name === 'string'
    && tool.name.length > 0
    && typeof tool.description === 'string'
}

function toOpenRouterMessages(system, messages) {
  const output = system ? [{ role: 'system', content: system }] : []
  for (const message of messages) {
    if (message.role === 'assistant') {
      const text = message.content
        .filter((item) => item.type === 'text')
        .map((item) => item.text)
        .join('\n')
      const tool_calls = message.content
        .filter((item) => item.type === 'tool_use')
        .map((item) => ({
          id: item.id,
          type: 'function',
          function: { name: item.name, arguments: JSON.stringify(item.input) },
        }))
      output.push({
        role: 'assistant',
        content: text || null,
        ...(tool_calls.length ? { tool_calls } : {}),
      })
      continue
    }

    const results = message.content.filter((item) => item.type === 'tool_result')
    if (results.length) {
      output.push(
        ...results.map((item) => ({
          role: 'tool',
          tool_call_id: item.tool_use_id,
          content: item.content,
        })),
      )
    } else {
      const text = message.content
        .filter((item) => item.type === 'text')
        .map((item) => item.text)
        .join('\n')
      output.push({ role: 'user', content: text })
    }
  }
  return output
}

function normalizeTool(tool) {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema || { type: 'object', properties: {} },
    },
  }
}

function toAnthropicResponse(response) {
  const message = response.choices?.[0]?.message ?? {}
  const content = []
  if (message.content) {
    content.push({ type: 'text', text: message.content })
  }
  for (const call of message.tool_calls ?? []) {
    let input = {}
    try {
      input = JSON.parse(call.function.arguments || '{}')
    } catch {
      input = {}
    }
    content.push({ type: 'tool_use', id: call.id, name: call.function.name, input })
  }
  return {
    content,
    stop_reason: message.tool_calls?.length ? 'tool_use' : 'end_turn',
  }
}

function cors(request, response, env) {
  const origin = request.headers.get('Origin') || ''
  const allowedOrigin = env.ALLOWED_ORIGIN || '*'
  const headers = new Headers(response.headers)
  if (allowedOrigin === '*' || origin === allowedOrigin) {
    headers.set('Access-Control-Allow-Origin', allowedOrigin)
  } else if (origin) {
    return new Response('Origin not allowed', { status: 403 })
  }
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'content-type')
  return new Response(response.body, { status: response.status, headers })
}
