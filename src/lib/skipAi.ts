// Typed helpers for hooks proxying $ai.chat (OpenAI-shape) and
// Server-Sent Events (SSE) parsing.

export interface OpenAIChatResult {
  id: string
  model: string
  choices: Array<{
    index: number
    message: { role: string; content: string; tool_calls?: unknown[] }
    finish_reason: string
  }>
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

export interface OpenAIChatStreamChunk {
  id?: string
  model?: string
  choices: Array<{
    index: number
    delta: { role?: string; content?: string; tool_calls?: unknown[] }
    finish_reason?: string | null
  }>
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

interface SseBlock {
  event: string
  data: string
}

export async function* readSseBlocks(
  response: Response,
  signal?: AbortSignal,
): AsyncGenerator<SseBlock> {
  if (!response.body) return
  const reader = response.body.getReader()
  // Wire abort directly into the reader. reader.cancel(reason) makes
  // the in-flight read() reject with `reason` AND tears down the
  // underlying connection, so a stalled stream interrupts immediately
  // — not just on the next yielded event.
  const onAbort = () => {
    reader.cancel(signal?.reason).catch(() => {})
  }
  if (signal?.aborted) onAbort()
  signal?.addEventListener('abort', onAbort)
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
      const blocks = buffer.split('\n\n')
      buffer = blocks.pop() ?? ''
      for (const block of blocks) {
        const parsed = parseSseBlock(block)
        if (parsed) yield parsed
      }
    }
    // Flush trailing multibyte char + any block missing the final blank line.
    buffer += decoder.decode().replace(/\r\n/g, '\n')
    if (buffer.trim()) {
      const parsed = parseSseBlock(buffer)
      if (parsed) yield parsed
    }
  } finally {
    signal?.removeEventListener('abort', onAbort)
    reader.releaseLock()
  }
}

function parseSseBlock(raw: string): SseBlock | null {
  let event = 'message'
  const dataLines: string[] = []
  for (const rawLine of raw.split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    if (!line || line.startsWith(':')) continue
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''))
  }
  if (dataLines.length === 0) return null
  return { event, data: dataLines.join('\n') }
}

function isOpenAIChatStreamChunk(v: unknown): v is OpenAIChatStreamChunk {
  if (!v || typeof v !== 'object') return false
  const c = (v as { choices?: unknown }).choices
  if (c !== undefined && !Array.isArray(c)) return false
  if (Array.isArray(c)) {
    const validChoices = c.every((choice) => {
      if (!choice || typeof choice !== 'object') return false
      const ch = choice as Record<string, unknown>
      return typeof ch.index === 'number' && !!ch.delta && typeof ch.delta === 'object'
    })
    if (!validChoices) return false
  }
  return true
}

// Iterate $ai.chat({stream:true}) chunks. Skips the [DONE] sentinel
// AND any malformed payload — the contract says callers receive only
// well-formed OpenAIChatStreamChunk objects.
// Pass an AbortSignal to cancel a stalled read mid-stream.
export async function* parseChatStream(
  response: Response,
  signal?: AbortSignal,
): AsyncGenerator<OpenAIChatStreamChunk> {
  let sawDone = false
  for await (const block of readSseBlocks(response, signal)) {
    if (block.event === 'error') {
      let msg = block.data
      try {
        const parsed = JSON.parse(block.data)
        if (parsed.message) msg = parsed.message
        else if (parsed.error?.message) msg = parsed.error.message
      } catch {
        /* intentionally ignored */
      }
      throw new Error(msg)
    }
    if (!block.data) continue
    if (block.data === '[DONE]' || block.data === '[]') {
      sawDone = true
      continue
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(block.data)
    } catch {
      continue
    }
    if (isOpenAIChatStreamChunk(parsed)) yield parsed
  }

  if (!sawDone) {
    throw new Error('Stream ended without [DONE] sentinel')
  }
}

export interface StreamOpenAIChatHandlers {
  onChunk?: (deltaText: string, accumulatedText: string) => void
  onError?: (message: string) => void
  signal?: AbortSignal
}

export interface StreamOpenAIChatResult {
  content: string
  model: string
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

// Drive an OpenAI chat stream end-to-end. Resolves after the stream closes;
// throws on abort or on streaming error.
export async function streamOpenAIChat(
  response: Response,
  handlers: StreamOpenAIChatHandlers = {},
): Promise<StreamOpenAIChatResult> {
  // Non-200 responses come back as JSON, not SSE.
  if (!response.ok) {
    let message = `Chat stream failed: ${response.status}`
    try {
      const body = (await response.clone().json()) as { message?: unknown; error?: unknown }
      if (typeof body.message === 'string') message = body.message
      else if (typeof body.error === 'string') message = body.error
    } catch {
      const text = await response.text().catch(() => '')
      if (text.trim()) message = text
    }
    throw new Error(message)
  }

  let content = ''
  let model = ''
  let usage: StreamOpenAIChatResult['usage']

  const abortError = (): Error =>
    handlers.signal?.reason instanceof Error
      ? handlers.signal.reason
      : new DOMException('The operation was aborted', 'AbortError')

  if (handlers.signal?.aborted) throw abortError()

  try {
    for await (const chunk of parseChatStream(response, handlers.signal)) {
      if (handlers.signal?.aborted) throw abortError()

      if (chunk.model) {
        model = chunk.model
      }

      if (chunk.usage) {
        usage = chunk.usage
      }

      if (chunk.choices && chunk.choices.length > 0) {
        for (const choice of chunk.choices) {
          const deltaContent = choice.delta?.content
          if (deltaContent) {
            content += deltaContent
            handlers.onChunk?.(deltaContent, content)
          }
        }
      }
    }
  } catch (err) {
    if (handlers.signal?.aborted) throw abortError()
    const msg = err instanceof Error ? err.message : 'Unknown streaming error'
    handlers.onError?.(msg)
    throw err
  }

  if (handlers.signal?.aborted) throw abortError()

  return { content, model, usage }
}
