import { db as database } from '@db'
import { STORY_LENGTH_REMINDER, STORY_WRITING_RULES } from '@lib/constants/StoryPrompts'
import { Characters } from '@lib/state/Characters'
import { Logger } from '@lib/state/Logger'
import { characters, chats, stories, storyCharacters, storyChats } from 'db/schema'
import { asc, desc, eq } from 'drizzle-orm'

const STORY_NARRATOR_PREFIX = '__STORY_NARRATOR__:'

type StoryRecord = {
    id: number
    name: string
    description: string
    world_setting: string
    background: string
    image_id: number | null
    last_modified: number | null
}

type StoryCharacterRecord = {
    id: number
    story_id: number
    name: string
    brief_description: string
}

const getNarratorCreatorNote = (storyId: number) => `${STORY_NARRATOR_PREFIX}${storyId}`

export const getStoryNarratorCreatorNote = (storyId: number) => getNarratorCreatorNote(storyId)

export const getStoryIdFromCreatorNotes = (creatorNotes?: string | null) => {
    if (!creatorNotes?.startsWith(STORY_NARRATOR_PREFIX)) return null
    const parsed = Number(creatorNotes.slice(STORY_NARRATOR_PREFIX.length))
    return Number.isFinite(parsed) ? parsed : null
}

const formatLabeledValue = (label: string, value?: string | null) => {
    const trimmed = value?.trim()
    return trimmed ? `${label}：${trimmed}` : ''
}

const buildCharacterProfile = (character: StoryCharacterRecord) => {
    if (!character.name.trim()) return ''
    return [`【${character.name.trim()}】`, character.brief_description?.trim() || '']
        .filter(Boolean)
        .join('\n')
}

const buildNarratorPayload = (story: StoryRecord, cast: StoryCharacterRecord[]) => {
    const castText = cast.map(buildCharacterProfile).filter(Boolean).join('\n\n')
    const storyInfo = [
        `故事名称：${story.name}`,
        formatLabeledValue('故事简介', story.description),
        story.world_setting?.trim() ? `世界观：\n${story.world_setting.trim()}` : '',
        story.background?.trim() ? `故事背景：\n${story.background.trim()}` : '',
        castText ? `主要角色：\n${castText}` : '',
    ]
        .filter(Boolean)
        .join('\n\n')

    const narratorDesc = [
        '你是故事作者。玩家给出的每一句话都是这一段的写作方向。',
        '',
        '══ 故事设定 ══',
        storyInfo,
        '',
        STORY_WRITING_RULES,
    ].join('\n')

    const firstMes = [
        `═══ ${story.name} ═══`,
        '',
        story.world_setting?.trim() || story.description?.trim() || '',
        '',
        story.background?.trim() || '',
        '',
        castText ? `主要角色：\n${castText}` : '',
        '',
        '写下第一段的方向。',
    ]
        .filter((line, index, lines) => line !== '' || lines[index - 1] !== '')
        .join('\n')

    return {
        type: 'character' as const,
        name: story.name,
        description: narratorDesc,
        first_mes: firstMes,
        personality: '故事作者',
        scenario: '',
        system_prompt: '',
        mes_example: '',
        post_history_instructions: STORY_LENGTH_REMINDER,
        creator: Characters.NARRATOR_CREATOR,
        creator_notes: getNarratorCreatorNote(story.id),
        character_version: '1.0',
        nsfw: true,
        gender: '',
        age: '',
        height: '',
        weight: '',
        background_story: '',
        personality_traits: '',
        relationships: '',
        nsfw_description: '',
        nsfw_cup_size: '',
        nsfw_hip: '',
        nsfw_sensitive_areas: '',
        nsfw_orientation: '',
    }
}

const findNarratorIdByStory = async (storyId: number) => {
    const link = await database.query.storyChats.findFirst({
        where: eq(storyChats.story_id, storyId),
        orderBy: desc(storyChats.id),
    })

    if (link) {
        const chat = await database.query.chats.findFirst({
            where: eq(chats.id, link.chat_id),
        })
        if (chat?.character_id) return chat.character_id
    }

    const narrator = await database.query.characters.findFirst({
        where: eq(characters.creator_notes, getNarratorCreatorNote(storyId)),
    })

    return narrator?.id
}

export const getStoryIdByChatId = async (chatId: number) => {
    const storyLink = await database.query.storyChats.findFirst({
        where: eq(storyChats.chat_id, chatId),
    })

    if (storyLink) return storyLink.story_id

    const chat = await database.query.chats.findFirst({
        where: eq(chats.id, chatId),
    })

    if (!chat?.character_id) return null

    const narrator = await database.query.characters.findFirst({
        where: eq(characters.id, chat.character_id),
        columns: {
            creator_notes: true,
        },
    })

    return getStoryIdFromCreatorNotes(narrator?.creator_notes)
}

export const ensureStoryChatLink = async (storyId: number, chatId: number) => {
    const existing = await database.query.storyChats.findFirst({
        where: eq(storyChats.chat_id, chatId),
    })

    if (existing) {
        await database
            .update(storyChats)
            .set({ story_id: storyId })
            .where(eq(storyChats.id, existing.id))
        return
    }

    await database.insert(storyChats).values({
        story_id: storyId,
        chat_id: chatId,
    })
}

export const syncStoryNarrator = async (storyId: number) => {
    const story = (await database.query.stories.findFirst({
        where: eq(stories.id, storyId),
    })) as StoryRecord | undefined

    if (!story) {
        Logger.warn(`Story ${storyId} not found while syncing narrator`)
        return null
    }

    const cast = (await database.query.storyCharacters.findMany({
        where: eq(storyCharacters.story_id, storyId),
        orderBy: asc(storyCharacters.id),
    })) as StoryCharacterRecord[]

    const narratorPayload = buildNarratorPayload(story, cast)
    const narratorId = await findNarratorIdByStory(storyId)

    if (narratorId) {
        await database
            .update(characters)
            .set({
                ...narratorPayload,
                last_modified: Date.now(),
            })
            .where(eq(characters.id, narratorId))

        if (Characters.useCharacterStore.getState().id === narratorId) {
            await Characters.useCharacterStore.getState().setCard(narratorId)
        }

        return narratorId
    }

    const [createdNarrator] = await database
        .insert(characters)
        .values(narratorPayload)
        .returning({ id: characters.id })

    return createdNarrator?.id ?? null
}
