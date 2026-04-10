import { Logger } from '@lib/state/Logger'
import { create } from 'zustand'

type TokenizerState = {
    tokenize: (text: string) => number[]
    getTokenCount: (text: string, image_urls?: string[]) => number
}

// Simple tokenizer that estimates token count based on character length
// For remote API usage, the server handles actual tokenization
export namespace Tokenizer {
    export const useTokenizerState = create<TokenizerState>()((set, get) => ({
        tokenize: (text: string) => {
            // Rough estimation: ~4 chars per token for English, ~2 for CJK
            const cjkCount = (text.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g) || [])
                .length
            const otherCount = text.length - cjkCount
            const estimatedTokens = Math.ceil(cjkCount / 1.5 + otherCount / 4)
            return Array.from({ length: estimatedTokens }, (_, i) => i)
        },
        getTokenCount: function getTokenCount(text: string, image_urls: string[] = []) {
            const cjkCount = (text.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g) || [])
                .length
            const otherCount = text.length - cjkCount
            return Math.ceil(cjkCount / 1.5 + otherCount / 4) + image_urls.length * 512
        },
    }))

    export const getTokenizer = () => {
        return Tokenizer.useTokenizerState.getState().getTokenCount
    }

    export const useTokenizer = () => {
        return useTokenizerState((state) => state.getTokenCount)
    }
}
