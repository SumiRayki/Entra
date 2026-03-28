import { db as database } from '@db'
import { Characters } from '@lib/state/Characters'
import { Logger } from '@lib/state/Logger'
import { adventureCharacters, adventureChats, adventures, characters, chats } from 'db/schema'
import { desc, eq } from 'drizzle-orm'

const ADVENTURE_NARRATOR_PREFIX = '__ADVENTURE_NARRATOR__:'

type AdventureRecord = {
    id: number
    name: string
    description: string
    scenario: string
    system_prompt: string
    image_id: number | null
    last_modified: number | null
}

type AdventureCharacterRecord = {
    id: number
    adventure_id: number
    character_id: number | null
    role: 'npc' | 'supporting'
    name: string
    brief_description: string
}

type CharacterRecord = {
    id: number
    type: 'user' | 'character'
    name: string
    description: string
    first_mes: string
    mes_example: string
    creator_notes: string
    system_prompt: string
    scenario: string
    personality: string
    post_history_instructions: string
    image_id: number
    creator: string
    character_version: string
    last_modified: number | null
    background_image: number | null
    gender: string
    age: string
    height: string
    weight: string
    background_story: string
    personality_traits: string
    relationships: string
    nsfw: boolean
    nsfw_description: string
    nsfw_cup_size: string
    nsfw_hip: string
    nsfw_sensitive_areas: string
    nsfw_orientation: string
}

const getNarratorCreatorNote = (adventureId: number) => `${ADVENTURE_NARRATOR_PREFIX}${adventureId}`

export const getAdventureIdFromCreatorNotes = (creatorNotes?: string | null) => {
    if (!creatorNotes?.startsWith(ADVENTURE_NARRATOR_PREFIX)) return null
    const parsed = Number(creatorNotes.slice(ADVENTURE_NARRATOR_PREFIX.length))
    return Number.isFinite(parsed) ? parsed : null
}

const formatLabeledValue = (label: string, value?: string | null) => {
    return value?.trim() ? `${label}: ${value.trim()}` : ''
}

const buildLinkedCharacterProfile = (charCard: CharacterRecord) => {
    return [
        `[${charCard.name}]`,
        formatLabeledValue('Description', charCard.description),
        formatLabeledValue('Personality', charCard.personality),
        formatLabeledValue('Character scenario', charCard.scenario),
        formatLabeledValue('Gender', charCard.gender),
        formatLabeledValue('Age', charCard.age),
        formatLabeledValue('Height', charCard.height),
        formatLabeledValue('Weight', charCard.weight),
        formatLabeledValue('Traits', charCard.personality_traits),
        formatLabeledValue('Backstory', charCard.background_story),
        formatLabeledValue('Relationships', charCard.relationships),
        formatLabeledValue('Dialogue examples', charCard.mes_example),
        formatLabeledValue('Greeting', charCard.first_mes),
        formatLabeledValue('Character prompt', charCard.system_prompt),
        charCard.nsfw ? 'NSFW: enabled' : '',
        charCard.nsfw ? formatLabeledValue('NSFW description', charCard.nsfw_description) : '',
        charCard.nsfw ? formatLabeledValue('Cup size', charCard.nsfw_cup_size) : '',
        charCard.nsfw ? formatLabeledValue('Hip', charCard.nsfw_hip) : '',
        charCard.nsfw ? formatLabeledValue('Sensitive areas', charCard.nsfw_sensitive_areas) : '',
        charCard.nsfw ? formatLabeledValue('Orientation', charCard.nsfw_orientation) : '',
    ]
        .filter(Boolean)
        .join('\n')
}

const buildSupportingCharacterProfile = (npc: AdventureCharacterRecord) => {
    if (!npc.name.trim()) return ''

    return [`[${npc.name.trim()}]`, formatLabeledValue('Summary', npc.brief_description)]
        .filter(Boolean)
        .join('\n')
}

const buildNarratorPayload = async (
    adventure: AdventureRecord,
    npcs: AdventureCharacterRecord[]
) => {
    const characterProfiles: string[] = []

    for (const npc of npcs) {
        if (npc.character_id) {
            const charCard = (await database.query.characters.findFirst({
                where: eq(characters.id, npc.character_id),
            })) as CharacterRecord | undefined

            if (charCard) {
                characterProfiles.push(buildLinkedCharacterProfile(charCard))
            }
            continue
        }

        const supportingProfile = buildSupportingCharacterProfile(npc)
        if (supportingProfile) {
            characterProfiles.push(supportingProfile)
        }
    }

    const description = [
        `Adventure: ${adventure.name}`,
        formatLabeledValue('Summary', adventure.description),
        characterProfiles.length > 0 ? `Cast:\n${characterProfiles.join('\n\n')}` : '',
    ]
        .filter(Boolean)
        .join('\n\n')

    const scenario = [
        formatLabeledValue('World and backstory', adventure.scenario),
        adventure.system_prompt?.trim()
            ? `Additional game setup:\n${adventure.system_prompt.trim()}`
            : '',
    ]
        .filter(Boolean)
        .join('\n\n')

    const systemPrompt = [
        'You are the narrator and game master for an interactive story adventure.',
        'You are not a fixed character. You describe the world, advance the plot, and roleplay every NPC.',
        'You must fully obey the provided world setup, character sheets, relationships, NSFW settings, and extra game instructions.',
        'Keep continuity with prior events. Do not drop or simplify character details that were provided to you.',
        'On the opening turn, introduce the setting and conflict naturally.',
        'After each narration beat, provide exactly 3 numbered choices in the form 1. / 2. / 3.',
        'Choice 3 must always be the more intimate, provocative, or NSFW route when the scene allows it.',
        'If the player replies with something other than 1, 2, or 3, ask them to choose from the listed options.',
        'NPC dialogue should be woven into narration and quoted naturally.',
        adventure.system_prompt?.trim()
            ? `Extra GM instructions:\n${adventure.system_prompt.trim()}`
            : '',
    ]
        .filter(Boolean)
        .join('\n\n')

    const firstMes = [
        `=== ${adventure.name} ===`,
        '',
        adventure.scenario?.trim() || adventure.description?.trim() || 'Your adventure begins now.',
        '',
        'Send any message to begin the game.',
    ].join('\n')

    return {
        type: 'character' as const,
        name: adventure.name,
        description,
        first_mes: firstMes,
        personality: 'Omniscient narrator, game master, plot controller',
        scenario,
        system_prompt: systemPrompt,
        mes_example: '',
        post_history_instructions: '',
        creator: Characters.NARRATOR_CREATOR,
        creator_notes: getNarratorCreatorNote(adventure.id),
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

const findNarratorIdByAdventure = async (adventureId: number) => {
    const link = await database.query.adventureChats.findFirst({
        where: eq(adventureChats.adventure_id, adventureId),
        orderBy: desc(adventureChats.id),
    })

    if (link) {
        const chat = await database.query.chats.findFirst({
            where: eq(chats.id, link.chat_id),
        })
        if (chat?.character_id) return chat.character_id
    }

    const narrator = await database.query.characters.findFirst({
        where: eq(characters.creator_notes, getNarratorCreatorNote(adventureId)),
    })

    return narrator?.id
}

export const getAdventureIdByChatId = async (chatId: number) => {
    const adventureLink = await database.query.adventureChats.findFirst({
        where: eq(adventureChats.chat_id, chatId),
    })

    if (adventureLink) return adventureLink.adventure_id

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

    return getAdventureIdFromCreatorNotes(narrator?.creator_notes)
}

export const ensureAdventureChatLink = async (
    adventureId: number,
    chatId: number,
    activeProtagonistId?: number | null
) => {
    const existing = await database.query.adventureChats.findFirst({
        where: eq(adventureChats.chat_id, chatId),
    })

    if (existing) {
        await database
            .update(adventureChats)
            .set({
                adventure_id: adventureId,
                active_protagonist_id: activeProtagonistId ?? existing.active_protagonist_id,
            })
            .where(eq(adventureChats.id, existing.id))
        return
    }

    await database.insert(adventureChats).values({
        adventure_id: adventureId,
        chat_id: chatId,
        active_protagonist_id: activeProtagonistId ?? null,
    })
}

export const syncAdventureNarrator = async (adventureId: number) => {
    const adventure = (await database.query.adventures.findFirst({
        where: eq(adventures.id, adventureId),
    })) as AdventureRecord | undefined

    if (!adventure) {
        Logger.warn(`Adventure ${adventureId} not found while syncing narrator`)
        return null
    }

    const npcs = (await database.query.adventureCharacters.findMany({
        where: eq(adventureCharacters.adventure_id, adventureId),
        orderBy: desc(adventureCharacters.id),
    })) as AdventureCharacterRecord[]

    const narratorPayload = await buildNarratorPayload(adventure, npcs)
    const narratorId = await findNarratorIdByAdventure(adventureId)

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
