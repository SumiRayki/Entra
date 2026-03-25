import ThemedButton from '@components/buttons/ThemedButton'
import ThemedSwitch from '@components/input/ThemedSwitch'
import ThemedTextInput from '@components/input/ThemedTextInput'
import SectionTitle from '@components/text/SectionTitle'
import Alert from '@components/views/Alert'
import Avatar from '@components/views/Avatar'
import PopupMenu from '@components/views/PopupMenu'
import { AntDesign } from '@expo/vector-icons'
import { useAvatarViewerStore } from '@lib/state/AvatarViewer'
import { CharacterCardData, Characters } from '@lib/state/Characters'
import { Theme } from '@lib/theme/ThemeManager'
import AvatarViewer from '@components/views/AvatarViewer'
import * as DocumentPicker from 'expo-document-picker'
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { useShallow } from 'zustand/react/shallow'

const UserCardEditor = () => {
    const styles = useStyles()
    const { color, spacing } = Theme.useTheme()

    const { userCard, imageID, id, setCard, updateImage } = Characters.useUserStore(
        useShallow((state) => ({
            userCard: state.card,
            imageID: state.card?.image_id ?? 0,
            id: state.id,
            setCard: state.setCard,
            updateImage: state.updateImage,
        }))
    )

    const [currentCard, setCurrentCard] = useState<CharacterCardData | undefined>(userCard)

    const setShowViewer = useAvatarViewerStore((state) => state.setShow)

    useEffect(() => {
        setCurrentCard(userCard)
    }, [id])

    const saveCard = async () => {
        if (currentCard && id) {
            await Characters.db.mutate.updateCard(currentCard, id)
            setCard(id)
        }
    }

    const handleUploadImage = () => {
        DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: true,
            type: 'image/*',
        }).then((result) => {
            if (result.canceled) return
            if (id) updateImage(result.assets[0].uri)
        })
    }

    const handleDeleteImage = () => {
        Alert.alert({
            title: `删除图片`,
            description: `确定要删除此图片吗？此操作无法撤销。`,
            buttons: [
                { label: '取消' },
                {
                    label: '删除图片',
                    onPress: () => {
                        Characters.deleteImage(imageID)
                    },
                    type: 'warning',
                },
            ],
        })
    }

    return (
        <View style={styles.userContainer}>
            <AvatarViewer editorButton={false} />
            <KeyboardAwareScrollView
                bottomOffset={16}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                contentContainerStyle={{ rowGap: 8, paddingBottom: 48 }}>
                <View style={styles.nameBar}>
                    <PopupMenu
                        placement="right"
                        options={[
                            {
                                label: '更换图片',
                                icon: 'picture',
                                onPress: (menu) => {
                                    menu.current?.close()
                                    handleUploadImage()
                                },
                            },
                            {
                                label: '查看图片',
                                icon: 'search1',
                                onPress: (menu) => {
                                    menu.current?.close()
                                    setShowViewer(true, true)
                                },
                            },
                            {
                                label: '删除图片',
                                icon: 'delete',
                                onPress: (menu) => {
                                    menu.current?.close()
                                    handleDeleteImage()
                                },
                                warning: true,
                            },
                        ]}>
                        <Avatar
                            targetImage={Characters.getImageDir(imageID)}
                            style={styles.userImage}
                        />
                        <AntDesign name="edit" color={color.text._100} style={styles.editHover} />
                    </PopupMenu>
                    <ThemedTextInput
                        multiline
                        numberOfLines={10}
                        label="名称"
                        value={currentCard?.name ?? ''}
                        onChangeText={(text) => {
                            if (currentCard)
                                setCurrentCard({
                                    ...currentCard,
                                    name: text,
                                })
                        }}
                        placeholder="请输入名称"
                    />
                </View>
                <ThemedTextInput
                    multiline
                    numberOfLines={10}
                    label="描述"
                    value={currentCard?.description ?? ''}
                    onChangeText={(text) => {
                        if (currentCard)
                            setCurrentCard({
                                ...currentCard,
                                description: text,
                            })
                    }}
                    placeholder="描述这个用户..."
                />

                <SectionTitle>基本属性</SectionTitle>
                <View style={{ flexDirection: 'row', columnGap: spacing.m }}>
                    <ThemedTextInput
                        label="性别"
                        containerStyle={{ flex: 1 }}
                        onChangeText={(text) => {
                            if (currentCard) setCurrentCard({ ...currentCard, gender: text })
                        }}
                        value={currentCard?.gender ?? ''}
                        placeholder="如：男"
                    />
                    <ThemedTextInput
                        label="年龄"
                        containerStyle={{ flex: 1 }}
                        onChangeText={(text) => {
                            if (currentCard) setCurrentCard({ ...currentCard, age: text })
                        }}
                        value={currentCard?.age ?? ''}
                        placeholder="如：25岁"
                    />
                </View>
                <View style={{ flexDirection: 'row', columnGap: spacing.m }}>
                    <ThemedTextInput
                        label="身高"
                        containerStyle={{ flex: 1 }}
                        onChangeText={(text) => {
                            if (currentCard) setCurrentCard({ ...currentCard, height: text })
                        }}
                        value={currentCard?.height ?? ''}
                        placeholder="如：175cm"
                    />
                    <ThemedTextInput
                        label="体重"
                        containerStyle={{ flex: 1 }}
                        onChangeText={(text) => {
                            if (currentCard) setCurrentCard({ ...currentCard, weight: text })
                        }}
                        value={currentCard?.weight ?? ''}
                        placeholder="如：65kg"
                    />
                </View>
                <ThemedTextInput
                    label="性格特点"
                    multiline
                    numberOfLines={2}
                    onChangeText={(text) => {
                        if (currentCard) setCurrentCard({ ...currentCard, personality_traits: text })
                    }}
                    value={currentCard?.personality_traits ?? ''}
                    placeholder="开朗、幽默、有正义感..."
                />
                <ThemedTextInput
                    label="背景故事"
                    multiline
                    numberOfLines={4}
                    onChangeText={(text) => {
                        if (currentCard) setCurrentCard({ ...currentCard, background_story: text })
                    }}
                    value={currentCard?.background_story ?? ''}
                    placeholder="你的角色经历、身份背景..."
                />
                <ThemedTextInput
                    label="人物关系"
                    multiline
                    numberOfLines={3}
                    onChangeText={(text) => {
                        if (currentCard) setCurrentCard({ ...currentCard, relationships: text })
                    }}
                    value={currentCard?.relationships ?? ''}
                    placeholder="与其他角色的关系描述..."
                />

                <SectionTitle>NSFW 设置</SectionTitle>
                <ThemedSwitch
                    label="启用 NSFW 内容"
                    description="允许此角色生成成人内容"
                    value={currentCard?.nsfw ?? false}
                    onChangeValue={(b) => {
                        if (currentCard) setCurrentCard({ ...currentCard, nsfw: b })
                    }}
                />
                {currentCard?.nsfw && (
                    <>
                        <ThemedTextInput
                            label="NSFW 描述"
                            multiline
                            numberOfLines={4}
                            placeholder="描述角色在 NSFW 场景中的行为特征..."
                            onChangeText={(text) => {
                                if (currentCard)
                                    setCurrentCard({ ...currentCard, nsfw_description: text })
                            }}
                            value={currentCard?.nsfw_description ?? ''}
                        />
                        <View style={{ flexDirection: 'row', columnGap: spacing.m }}>
                            <ThemedTextInput
                                label="罩杯"
                                containerStyle={{ flex: 1 }}
                                onChangeText={(text) => {
                                    if (currentCard)
                                        setCurrentCard({ ...currentCard, nsfw_cup_size: text })
                                }}
                                value={currentCard?.nsfw_cup_size ?? ''}
                                placeholder="如：C"
                            />
                            <ThemedTextInput
                                label="臀围"
                                containerStyle={{ flex: 1 }}
                                onChangeText={(text) => {
                                    if (currentCard)
                                        setCurrentCard({ ...currentCard, nsfw_hip: text })
                                }}
                                value={currentCard?.nsfw_hip ?? ''}
                                placeholder="如：90cm"
                            />
                        </View>
                        <ThemedTextInput
                            label="敏感部位"
                            multiline
                            numberOfLines={2}
                            onChangeText={(text) => {
                                if (currentCard)
                                    setCurrentCard({ ...currentCard, nsfw_sensitive_areas: text })
                            }}
                            value={currentCard?.nsfw_sensitive_areas ?? ''}
                            placeholder="描述角色的敏感部位..."
                        />
                        <ThemedTextInput
                            label="性取向"
                            onChangeText={(text) => {
                                if (currentCard)
                                    setCurrentCard({ ...currentCard, nsfw_orientation: text })
                            }}
                            value={currentCard?.nsfw_orientation ?? ''}
                            placeholder="如：双性恋"
                        />
                    </>
                )}

                <Text
                    style={{
                        color: color.text._400,
                        marginTop: spacing.xl2,
                        alignSelf: 'center',
                    }}>
                    提示：向左滑动或按 <AntDesign name="menu-unfold" size={16} /> 打开用户抽屉
                </Text>
                <ThemedButton label="保存" onPress={saveCard} iconName="save" />
            </KeyboardAwareScrollView>
        </View>
    )
}

export default UserCardEditor

const useStyles = () => {
    const { color, spacing, borderWidth, borderRadius } = Theme.useTheme()

    return StyleSheet.create({
        userContainer: {
            flex: 1,
            paddingVertical: spacing.xl,
            paddingHorizontal: spacing.xl,
            rowGap: 16,
        },

        nameBar: {
            flexDirection: 'row',
            columnGap: 24,
        },

        userImage: {
            width: 84,
            height: 84,
            borderRadius: borderRadius.xl2,
            borderColor: color.primary._500,
            borderWidth: borderWidth.m,
        },

        editHover: {
            position: 'absolute',
            left: '75%',
            top: '75%',
            padding: spacing.m,
            borderColor: color.primary._500,
            borderWidth: borderWidth.s,
            backgroundColor: color.neutral._200,
            borderRadius: spacing.l,
        },
    })
}
