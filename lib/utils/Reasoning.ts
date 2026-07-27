const OPEN_TAG = '<think>'
const CLOSE_TAG = '</think>'

export type ReasoningParts = {
    content: string
    reasoning: string
    hasReasoning: boolean
    isThinking: boolean
}

export const parseReasoningText = (value: string): ReasoningParts => {
    const contentParts: string[] = []
    const reasoningParts: string[] = []
    let cursor = 0
    let hasReasoning = false
    let isThinking = false

    while (cursor < value.length) {
        const openIndex = value.indexOf(OPEN_TAG, cursor)
        if (openIndex === -1) {
            contentParts.push(value.slice(cursor))
            break
        }

        contentParts.push(value.slice(cursor, openIndex))
        hasReasoning = true

        const reasoningStart = openIndex + OPEN_TAG.length
        const closeIndex = value.indexOf(CLOSE_TAG, reasoningStart)
        if (closeIndex === -1) {
            reasoningParts.push(value.slice(reasoningStart))
            isThinking = true
            break
        }

        reasoningParts.push(value.slice(reasoningStart, closeIndex))
        cursor = closeIndex + CLOSE_TAG.length
    }

    const content = contentParts.join('').trim()
    const reasoning = reasoningParts.join('\n\n').trim()

    return { content, reasoning, hasReasoning, isThinking }
}
