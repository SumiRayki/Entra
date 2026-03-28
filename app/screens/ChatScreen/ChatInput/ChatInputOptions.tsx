import Drawer from '@components/views/Drawer'
import PopupMenu from '@components/views/PopupMenu'
import { db as database } from '@db'
import { Ionicons } from '@expo/vector-icons'
import { Chats } from '@lib/state/Chat'
import { Theme } from '@lib/theme/ThemeManager'
import { setCurrentAdventureId } from '@screens/AdventureEditorScreen'
import { adventureChats } from 'db/schema'
import { eq } from 'drizzle-orm'
import { useRouter } from 'expo-router'
import { StyleSheet } from 'react-native'

const ChatOptions = () => {
    const router = useRouter()
    const styles = useStyles()
    const { chatId } = Chats.useChat()

    const setShow = Drawer.useDrawerStore((state) => state.setShow)

    const setShowChat = (b: boolean) => {
        setShow(Drawer.ID.CHATLIST, b)
    }

    const openEditor = async () => {
        if (!chatId) {
            router.push('/screens/CharacterEditorScreen')
            return
        }

        const adventureLink = await database.query.adventureChats.findFirst({
            where: eq(adventureChats.chat_id, chatId),
        })

        if (adventureLink) {
            setCurrentAdventureId(adventureLink.adventure_id)
            router.push('/screens/AdventureEditorScreen')
            return
        }

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
