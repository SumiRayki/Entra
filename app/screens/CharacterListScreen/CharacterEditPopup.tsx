import Alert from '@components/views/Alert'
import PopupMenu, { MenuRef } from '@components/views/PopupMenu'
import { CharInfo, Characters } from '@lib/state/Characters'
import { useRouter } from 'expo-router'

const isSystemCard = (info: CharInfo) =>
    info.creator_notes === Characters.SYSTEM_CARD_MARKER

type CharacterEditPopupProps = {
    characterInfo: CharInfo
    nowLoading: boolean
    setNowLoading: (b: boolean) => void
}

const CharacterEditPopup: React.FC<CharacterEditPopupProps> = ({
    characterInfo,
    setNowLoading,
    nowLoading,
}) => {
    const router = useRouter()

    const setCurrentCard = Characters.useCharacterStore((state) => state.setCard)

    const deleteCard = (menuRef: MenuRef) => {
        Alert.alert({
            title: '删除角色',
            description: `确定要删除 '${characterInfo.name}'？此操作无法撤销。`,
            buttons: [
                {
                    label: '取消',
                },
                {
                    label: '删除角色',
                    onPress: async () => {
                        Characters.db.mutate.deleteCard(characterInfo.id ?? -1)
                    },
                    type: 'warning',
                },
            ],
        })
    }

    const cloneCard = (menuRef: MenuRef) => {
        Alert.alert({
            title: '克隆角色',
            description: `确定要克隆 '${characterInfo.name}'？`,
            buttons: [
                {
                    label: '取消',
                },
                {
                    label: '克隆角色',
                    onPress: async () => {
                        setNowLoading(true)
                        await Characters.db.mutate.duplicateCard(characterInfo.id)
                        menuRef.current?.close()
                        setNowLoading(false)
                    },
                },
            ],
        })
    }

    const editCharacter = async (menuRef: MenuRef) => {
        if (nowLoading) return
        setNowLoading(true)
        await setCurrentCard(characterInfo.id)
        setNowLoading(false)
        menuRef.current?.close()
        router.push('/screens/CharacterEditorScreen')
    }

    const options = isSystemCard(characterInfo)
        ? [{ label: '编辑', icon: 'edit' as const, onPress: editCharacter }]
        : [
              { label: '编辑', icon: 'edit' as const, onPress: editCharacter },
              { label: '克隆', icon: 'copy1' as const, onPress: cloneCard },
              { label: '删除', icon: 'delete' as const, onPress: deleteCard, warning: true },
          ]

    return (
        <PopupMenu
            style={{ paddingHorizontal: 8 }}
            disabled={nowLoading}
            icon="edit"
            options={options}
        />
    )
}

export default CharacterEditPopup
