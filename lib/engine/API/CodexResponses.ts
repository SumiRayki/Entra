import { Logger } from '@lib/state/Logger'
import { fetch } from 'expo/fetch'
import { nativeApplicationVersion } from 'expo-application'

import { getCodexAccessCredentials } from './CodexAuth'
import type { Message } from './ContextBuilder'

const CODEX_RESPONSES_ENDPOINT = 'https://chatgpt.com/backend-api/codex/responses'

type CodexResponseParams = {
    model: string
    prompt: Message[]
    onData: (data: string) => void
    onEnd: (data: string) => void
    stopGenerating: () => void
}

type ResponseEvent = {
    type?: string
    delta?: string
    response?: {
        error?: {
            code?: string
            message?: string
        }
        incomplete_details?: {
            reason?: string
        }
    }
    error?: {
        message?: string
    }
}

type CodexInputContent =
    | { type: 'input_text'; text: string }
    | { type: 'input_image'; image_url: string; detail: 'auto' }

export const sendCodexResponse = async ({
    model,
    prompt,
    onData,
    onEnd,
    stopGenerating,
}: CodexResponseParams) => {
    const abortController = new AbortController()
    let reasoningOpen = false
    let finished = false

    const closeReasoning = () => {
        if (!reasoningOpen) return
        onData('</think>')
        reasoningOpen = false
    }

    const finish = () => {
        if (finished) return
        finished = true
        closeReasoning()
        onEnd('')
        stopGenerating()
    }

    const handleEvent = (event: ResponseEvent) => {
        if (
            event.type === 'response.reasoning_summary_text.delta' ||
            event.type === 'response.reasoning_text.delta'
        ) {
            if (typeof event.delta !== 'string' || event.delta.length === 0) return
            if (!reasoningOpen) {
                onData('<think>')
                reasoningOpen = true
            }
            onData(event.delta)
            return
        }

        if (event.type === 'response.output_text.delta') {
            if (typeof event.delta !== 'string' || event.delta.length === 0) return
            closeReasoning()
            onData(event.delta)
            return
        }

        if (event.type === 'response.failed' || event.type === 'response.incomplete') {
            const message =
                event.response?.error?.message ??
                event.response?.incomplete_details?.reason ??
                'Codex 返回了未完成的响应'
            throw new Error(message)
        }

        if (event.type === 'error') {
            throw new Error(event.error?.message ?? 'Codex 返回错误')
        }
    }

    const run = async (forceRefresh: boolean) => {
        const credentials = await getCodexAccessCredentials(forceRefresh)
        const response = await fetch(CODEX_RESPONSES_ENDPOINT, {
            method: 'POST',
            signal: abortController.signal,
            headers: {
                accept: 'text/event-stream',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${credentials.accessToken}`,
                'ChatGPT-Account-Id': credentials.accountId,
                originator: 'entra',
                'User-Agent': `Entra/${nativeApplicationVersion ?? 'unknown'}`,
            },
            body: JSON.stringify(buildCodexPayload(model, prompt)),
        })

        if (response.status === 401 && !forceRefresh) {
            return run(true)
        }

        if (!response.ok || !response.body) {
            const body = await response.text()
            throw new Error(formatHttpError(response.status, body))
        }

        const decoder = new TextDecoder()
        let buffer = ''

        // @ts-expect-error expo/fetch exposes an async iterable stream at runtime
        for await (const chunk of response.body) {
            buffer += decoder.decode(chunk, { stream: true })
            buffer = consumeSseBuffer(buffer, handleEvent)
        }
        buffer += decoder.decode()
        consumeSseBuffer(`${buffer}\n\n`, handleEvent)
    }

    run(false)
        .catch((error) => {
            if (!abortController.signal.aborted) {
                const message = error instanceof Error ? error.message : String(error)
                Logger.errorToast(`Codex 生成失败：${message}`)
            }
        })
        .finally(finish)

    return () => {
        abortController.abort()
        finish()
    }
}

export const buildCodexPayload = (model: string, prompt: Message[]) => {
    const systemMessages = prompt.filter((message) => message.role === 'system')
    const inputMessages = prompt.filter((message) => message.role !== 'system')
    const instructions = systemMessages
        .map((message) => contentToText(message.content))
        .filter(Boolean)
        .join('\n\n')

    return {
        model: model,
        instructions: instructions,
        input: inputMessages.map((message) => ({
            role: message.role,
            content: convertContent(message.content),
        })),
        store: false,
        reasoning: {
            effort: 'medium',
            summary: 'auto',
        },
        text: {
            verbosity: 'medium',
        },
        stream: true,
    }
}

export const consumeSseBuffer = (buffer: string, onEvent: (event: ResponseEvent) => void) => {
    const normalized = buffer.replace(/\r\n/g, '\n')
    const blocks = normalized.split('\n\n')
    const remainder = blocks.pop() ?? ''

    for (const block of blocks) {
        const data = block
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trimStart())
            .join('\n')
        if (!data || data === '[DONE]') continue

        try {
            onEvent(JSON.parse(data) as ResponseEvent)
        } catch (error) {
            if (error instanceof SyntaxError) {
                Logger.warn('Codex 返回了无法解析的流事件')
                continue
            }
            throw error
        }
    }

    return remainder
}

const convertContent = (content: Message['content']): string | CodexInputContent[] => {
    if (typeof content === 'string') return content
    if (!Array.isArray(content)) return ''

    const output: CodexInputContent[] = []
    for (const item of content) {
        if (item.type === 'text' || item.type === 'input_text') {
            output.push({ type: 'input_text', text: item.text })
        }
        if (item.type === 'image_url') {
            output.push({
                type: 'input_image',
                image_url: item.image_url.url,
                detail: 'auto',
            })
        }
    }
    return output
}

const contentToText = (content: Message['content']) => {
    if (typeof content === 'string') return content
    if (!Array.isArray(content)) return ''

    return content
        .map((item) => (item.type === 'text' || item.type === 'input_text' ? item.text : ''))
        .join('')
}

const formatHttpError = (status: number, body: string) => {
    try {
        const parsed = JSON.parse(body)
        const message = parsed?.error?.message ?? parsed?.detail ?? parsed?.message
        if (typeof message === 'string' && message) return `${message}（HTTP ${status}）`
    } catch {}
    return `请求失败（HTTP ${status}）`
}
