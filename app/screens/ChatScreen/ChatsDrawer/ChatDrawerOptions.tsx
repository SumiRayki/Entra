import Alert from '@components/views/Alert'
import PopupMenu, { MenuRef } from '@components/views/PopupMenu'
import TextBoxModal from '@components/views/TextBoxModal'
import { Characters } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import { Logger } from '@lib/state/Logger'
import { saveStringToDownload } from '@lib/utils/File'
import React, { useState } from 'react'
import { View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

type ChatEditPopupProps = {
    item: Awaited<ReturnType<typeof Chats.db.query.chatListQuery>>[0]
}

const ChatEditPopup: React.FC<ChatEditPopupProps> = ({ item }) => {
    const [showRename, setShowRename] = useState<boolean>(false)

    const { charName, charId } = Characters.useCharacterStore(
        useShallow((state) => ({
            charId: state.id,
            charName: state.card?.name ?? 'Unknown',
        }))
    )

    const { userId, userName } = Characters.useUserStore(
        useShallow((state) => ({
            userId: state.id,
            userName: state.card?.name,
        }))
    )

    const { deleteChat, loadChat, chatId, unloadChat } = Chats.useChat()

    const handleDeleteChat = (menuRef: MenuRef) => {
        Alert.alert({
            title: `删除对话`,
            description: `确定要删除 '${item.name}'？此操作无法撤销。`,
            buttons: [
                { label: '取消' },
                {
                    label: '删除对话',
                    onPress: async () => {
                        await deleteChat(item.id)
                        if (charId && chatId === item.id) {
                            const returnedChatId = await Chats.db.query.chatNewestId(charId)
                            const chatId = returnedChatId
                                ? returnedChatId
                                : await Chats.db.mutate.createChat(charId)
                            chatId && (await loadChat(chatId))
                        } else if (item.id === chatId) {
                            Logger.errorToast(`创建默认对话时出错`)
                            unloadChat()
                        }
                        menuRef.current?.close()
                    },
                    type: 'warning',
                },
            ],
        })
    }

    const handleCloneChat = (menuRef: MenuRef) => {
        Alert.alert({
            title: `克隆对话`,
            description: `确定要克隆 '${item.name}'？`,
            buttons: [
                { label: '取消' },
                {
                    label: '克隆对话',
                    onPress: async () => {
                        await Chats.db.mutate.cloneChat(item.id)
                        menuRef.current?.close()
                    },
                },
            ],
        })
    }

    const handleExportChat = async (menuRef: MenuRef) => {
        const name = `Chatlogs-${charName}-${item.id}.json`.replaceAll(' ', '_')
        await saveStringToDownload(JSON.stringify(await Chats.db.query.chat(item.id)), name, 'utf8')
        menuRef.current?.close()
        Logger.infoToast(`文件：${name} 已保存到下载目录！`)
    }

    const handleLinkUser = async () => {
        if (userId === item.user_id) return
        if (!userId) {
            Logger.errorToast('未选择用户')
            return
        }
        await Chats.db.mutate.updateUser(item.id, userId)
        Logger.infoToast(`已关联用户：${userName}`)
    }

    return (
        <View>
            <TextBoxModal
                booleans={[showRename, setShowRename]}
                onConfirm={async (text) => {
                    await Chats.db.mutate.renameChat(item.id, text)
                }}
                textCheck={(text) => text.length === 0}
                defaultValue={item.name}
            />
            <PopupMenu
                icon="edit"
                options={[
                    {
                        label: '重命名',
                        icon: 'edit',
                        onPress: (menuRef) => {
                            setShowRename(true)
                            menuRef.current?.close()
                        },
                    },
                    {
                        label: '导出',
                        icon: 'download',
                        onPress: (menuRef) => handleExportChat(menuRef),
                    },
                    {
                        label: '克隆',
                        icon: 'copy1',
                        onPress: handleCloneChat,
                    },
                    {
                        label: '关联用户',
                        icon: 'user',
                        onPress: handleLinkUser,
                    },
                    {
                        label: '删除',
                        icon: 'delete',
                        warning: true,
                        onPress: handleDeleteChat,
                    },
                ]}
            />
        </View>
    )
}

export default ChatEditPopup
