import { readAsStringAsync, writeAsStringAsync, cacheDirectory } from 'expo-file-system'
import * as FS from 'expo-file-system'
import mime from 'mime'

import { mmkv } from '@lib/storage/MMKV'
import { Logger } from '@lib/state/Logger'

export const ImageGenerationSettingsKey = {
    BaseUrl: 'image-generation-base-url',
    ApiKey: 'image-generation-api-key',
    Model: 'image-generation-model',
    Count: 'image-generation-count',
} as const

export type ImageGenerationTarget = 'avatar' | 'character-chat-background' | 'adventure-chat-background'

export type ImageGenerationSettings = {
    baseUrl: string
    apiKey: string
    model: string
    imageCount: number
}

export type GeneratedImageResult = {
    id: string
    uri: string
    size?: string
}

type GenerationRequest = {
    prompt: string
    target: ImageGenerationTarget
    screenWidth: number
    screenHeight: number
    referenceImages?: string[]
}

type GenerationResponse = {
    data?: Array<{
        url?: string
        b64_json?: string
        size?: string
    }>
    error?: {
        message?: string
        code?: string
    }
    message?: string
}

const DEFAULT_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'
const DEFAULT_IMAGE_COUNT = 4
const DEFAULT_MODEL = 'doubao-seedream-5-0-lite-250821'

const clamp = (value: number, min: number, max: number) => {
    return Math.min(max, Math.max(min, value))
}

const roundTo64 = (value: number) => {
    return Math.round(value / 64) * 64
}

const normalizeDimension = (value: number, min: number, max: number) => {
    return clamp(roundTo64(value), min, max)
}

const getGenerationSize = ({
    target,
    model,
    screenWidth,
    screenHeight,
}: {
    target: ImageGenerationTarget
    model: string
    screenWidth: number
    screenHeight: number
}) => {
    if (target === 'avatar') return '1024x1536'

    const ratio = screenHeight > 0 && screenWidth > 0 ? screenHeight / screenWidth : 16 / 9

    if (model.includes('seedream-3.0')) {
        const width = 1024
        const height = normalizeDimension(width * ratio, 1024, 2048)
        return `${width}x${height}`
    }

    const width = 1536
    const heightMax = model.includes('seedream-4.0') ? 4096 : 3072
    const height = normalizeDimension(width * ratio, 1440, heightMax)
    return `${width}x${height}`
}

const normalizeBaseUrl = (url: string) => {
    const trimmed = url.trim().replace(/\/+$/, '')
    if (!trimmed) return ''
    if (trimmed.endsWith('/images/generations')) return trimmed
    return `${trimmed}/images/generations`
}

const getErrorMessage = (json?: GenerationResponse) => {
    return json?.error?.message || json?.message || '图像生成失败'
}

const dataUrlFromBase64 = (b64: string, type = 'image/jpeg') => {
    return `data:${type};base64,${b64}`
}

const getMimeTypeFromUri = (uri: string) => {
    const guessed = mime.getType(uri)
    return guessed || 'image/png'
}

const isSeedreamSeriesModel = (model: string) => {
    return model.includes('seedream')
}

export namespace ImageGeneration {
    export const getSettings = (): ImageGenerationSettings => {
        const count = Number(mmkv.getString(ImageGenerationSettingsKey.Count) || DEFAULT_IMAGE_COUNT)
        return {
            baseUrl:
                mmkv.getString(ImageGenerationSettingsKey.BaseUrl)?.trim() || DEFAULT_BASE_URL,
            apiKey: mmkv.getString(ImageGenerationSettingsKey.ApiKey)?.trim() || '',
            model: mmkv.getString(ImageGenerationSettingsKey.Model)?.trim() || DEFAULT_MODEL,
            imageCount: clamp(Number.isFinite(count) ? count : DEFAULT_IMAGE_COUNT, 1, 4),
        }
    }

    export const saveSettings = (settings: ImageGenerationSettings) => {
        mmkv.set(ImageGenerationSettingsKey.BaseUrl, settings.baseUrl.trim())
        mmkv.set(ImageGenerationSettingsKey.ApiKey, settings.apiKey.trim())
        mmkv.set(ImageGenerationSettingsKey.Model, settings.model.trim())
        mmkv.set(ImageGenerationSettingsKey.Count, String(clamp(settings.imageCount, 1, 4)))
    }

    export const buildCharacterPrompt = ({
        card,
        target,
    }: {
        card: {
            name?: string
            description?: string
            personality?: string
            scenario?: string
            first_mes?: string
            background_story?: string
            personality_traits?: string
            gender?: string
            age?: string
            height?: string
            creator_notes?: string
        }
        target: ImageGenerationTarget
    }) => {
        const sections = [
            card.name ? `角色名：${card.name}` : '',
            card.description ? `描述：${card.description}` : '',
            card.personality ? `性格：${card.personality}` : '',
            card.personality_traits ? `性格特征：${card.personality_traits}` : '',
            card.background_story ? `背景故事：${card.background_story}` : '',
            card.scenario ? `场景：${card.scenario}` : '',
            card.first_mes ? `首条消息语气参考：${card.first_mes}` : '',
            card.gender ? `性别：${card.gender}` : '',
            card.age ? `年龄：${card.age}` : '',
            card.height ? `身高：${card.height}` : '',
        ].filter(Boolean)

        const base = sections.join('\n')

        if (target === 'avatar') {
            return [
                '请根据以下角色资料生成角色头像。',
                '要求：单人主体，面部清晰，半身或近景，适合后续裁剪成 1:1 头像，不要文字、水印、对话框。',
                base,
            ]
                .filter(Boolean)
                .join('\n')
        }

        return [
            '请根据以下角色资料生成该角色的聊天背景。',
            '要求：竖图，适合手机竖屏聊天界面，突出角色本人，全身像，姿势不限，构图完整，不要文字、水印、UI 元素。',
            '请给画面保留一定背景空间，避免主体过于贴边。',
            base,
        ]
            .filter(Boolean)
            .join('\n')
    }

    export const buildAdventurePrompt = (adventure: {
        name?: string
        description?: string
        scenario?: string
        systemPrompt?: string
    }) => {
        const sections = [
            adventure.name ? `游戏名：${adventure.name}` : '',
            adventure.description ? `简介：${adventure.description}` : '',
            adventure.scenario ? `背景故事：${adventure.scenario}` : '',
            adventure.systemPrompt ? `系统提示词：${adventure.systemPrompt}` : '',
        ].filter(Boolean)

        return [
            '请根据以下游戏资料生成该游戏的聊天背景。',
            '要求：竖图，适合手机竖屏聊天界面，强调世界观、场景氛围与叙事感，不限制是否出现人物，不要文字、水印、UI 元素。',
            sections.join('\n'),
        ]
            .filter(Boolean)
            .join('\n')
    }

    export const imageToDataUrl = async (uri: string, mimeType?: string) => {
        const contentType = (mimeType || getMimeTypeFromUri(uri)).toLowerCase()
        const base64 = await readAsStringAsync(uri, { encoding: FS.EncodingType.Base64 })
        return dataUrlFromBase64(base64, contentType)
    }

    export const generate = async (request: GenerationRequest): Promise<GeneratedImageResult[]> => {
        const settings = getSettings()
        if (!settings.baseUrl || !settings.apiKey || !settings.model) {
            throw new Error('请先在图像生成设置中填写 URL、API Key 和模型')
        }

        const endpoint = normalizeBaseUrl(settings.baseUrl)
        const size = getGenerationSize({
            target: request.target,
            model: settings.model,
            screenWidth: request.screenWidth,
            screenHeight: request.screenHeight,
        })

        const payload: Record<string, unknown> = {
            model: settings.model,
            prompt: request.prompt.trim(),
            size,
            response_format: 'url',
            watermark: false,
        }

        if (!request.prompt.trim()) {
            throw new Error('提示词不能为空')
        }

        if (request.referenceImages?.length) {
            payload.image =
                request.referenceImages.length === 1
                    ? request.referenceImages[0]
                    : request.referenceImages
        }

        if (isSeedreamSeriesModel(settings.model) && !settings.model.includes('seedream-3.0')) {
            if (settings.imageCount > 1) {
                payload.sequential_image_generation = 'auto'
                payload.sequential_image_generation_options = {
                    max_images: settings.imageCount,
                }
            } else {
                payload.sequential_image_generation = 'disabled'
            }
        } else {
            payload.n = settings.imageCount
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${settings.apiKey}`,
            },
            body: JSON.stringify(payload),
        })

        const json = (await response.json().catch(() => undefined)) as GenerationResponse | undefined
        if (!response.ok) {
            throw new Error(getErrorMessage(json))
        }

        const results: GeneratedImageResult[] =
            json?.data
                ?.map((item, index) => {
                    const uri = item.url || (item.b64_json ? dataUrlFromBase64(item.b64_json) : '')
                    if (!uri) return null
                    return {
                        id: `${Date.now()}-${index}`,
                        uri,
                        size: item.size,
                    }
                })
                .filter((item): item is NonNullable<typeof item> => item !== null) || []

        if (results.length === 0) {
            Logger.warn(JSON.stringify(json))
            throw new Error('接口没有返回可用图片')
        }

        return results
    }

    export const persistGeneratedImage = async (uri: string, prefix = 'seedream-generated') => {
        const extension =
            uri.startsWith('data:image/png') || uri.toLowerCase().includes('.png') ? 'png' : 'jpg'
        const output = `${cacheDirectory}${prefix}-${Date.now()}.${extension}`

        if (uri.startsWith('data:image/')) {
            const [, base64 = ''] = uri.split(',')
            await writeAsStringAsync(output, base64, { encoding: FS.EncodingType.Base64 })
            return output
        }

        await FS.downloadAsync(uri, output)
        return output
    }
}
