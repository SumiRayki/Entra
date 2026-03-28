import Drawer from '@components/views/Drawer'
import PopupMenu from '@components/views/PopupMenu'
import { Ionicons } from '@expo/vector-icons'
import { getAdventureIdByChatId, getAdventureIdFromCreatorNotes } from '@lib/state/Adventure'
import { Characters } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import { Theme } from '@lib/theme/ThemeManager'
import { setCurrentAdventureId } from '@screens/AdventureEditorScreen'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { StyleSheet } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

const ChatOptions = () => {
    const router = useRouter()
    const styles = useStyles()
    const { chatId } = Chats.useChat()
    const [adventureId, setAdventureId] = useState<number | null>(null)
    const { creatorNotes, charId } = Characters.useCharacterStore(
        useShallow((state) => ({
            creatorNotes: state.card?.creator_notes,
            charId: state.id,
        }))
    )

    const setShow = Drawer.useDrawerStore((state) => state.setShow)

    const setShowChat = (b: boolean) => {
        setShow(Drawer.ID.CHATLIST, b)
    }

    useEffect(() => {
        let cancelled = false

        const loadAdventureId = async () => {
            const linkedAdventureId = chatId ? await getAdventureIdByChatId(chatId) : null
            const inferredAdventureId = getAdventureIdFromCreatorNotes(creatorNotes)

            if (!cancelled) {
                setAdventureId(linkedAdventureId ?? inferredAdventureId)
            }
        }

        loadAdventureId()

        return () => {
            cancelled = true
        }
    }, [chatId, creatorNotes])

    const openEditor = async () => {
        if (adventureId) {
            setCurrentAdventureId(adventureId)
            router.push('/screens/AdventureEditorScreen')
            return
        }

        router.push('/screens/CharacterEditorScreen')
    }

    const openNarratorViewer = () => {
        if (!charId) return
        router.push('/screens/CharacterEditorScreen')
    }

    return (
        <PopupMenu
            options={[
                {
                    onPress: (m) => {
                        m.current?.close()
                        router.back()
                    },
                    label: '主菜单',
                    icon: 'back',
                },
                {
                    onPress: async (m) => {
                        m.current?.close()
                        await openEditor()
                    },
                    label: '编辑角色',
                    icon: 'edit',
                },
                ...(adventureId
                    ? [
                          {
                              onPress: (m: any) => {
                                  m.current?.close()
                                  openNarratorViewer()
                              },
                              label: '查看叙述者',
                              icon: 'search1',
                          },
                      ]
                    : []),
                {
                    onPress: (m) => {
                        setShowChat(true)
                        m.current?.close()
                    },
                    label: '聊天记录',
                    icon: 'paperclip',
                },
            ]}
            placement="top">
            <Ionicons name="caret-up" style={styles.optionsButton} size={24} />
        </PopupMenu>
    )
}

export default ChatOptions

const useStyles = () => {
    const { color } = Theme.useTheme()

    return StyleSheet.create({
        optionsButton: {
            color: color.text._500,
            padding: 4,
            backgroundColor: color.neutral._200,
            borderRadius: 16,
        },
    })
}
