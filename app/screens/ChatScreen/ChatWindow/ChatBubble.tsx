import ThemedButton from '@components/buttons/ThemedButton'
import { AppSettings } from '@lib/constants/GlobalValues'
import { Characters } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { Pressable, Text, View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import { useShallow } from 'zustand/react/shallow'
import { db as database } from '@db'
import { adventures, adventureCharacters } from 'db/schema'

import ChatQuickActions, { useChatActionsState } from './ChatQuickActions'
import ChatText from './ChatText'
import ChatTextLast from './ChatTextLast'
import { useChatEditorStore } from './ChatEditor'
import ChatSwipes from './ChatSwipes'

type CreationType = 'character' | 'user' | 'adventure' | null

const getField = (text: string, key: string) => {
    const re = new RegExp(`【${key}】[：:]?\\s*([\\s\\S]*?)(?=【|$)`)
    const m = text.match(re)
    return m ? m[1].trim() : ''
}

const detectCreationType = (text: string): CreationType => {
    if (getField(text, '游戏名')) return 'adventure'
    if (getField(text, '类型') === '用户角色' || getField(text, '角色类型') === '用户角色')
        return 'user'
    if (getField(text, '角色名')) return 'character'
    return null
}

const parseCharacterCard = (text: string) => {
    const get = (key: string) => getField(text, key)
    const name = get('角色名')
    if (!name) return null
    return {
        name,
        gender: get('性别'),
        age: get('年龄'),
        height: get('身高'),
        weight: get('体重'),
        personality_traits: get('性格特点'),
        background_story: get('背景故事'),
        relationships: get('人物关系'),
        description: get('外貌描述'),
        first_mes: get('首条消息').replace(/^[「"']|[」"']$/g, ''),
        nsfw: get('NSFW').startsWith('是'),
        nsfw_description: get('NSFW描述'),
        nsfw_cup_size: get('罩杯'),
        nsfw_hip: get('臀围'),
        nsfw_sensitive_areas: get('敏感部位'),
        nsfw_orientation: get('性取向'),
    }
}

const parseUserCard = (text: string) => {
    const get = (key: string) => getField(text, key)
    const name = get('角色名')
    if (!name) return null
    return {
        name,
        gender: get('性别'),
        age: get('年龄'),
        height: get('身高'),
        weight: get('体重'),
        personality_traits: get('性格特点'),
        background_story: get('背景故事'),
        relationships: get('人物关系'),
        description: get('外貌描述'),
        nsfw: get('NSFW').startsWith('是'),
        nsfw_description: get('NSFW描述'),
        nsfw_cup_size: get('罩杯'),
        nsfw_hip: get('臀围'),
        nsfw_sensitive_areas: get('敏感部位'),
        nsfw_orientation: get('性取向'),
    }
}

const parseSupportingCharacters = (supportingRaw: string) => {
    const supporting: { name: string; brief_description: string }[] = []
    let current: { name: string; brief_description: string } | null = null

    const pushCurrent = () => {
        if (!current?.name.trim() || !current.brief_description.trim()) return

        supporting.push({
            name: current.name.trim(),
            brief_description: current.brief_description.trim(),
        })
        current = null
    }

    const lines = supportingRaw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

    for (const line of lines) {
        const normalized = line
            .replace(/^[•●·▪◦○*-]\s*/, '')
            .replace(/^\d+[\.\)、]\s*/, '')
            .trim()

        const match = normalized.match(/^【?([^【】:：]+)】?\s*[:：]\s*(.+)$/)
        if (match) {
            pushCurrent()
            current = {
                name: match[1].trim(),
                brief_description: match[2].trim(),
            }
            continue
        }

        if (!current) {
            current = {
                name: normalized.replace(/^【|】$/g, '').trim(),
                brief_description: '',
            }
            continue
        }

        current.brief_description = current.brief_description
            ? `${current.brief_description}\n${normalized}`
            : normalized
    }

    pushCurrent()
    return supporting
}

const parseAdventure = (text: string) => {
    const get = (key: string) => getField(text, key)
    const name = get('游戏名')
    if (!name) return null
    const supportingRaw = get('配角')
    return {
        name,
        description: get('游戏简介'),
        scenario: get('背景故事'),
        system_prompt: get('系统提示词'),
        supporting: supportingRaw ? parseSupportingCharacters(supportingRaw) : [],
    }
}

const handleCreateCharacter = async (text: string) => {
    const card = parseCharacterCard(text)
    if (!card) {
        Logger.errorToast('无法解析角色信息')
        return
    }
    try {
        const id = await Characters.db.mutate.createCard(card.name, 'character')
        const fullCard = await Characters.db.query.card(id)
        if (fullCard) {
            await Characters.db.mutate.updateCard(
                { ...fullCard, ...card, personality: card.personality_traits },
                id
            )
        }
        Logger.infoToast(`AI角色「${card.name}」创建成功！`)
    } catch (e) {
        Logger.errorToast('创建角色失败：' + e)
    }
}

const handleCreateUser = async (text: string) => {
    const card = parseUserCard(text)
    if (!card) {
        Logger.errorToast('无法解析用户角色信息')
        return
    }
    try {
        const id = await Characters.db.mutate.createCard(card.name, 'user')
        const fullCard = await Characters.db.query.card(id)
        if (fullCard) {
            await Characters.db.mutate.updateCard(
                { ...fullCard, ...card, personality: card.personality_traits },
                id
            )
        }
        Logger.infoToast(`用户角色「${card.name}」创建成功！`)
    } catch (e) {
        Logger.errorToast('创建用户角色失败：' + e)
    }
}

const handleCreateAdventure = async (text: string) => {
    const adv = parseAdventure(text)
    if (!adv) {
        Logger.errorToast('无法解析游戏信息')
        return
    }
    try {
        const [result] = await database
            .insert(adventures)
            .values({
                name: adv.name,
                description: adv.description,
                scenario: adv.scenario,
                system_prompt: adv.system_prompt,
            })
            .returning({ id: adventures.id })
        if (adv.supporting.length > 0) {
            await database.insert(adventureCharacters).values(
                adv.supporting.map((c) => ({
                    adventure_id: result.id,
                    character_id: null,
                    role: 'supporting' as const,
                    name: c.name,
                    brief_description: c.brief_description,
                }))
            )
        }
        Logger.infoToast(`游戏「${adv.name}」创建成功！`)
    } catch (e) {
        Logger.errorToast('创建游戏失败：' + e)
    }
}

const getCreationButtonInfo = (type: CreationType) => {
    switch (type) {
        case 'character':
            return { label: '确认创建AI角色', handler: handleCreateCharacter }
        case 'user':
            return { label: '确认创建用户角色', handler: handleCreateUser }
        case 'adventure':
            return { label: '确认创建游戏', handler: handleCreateAdventure }
        default:
            return null
    }
}

type ChatTextProps = {
    index: number
    nowGenerating: boolean
    isLastMessage: boolean
    isGreeting: boolean
}

const ChatBubble: React.FC<ChatTextProps> = ({
    index,
    nowGenerating,
    isLastMessage,
    isGreeting,
}) => {
    const message = Chats.useEntryData(index)
    const [showTPS, _] = useMMKVBoolean(AppSettings.ShowTokenPerSecond)
    const { color, spacing, borderRadius, fontSize } = Theme.useTheme()

    const { activeIndex, setShowOptions } = useChatActionsState(
        useShallow((state) => ({
            setShowOptions: state.setActiveIndex,
            activeIndex: state.activeIndex,
        }))
    )

    const showEditor = useChatEditorStore((state) => state.show)
    const handleEnableEdit = () => {
        if (!nowGenerating) showEditor(index)
    }

    const isCreatorMaster = Characters.isSystemCard(
        Characters.useCharacterStore.getState().card
    )
    const swipeText = message.swipes?.[message.swipe_id]?.swipe ?? ''
    const creationType = !message.is_user && isCreatorMaster ? detectCreationType(swipeText) : null
    const buttonInfo = getCreationButtonInfo(creationType)

    const hasSwipes = message?.swipes?.length > 1
    const showSwipe = !message.is_user && isLastMessage && (hasSwipes || !isGreeting)
    const timings = message.swipes[message.swipe_id].timings

    return (
        <View>
            <Pressable
                onPress={() => {
                    setShowOptions(activeIndex === index || nowGenerating ? undefined : index)
                }}
                style={{
                    backgroundColor: color.neutral._200,
                    borderColor: color.neutral._200,
                    borderWidth: 1,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.m,
                    minHeight: 40,
                    borderRadius: borderRadius.m,
                    shadowColor: color.shadow,
                    boxShadow: [
                        {
                            offsetX: 1,
                            offsetY: 1,
                            spreadDistance: 2,
                            color: color.shadow,
                            blurRadius: 4,
                        },
                    ],
                }}
                onLongPress={handleEnableEdit}>
                {isLastMessage ? (
                    <ChatTextLast nowGenerating={nowGenerating} index={index} />
                ) : (
                    <ChatText nowGenerating={nowGenerating} index={index} />
                )}
                <View
                    style={{
                        flexDirection: 'row',
                    }}>
                    {false && timings && (
                        <Text
                            style={{
                                color: color.text._500,
                                fontWeight: '300',
                                textAlign: 'right',
                                fontSize: fontSize.s,
                            }}>
                            {`Prompt: ${getFiniteValue(timings?.prompt_per_second ?? null)} t/s`}
                            {`   Text Gen: ${getFiniteValue(timings?.predicted_per_second ?? null)} t/s`}
                        </Text>
                    )}

                    <ChatQuickActions
                        nowGenerating={nowGenerating}
                        isLastMessage={isLastMessage}
                        index={index}
                    />
                </View>
                {buttonInfo && (
                    <ThemedButton
                        label={buttonInfo.label}
                        variant="primary"
                        iconName="plus"
                        iconSize={18}
                        buttonStyle={{ marginTop: spacing.m }}
                        onPress={() => buttonInfo.handler(swipeText)}
                    />
                )}
            </Pressable>
            {showSwipe && (
                <ChatSwipes index={index} nowGenerating={nowGenerating} isGreeting={isGreeting} />
            )}
        </View>
    )
}

const getFiniteValue = (value: number | null) => {
    if (!value || !isFinite(value)) return (0).toFixed(2)
    return value.toFixed(2)
}

export default ChatBubble
