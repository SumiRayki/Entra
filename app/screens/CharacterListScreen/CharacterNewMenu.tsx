import PopupMenu from '@components/views/PopupMenu'
import TextBoxModal from '@components/views/TextBoxModal'
import { Characters } from '@lib/state/Characters'
import { Logger } from '@lib/state/Logger'
import { setCurrentAdventureId } from '@screens/AdventureEditorScreen'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

type CharacterNewMenuProps = {
    nowLoading: boolean
    setNowLoading: (b: boolean) => void
}

const CharacterNewMenu: React.FC<CharacterNewMenuProps> = ({ nowLoading, setNowLoading }) => {
    const { setCurrentCard } = Characters.useCharacterStore(
        useShallow((state) => ({
            setCurrentCard: state.setCard,
            id: state.id,
        }))
    )

    const router = useRouter()
    const [showNewChar, setShowNewChar] = useState<boolean>(false)

    const handleCreateCharacter = async (text: string) => {
        if (!text) {
            Logger.errorToast('名称不能为空！')
            return
        }
        Characters.db.mutate.createCard(text).then(async (id) => {
            if (nowLoading) return
            setNowLoading(true)
            await setCurrentCard(id)
            setNowLoading(false)
            router.push('/screens/CharacterEditorScreen')
        })
    }

    const handleCreateAdventure = () => {
        setCurrentAdventureId(null)
        router.push('/screens/AdventureEditorScreen')
    }

    return (
        <>
            <TextBoxModal
                booleans={[showNewChar, setShowNewChar]}
                title="创建新角色"
                onConfirm={handleCreateCharacter}
                placeholder="名称..."
            />

            <PopupMenu
                icon="adduser"
                options={[
                    {
                        label: '从文件导入',
                        onPress: (menu) => {
                            Characters.importCharacter()
                            menu.current?.close()
                        },
                        icon: 'upload',
                    },
                    {
                        label: '创建角色',
                        onPress: (menu) => {
                            setShowNewChar(true)
                            menu.current?.close()
                        },
                        icon: 'edit',
                    },
                    {
                        label: '创建游戏',
                        onPress: (menu) => {
                            menu.current?.close()
                            handleCreateAdventure()
                        },
                        icon: 'rocket1',
                    },
                ]}
                placement="bottom"
            />
        </>
    )
}

export default CharacterNewMenu
