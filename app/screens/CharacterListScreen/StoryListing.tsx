import PopupMenu from '@components/views/PopupMenu'
import Alert from '@components/views/Alert'
import { db as database } from '@db'
import { Characters } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import { Logger } from '@lib/state/Logger'
import { ensureStoryChatLink, syncStoryNarrator } from '@lib/state/Story'
import { Theme } from '@lib/theme/ThemeManager'
import { getFriendlyTimeStamp } from '@lib/utils/Time'
import { stories, storyChats } from 'db/schema'
import { desc, eq } from 'drizzle-orm'
import { useRouter } from 'expo-router'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import { setCurrentStoryId } from '../StoryEditorScreen'

type StoryInfo = {
    id: number
    name: string
    description: string
    last_modified: number | null
}

type StoryListingProps = {
    story: StoryInfo
    nowLoading: boolean
    setNowLoading: (b: boolean) => void
}

const StoryListing: React.FC<StoryListingProps> = ({ story, nowLoading, setNowLoading }) => {
    const router = useRouter()
    const { color, spacing, borderRadius } = Theme.useTheme()
    const styles = useStyles()

    const { setCurrentCard } = Characters.useCharacterStore(
        useShallow((state) => ({
            setCurrentCard: state.setCard,
        }))
    )
    const { loadChat } = Chats.useChat()

    const enterStory = async () => {
        if (nowLoading) return
        try {
            setNowLoading(true)
            const narratorId = await syncStoryNarrator(story.id)
            if (!narratorId) {
                Logger.errorToast('无法同步故事作者')
                setNowLoading(false)
                return
            }

            await setCurrentCard(narratorId)

            const existingLink = await database.query.storyChats.findFirst({
                where: eq(storyChats.story_id, story.id),
                orderBy: desc(storyChats.id),
            })

            let chatId: number | undefined
            if (existingLink) {
                chatId = existingLink.chat_id
            } else {
                chatId = await Chats.db.mutate.createChat(narratorId)
                if (chatId) await ensureStoryChatLink(story.id, chatId)
            }

            if (!chatId) {
                Logger.errorToast('创建故事对话失败')
                setNowLoading(false)
                return
            }

            await loadChat(chatId)
            setNowLoading(false)
            router.push('/screens/ChatScreen')
        } catch (error) {
            Logger.errorToast(`无法加载故事: ${error}`)
            setNowLoading(false)
        }
    }

    const handleEdit = (menuRef: any) => {
        setCurrentStoryId(story.id)
        menuRef.current?.close()
        router.push('/screens/StoryEditorScreen')
    }

    const handleDelete = (menuRef: any) => {
        Alert.alert({
            title: '删除故事',
            description: `确定要删除「${story.name}」？此操作无法撤销。`,
            buttons: [
                { label: '取消' },
                {
                    label: '删除',
                    onPress: async () => {
                        await database.delete(stories).where(eq(stories.id, story.id))
                        menuRef.current?.close()
                    },
                    type: 'warning',
                },
            ],
        })
    }

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.touchable} disabled={nowLoading} onPress={enterStory}>
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
                    <Text style={{ fontSize: 24 }}>📖</Text>
                </View>
                <View style={{ flex: 1, paddingLeft: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={styles.name} numberOfLines={2}>
                            {story.name}
                        </Text>
                        <Text style={styles.timestamp}>
                            {getFriendlyTimeStamp(story.last_modified ?? 0)}
                        </Text>
                    </View>
                    {story.description ? (
                        <Text numberOfLines={2} ellipsizeMode="tail" style={styles.description}>
                            {story.description}
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

export default StoryListing

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
