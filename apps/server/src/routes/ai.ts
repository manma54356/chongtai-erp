import Anthropic from '@anthropic-ai/sdk'
import type { FastifyInstance } from 'fastify'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' })

const SYSTEM_PROMPT = `你是重泰開發有限公司ERP系統的AI財務助理。
專門協助建設公司的財務、會計與專案管理問題，請用繁體中文回答。

你熟悉：
- 台灣建設公司會計實務（ROC民國曆、傳票、科目分類）
- 建案管理、請款流程、應付帳款管控
- 預算收支分析與財務報表解讀
- 台灣稅務基礎（營所稅、VAT）

回答時請簡明扼要，必要時提供具體的系統操作步驟。`

export default async function aiRoutes(app: FastifyInstance) {
  app.post('/ai/chat', { onRequest: [app.authenticate] }, async (req, reply) => {
    const { messages } = req.body as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return reply.status(503).send({ error: '尚未設定 ANTHROPIC_API_KEY，請聯繫系統管理員。' })
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    })

    const sendEvent = (data: object) => {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    try {
      const stream = client.messages.stream({
        model: 'claude-fable-5',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages,
        headers: { 'anthropic-beta': 'server-side-fallback-2026-06-01' },
        fallbacks: [{ model: 'claude-opus-4-8' }],
      } as Parameters<typeof client.messages.stream>[0])

      stream.on('text', (text) => {
        sendEvent({ text })
      })

      const finalMsg = await stream.finalMessage()
      if (finalMsg.stop_reason === 'refusal') {
        sendEvent({ text: '\n\n（此請求無法處理）' })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      sendEvent({ error: msg })
    }

    sendEvent({ done: true })
    reply.raw.end()
  })
}
