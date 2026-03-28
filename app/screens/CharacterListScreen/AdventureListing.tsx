import PersonaSelectModal from '@components/views/PersonaSelectModal'
import PopupMenu from '@components/views/PopupMenu'
import Alert from '@components/views/Alert'
import { db as database } from '@db'
import { ensureAdventureChatLink, syncAdventureNarrator } from '@lib/state/Adventure'
import { Characters } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { getFriendlyTimeStamp } from '@lib/utils/Time'
import { adventures, adventureChats } from 'db/schema'
import { eq } from 'drizzle-orm'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import { setCurrentAdventureId } from '../AdventureEditorScreen'

type AdventureInfo = {
    id: number
    name: string
    description: string
    scenario: string
    system_prompt: string
    image_id: number | null
    last_modified: number | null
}

type AdventureListingProps = {
    adventure: AdventureInfo
    nowLoading: boolean
    setNowLoading: (b: boolean) => void
}

const AdventureListing: React.FC<AdventureListingProps> = ({
    adventure,
    nowLoading,
    setNowLoading,
}) => {
    const router = useRouter()
    const { color, spacing, borderRadius } = Theme.useTheme()
    const styles = useStyles()
    const [showPersonaSelect, setShowPersonaSelect] = useState(false)

    const { setCurrentCard } = Characters.useCharacterStore(
        useShallow((state) => ({
            setCurrentCard: state.setCard,
        }))
    )

    const { setCard: setUserCard } = Characters.useUserStore(
        useShallow((state) => ({
            setCard: state.setCard,
        }))
    )

    const { loadChat } = Chats.useChat()

    const handleTap = () => {
        if (nowLoading) return
        setShowPersonaSelect(true)
    }

    const enterGame = async (userId?: number) => {
        if (nowLoading) return

        try {
            setNowLoading(true)

            if (userId && userId > 0) {
                await setUserCard(userId)
            }

            const narratorId = await syncAdventureNarrator(adventure.id)
            if (!narratorId) {
                Logger.errorToast('无法同步游戏叙述者')
                setNowLoading(false)
                return
            }

            await setCurrentCard(narratorId)

            const existingLink = await database.query.adventureChats.findFirst({
                where: eq(adventureChats.adventure_id, adventure.id),
            })

            let chatId: number | undefined
            if (existingLink) {
                chatId = existingLink.chat_id
            } else {
                chatId = await Chats.db.mutate.createChat(narratorId)
                if (chatId) {
                    await ensureAdventureChatLink(adventure.id, chatId, userId ?? null)
                }
            }

            if (!chatId) {
                Logger.errorToast('创建游戏对话失败')
                setNowLoading(false)
                return
            }

            await loadChat(chatId)
            setNowLoading(false)
            router.push('/screens/ChatScreen')
        } catch (error) {
            Logger.errorToast(`无法加载游戏: ${error}`)
            setNowLoading(false)
        }
    }

    const handleEdit = (menuRef: any) => {
        setCurrentAdventureId(adventure.id)
        menuRef.current?.close()
        router.push('/screens/AdventureEditorScreen')
    }

    const handleDelete = (menuRef: any) => {
        Alert.alert({
            title: '删除游戏',
            description: `确定要删除「${adventure.name}」？此操作无法撤销。`,
            buttons: [
                { label: '取消' },
                {
                    label: '删除',
                    onPress: async () => {
                        await database.delete(adventures).where(eq(adventures.id, adventure.id))
                        menuRef.current?.close()
                    },
                    type: 'warning',
                },
            ],
        })
    }

    return (
        <View style={styles.container}>
            <PersonaSelectModal
                visible={showPersonaSelect}
                onClose={() => setShowPersonaSelect(false)}
                onSelect={(userId) => {
                    setShowPersonaSelect(false)
                    enterGame(userId)
                }}
            />
            <TouchableOpacity
                style={styles.touchable}
                disabled={nowLoading}
                onPress={handleTap}>
                <View
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: borderRadius.l,
                        margin: spacing.sm,
                        backgroundColor: color.primary._200,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                    <Text style={{ fontSize: 24 }}>🎃</Text>
                </View>

                <View style={{ flex: 1, paddingLeft: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={styles.name} numberOfLines={2}>
                            {adventure.name}
                        </Text>
                        <Text style={styles.timestamp}>
                            {getFriendlyTimeStamp(adventure.last_modified ?? 0)}
                        </Text>
                    </View>
                    {adventure.description ? (
                        <Text numberOfLines={2} ellipsizeMode="tail" style={styles.description}>
                            {adventure.description}
                        </Text>
                    ) : null}
                </View>
            </TouchableOpacity>
            <PopupMenu
                style={{ paddingHorizontal: 8 }}
                disabled={nowLoading}
                icon="edit"
                options={[
                    { label: '编辑', icon: 'edit' as const, onPress: handleEdit },
                    {
                        label: '删除',
                        icon: 'delete' as const,
                        onPress: handleDelete,
                        warning: true,
                    },
                ]}
            />
        </View>
    )
}

export default AdventureListing

const useStyles = () => {
    const { color, spacing, borderRadius, fontSize } = Theme.useTheme()

    return StyleSheet.create({
        container: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: borderRadius.m,
            flex: 1,
        },
        touchable: {
            flexDirection: 'row',
            flex: 1,
            padding: spacing.l,
        },
        name: {
            flex: 1,
            fontSize: fontSize.l,
            fontWeight: '500',
            color: color.text._100,
        },
        timestamp: {
            fontSize: fontSize.s,
            color: color.text._400,
        },
        description: {
            marginTop: spacing.s,
            color: color.text._500,
        },
    })
}
