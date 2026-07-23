const DEFAULT_PRIMARY = 'gemini-3.6-flash'
const DEFAULT_FALLBACK = 'gemini-3.1-flash-lite'

export default {
  async fetch(request, env) {
    const startTime = Date.now()
    if (request.method === 'OPTIONS') return cors(request, new Response(null, { status: 204 }), env, startTime)
    if (request.method !== 'POST') return cors(request, new Response('Method not allowed', { status: 405 }), env, startTime)

    const provider = env.AI_PROVIDER || 'google'
    if (provider !== 'google') {
      return cors(request, new Response(`Unsupported provider: ${provider} (only "google" is supported)`, { status: 400 }), env, startTime)
    }

    const apiKey = env.GOOGLE_API_KEY
    if (!apiKey) {
      return cors(request, new Response('Missing GOOGLE_API_KEY', { status: 500 }), env, startTime)
    }

    let body
    try {
      body = await request.json()
    } catch {
      return cors(request, new Response('Invalid JSON body', { status: 400 }), env, startTime)
    }

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return cors(request, new Response('Missing or invalid "messages" in request body', { status: 400 }), env, startTime)
    }

    if (body.tools !== undefined && !Array.isArray(body.tools)) {
      return cors(request, new Response('Invalid "tools" — must be an array', { status: 400 }), env, startTime)
    }

    const primaryModel = env.PRIMARY_MODEL || DEFAULT_PRIMARY
    const fallbackModel = env.FALLBACK_MODEL || DEFAULT_FALLBACK
    const validTools = (body.tools ?? []).filter(isValidTool).map(convertTool)

    const { contents, systemInstruction } = toGeminiContents(body.system, body.messages)

    let usedModel = primaryModel
    let usedFallback = false
    let response

    const primarySignal = AbortSignal.timeout(30000)
    try {
      response = await callGemini(primaryModel, contents, systemInstruction, validTools, body.max_tokens, apiKey, primarySignal)
      if (!response.ok) {
        const status = response.status
        if (status === 400 || status === 401 || status === 403) {
          const text = await response.text()
          return cors(request, new Response(text, { status }), env, startTime)
        }
        throw new Error(`Primary model ${primaryModel} failed with status ${status}`)
      }
    } catch (e) {
      if (e.name === 'AbortError' || e.message?.includes('failed')) {
        usedModel = fallbackModel
        usedFallback = true
        const fbSignal = AbortSignal.timeout(30000)
        try {
          response = await callGemini(fallbackModel, contents, systemInstruction, validTools, body.max_tokens, apiKey, fbSignal)
          if (!response.ok) {
            const text = await response.text()
            return cors(request, new Response(text, { status: response.status }), env, startTime)
          }
        } catch (e2) {
          const msg = e2.name === 'AbortError' ? 'timeout' : e2.message
          return cors(request, new Response(`Both models failed (fallback ${msg})`, { status: 500 }), env, startTime)
        }
      } else {
        return cors(request, new Response(e.message, { status: 500 }), env, startTime)
      }
    }

    const data = await response.json()
    const anthropicResponse = toAnthropicResponse(data)
    const result = Response.json(anthropicResponse)
    result.headers.set('X-AI-Provider', 'google')
    result.headers.set('X-Model-Used', usedModel)
    if (usedFallback) result.headers.set('X-Fallback', 'true')
    return cors(request, result, env, startTime)
  },
}

async function callGemini(model, contents, systemInstruction, tools, maxTokens, apiKey, signal) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const body = { contents }
  if (systemInstruction) body.systemInstruction = systemInstruction
  if (tools.length) body.tools = [{ functionDeclarations: tools }]
  body.generationConfig = { maxOutputTokens: Math.min(maxTokens ?? 1500, 8192) }
  return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal })
}

function isValidTool(tool) {
  return tool && typeof tool.name === 'string' && tool.name.length > 0 && typeof tool.description === 'string'
}

function convertTool(tool) {
  return { name: tool.name, description: tool.description, parameters: tool.input_schema || { type: 'object', properties: {} } }
}

function toGeminiContents(system, messages) {
  const callIdToName = {}
  const contents = []
  for (const msg of messages) {
    if (msg.role === 'assistant') {
      const parts = []
      for (const block of msg.content || []) {
        if (block.type === 'text') {
          parts.push({ text: block.text })
        } else if (block.type === 'tool_use') {
          callIdToName[block.id] = block.name
          const part = { functionCall: { name: block.name, args: block.input || {} } }
          const sig = block.thought_signature || 'skip_thought_signature_validator'
          part.thought_signature = sig
          parts.push(part)
        }
      }
      contents.push({ role: 'model', parts })
    } else {
      const parts = []
      for (const block of msg.content || []) {
        if (block.type === 'text') {
          parts.push({ text: block.text })
        } else if (block.type === 'tool_result') {
          const funcName = callIdToName[block.tool_use_id] || 'unknown'
          let responseObj = {}
          try { responseObj = JSON.parse(block.content) } catch { responseObj = { raw: block.content } }
          parts.push({ functionResponse: { name: funcName, response: responseObj } })
        }
      }
      if (parts.length) contents.push({ role: 'user', parts })
    }
  }
  return { contents, systemInstruction: system ? { parts: [{ text: system }] } : undefined }
}

function toAnthropicResponse(geminiResponse) {
  const candidate = geminiResponse.candidates?.[0]
  if (!candidate) {
    const reason = geminiResponse.promptFeedback?.blockReason
    return { content: [{ type: 'text', text: reason ? `Request blocked: ${reason}` : 'Empty response from model' }], stop_reason: 'end_turn' }
  }
  const parts = candidate.content?.parts || []
  const content = []
  let hasToolUse = false
  for (const part of parts) {
    if (part.text) {
      content.push({ type: 'text', text: part.text })
    } else if (part.functionCall) {
      hasToolUse = true
      const fc = { type: 'tool_use', id: `toolcall_${content.length}`, name: part.functionCall.name, input: part.functionCall.args || {} }
      if (part.thought_signature) fc.thought_signature = part.thought_signature
      content.push(fc)
    }
  }
  return { content, stop_reason: hasToolUse ? 'tool_use' : 'end_turn' }
}

function cors(request, response, env, startTime) {
  const origin = request.headers.get('Origin') || ''
  const allowedOrigin = env.ALLOWED_ORIGIN || '*'
  const allowedOrigins = allowedOrigin === '*' ? ['*'] : allowedOrigin.split(',').map((s) => s.trim())
  const headers = new Headers(response.headers)
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', allowedOrigin === '*' ? '*' : origin)
  }
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'content-type')
  if (startTime) headers.set('X-Response-Time', `${Date.now() - startTime}ms`)
  return new Response(response.body, { status: response.status, headers })
}
