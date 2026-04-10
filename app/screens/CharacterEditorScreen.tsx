import ThemedButton from '@components/buttons/ThemedButton'
import StringArrayEditor from '@components/input/StringArrayEditor'
import ThemedSwitch from '@components/input/ThemedSwitch'
import ThemedTextInput from '@components/input/ThemedTextInput'
import SectionTitle from '@components/text/SectionTitle'
import Alert from '@components/views/Alert'
import Avatar from '@components/views/Avatar'
import AvatarCropModal from '@components/views/AvatarCropModal'
import AvatarViewer from '@components/views/AvatarViewer'
import HeaderTitle from '@components/views/HeaderTitle'
import ImageGenerationModal from '@components/views/ImageGenerationModal'
import PopupMenu from '@components/views/PopupMenu'
import { db } from '@db'
import { AntDesign } from '@expo/vector-icons'
import { Tokenizer } from '@lib/engine/Tokenizer'
import { ImageGeneration } from '@lib/image-generation/Seedream'
import { useAvatarViewerStore } from '@lib/state/AvatarViewer'
import { CharacterCardData, Characters } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { usePreventRemove } from '@react-navigation/core'
import { characterTags, tags } from 'db/schema'
import { count, eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import * as DocumentPicker from 'expo-document-picker'
import { ImageBackground } from 'expo-image'
import { Redirect, useNavigation } from 'expo-router'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/react/shallow'

const ChracterEditorScreen = () => {
    const styles = useStyles()
    const { color, spacing } = Theme.useTheme()
    const navigation = useNavigation()
    const data = useLiveQuery(
        db
            .select({
                tag: tags.tag,
                id: tags.id,
                tagCount: count(characterTags.tag_id),
            })
            .from(tags)
            .leftJoin(characterTags, eq(characterTags.tag_id, tags.id))
            .groupBy(tags.id)
    )
    const { currentCard, setCurrentCard, charId, charName, unloadCharacter } =
        Characters.useCharacterStore(
            useShallow((state) => ({
                charId: state.id,
                currentCard: state.card,
                setCurrentCard: state.setCard,
                charName: state.card?.name,
                unloadCharacter: state.unloadCard,
            }))
        )

    const getTokenCount = Tokenizer.useTokenizerState((state) => state.getTokenCount)
    const [characterCard, setCharacterCard] = useState<CharacterCardData | undefined>(currentCard)
    const { chat, unloadChat } = Chats.useChat()
    const { data: { background_image: backgroundImage } = {} } = useLiveQuery(
        Characters.db.query.backgroundImageQuery(charId ?? -1)
    )
    const { data: { chat_background_image: chatBackgroundImage } = {} } = useLiveQuery(
        Characters.db.query.chatBackgroundImageQuery(charId ?? -1)
    )
    const setShowViewer = useAvatarViewerStore((state) => state.setShow)
    const [edited, setEdited] = useState(false)
    const [altSwipeIndex, setAltSwipeIndex] = useState(0)
    const [showAvatarGenerator, setShowAvatarGenerator] = useState(false)
    const [showChatBackgroundGenerator, setShowChatBackgroundGenerator] = useState(false)
    const [cropAvatarUri, setCropAvatarUri] = useState('')

    const setCharacterCardEdited = (card: CharacterCardData) => {
        if (!edited) setEdited(true)
        setCharacterCard(card)
    }

    usePreventRemove(edited, ({ data }) => {
        if (!charId) return
        Alert.alert({
            title: '未保存的更改',
            description: '你有未保存的更改，离开将丢弃当前进度。',
            buttons: [
                { label: '取消' },
                {
                    label: '保存',
                    onPress: async () => {
                        await handleSaveCard()
                        navigation.dispatch(data.action)
                    },
                },
                {
                    label: '放弃更改',
                    onPress: () => {
                        navigation.dispatch(data.action)
                    },
                    type: 'warning',
                },
            ],
        })
    })

    const handleExportCard = () => {
        try {
            if (!charId) return
            Characters.exportCharacter(charId)
                .catch((e) => {
                    Logger.errorToast('导出失败')
                    Logger.error(JSON.stringify(e))
                })
                .then(() => {
                    Logger.infoToast('角色卡已导出！')
                })
        } catch (e) {
            Logger.errorToast('无法导出：' + JSON.stringify(e))
        }
    }

    const handleSaveCard = async () => {
        if (characterCard && charId)
            return Characters.db.mutate.updateCard(characterCard, charId).then(() => {
                setCurrentCard(charId)
                setEdited(() => false)
                Logger.infoToast('角色卡已保存！')
            })
    }

    const handleDeleteCard = () => {
        Alert.alert({
            title: '删除角色',
            description: `确定要删除 '${charName}'？此操作无法撤销。`,
            buttons: [
                { label: '取消' },
                {
                    label: '删除角色',
                    onPress: () => {
                        Characters.db.mutate.deleteCard(charId ?? -1)
                        unloadCharacter()
                        unloadChat()
                        setEdited(false)
                        Logger.info(`已删除角色：${charName}`)
                    },
                    type: 'warning',
                },
            ],
        })
    }

    useEffect(() => {
        return () => {
            if (!chat) unloadCharacter()
        }
    }, [])

    const handleDeleteImage = () => {
        Alert.alert({
            title: '删除图片',
            description: '确定要删除此图片吗？此操作无法撤销。',
            buttons: [
                { label: '取消' },
                {
                    label: '删除图片',
                    onPress: () => {
                        if (characterCard) Characters.deleteImage(characterCard.image_id)
                    },
                    type: 'warning',
                },
            ],
        })
    }

    const handleImportImage = () => {
        DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: true,
            type: 'image/*',
        }).then((result: DocumentPicker.DocumentPickerResult) => {
            if (result.canceled || !charId) return
            Characters.useCharacterStore.getState().updateImage(result.assets[0].uri)
        })
    }

    const handleApplyGeneratedAvatar = async (uri: string) => {
        setShowAvatarGenerator(false)
        setCropAvatarUri(uri)
    }

    const handleConfirmCroppedAvatar = async (uri: string) => {
        Characters.useCharacterStore.getState().updateImage(uri)
        setCropAvatarUri('')
        Logger.infoToast('头像已更新')
    }

    const handleApplyGeneratedChatBackground = async (uri: string) => {
        if (!charId) {
            throw new Error('角色不存在，无法设置聊天背景')
        }
        await Characters.applyChatBackgroundFromUri(charId, uri, chatBackgroundImage)
        Logger.infoToast('聊天背景已更新')
    }

    const handleAddAltMessage = async () => {
        if (!charId || !characterCard) return
        const id = await Characters.db.mutate.addAltGreeting(charId)
        await setCurrentCard(charId)
        const greetings = [
            ...(characterCard?.alternate_greetings ?? []),
            { id: id, greeting: '', character_id: charId },
        ]
        setCharacterCardEdited({ ...characterCard, alternate_greetings: greetings })
        if (characterCard.alternate_greetings.length !== 0) {
            setAltSwipeIndex(altSwipeIndex + 1)
        }
    }

    const deleteAltMessageRoutine = async () => {
        const id = characterCard?.alternate_greetings[altSwipeIndex].id
        if (!id || !charId) {
            Logger.errorToast('删除失败')
            return
        }
        await Characters.db.mutate.deleteAltGreeting(id)
        await setCurrentCard(charId)
        const greetings = [...(characterCard?.alternate_greetings ?? [])].filter(
            (item) => item.id !== id
        )
        setAltSwipeIndex(0)
        setCharacterCardEdited({ ...characterCard, alternate_greetings: greetings })
    }

    const handleDeleteAltMessage = async () => {
        Alert.alert({
            title: '删除备选消息',
            description: '确定要删除此备选消息吗？此操作无法撤销。',
            buttons: [
                { label: '取消' },
                {
                    label: '删除',
                    onPress: async () => {
                        await deleteAltMessageRoutine()
                    },
                    type: 'warning',
                },
            ],
        })
    }

    if (!charId) return <Redirect href=".." />
    return (
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
            <ImageBackground
                cachePolicy="none"
                style={styles.mainContainer}
                source={{
                    uri: backgroundImage ? Characters.getImageDir(backgroundImage) : '',
                }}>
                <HeaderTitle title="编辑角色" />
                <AvatarViewer editorButton={false} />
                <ImageGenerationModal
                    visible={showAvatarGenerator}
                    title="AI 生成头像"
                    defaultPrompt={ImageGeneration.buildCharacterPrompt({
                        card: characterCard ?? {},
                        target: 'avatar',
                    })}
                    target="avatar"
                    onClose={() => setShowAvatarGenerator(false)}
                    onApplyAvatar={handleApplyGeneratedAvatar}
                />
                <ImageGenerationModal
                    visible={showChatBackgroundGenerator}
                    title="AI 生成聊天背景"
                    defaultPrompt={ImageGeneration.buildCharacterPrompt({
                        card: characterCard ?? {},
                        target: 'character-chat-background',
                    })}
                    target="character-chat-background"
                    onClose={() => setShowChatBackgroundGenerator(false)}
                    onApplyChatBackground={handleApplyGeneratedChatBackground}
                />
                <AvatarCropModal
                    visible={!!cropAvatarUri}
                    imageUri={cropAvatarUri}
                    onClose={() => setCropAvatarUri('')}
                    onApply={handleConfirmCroppedAvatar}
                />

                {characterCard && (
                    <KeyboardAwareScrollView
                        bottomOffset={16}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="always"
                        contentContainerStyle={{ rowGap: 8, paddingBottom: 48 }}>
                        <View style={styles.chatBackgroundCard}>
                            <SectionTitle style={styles.chatBackgroundTitle}>
                                聊天背景
                            </SectionTitle>
                            <ImageBackground
                                cachePolicy="none"
                                style={styles.chatBackgroundPreview}
                                source={{
                                    uri: chatBackgroundImage
                                        ? Characters.getImageDir(chatBackgroundImage)
                                        : '',
                                }}>
                                {!chatBackgroundImage && (
                                    <Text style={styles.chatBackgroundPlaceholder}>
                                        未设置该角色的单独聊天背景
                                    </Text>
                                )}
                            </ImageBackground>
                            <View style={styles.chatBackgroundActions}>
                                <ThemedButton
                                    iconName="picture"
                                    iconSize={18}
                                    label={
                                        chatBackgroundImage ? '更换聊天背景' : '设置聊天背景'
                                    }
                                    variant="secondary"
                                    onPress={async () => {
                                        await Characters.importChatBackground(
                                            charId,
                                            chatBackgroundImage
                                        )
                                    }}
                                />
                                <ThemedButton
                                    iconName="delete"
                                    iconSize={18}
                                    label="移除聊天背景"
                                    variant={chatBackgroundImage ? 'critical' : 'disabled'}
                                    onPress={() => {
                                        if (chatBackgroundImage)
                                            Characters.deleteChatBackground(
                                                charId,
                                                chatBackgroundImage
                                            )
                                    }}
                                />
                            </View>
                        </View>
                        <View style={styles.characterHeader}>
                            <PopupMenu
                                placement="right"
                                options={[
                                    {
                                        label: '更换图片',
                                        icon: 'picture',
                                        onPress: (menu) => {
                                            menu.current?.close()
                                            handleImportImage()
                                        },
                                    },
                                    {
                                        label: '更换背景',
                                        icon: 'picture',
                                        onPress: async (menu) => {
                                            menu.current?.close()
                                            await Characters.importBackground(
                                                charId,
                                                characterCard.background_image
                                            )
                                        },
                                    },
                                    {
                                        label: '查看图片',
                                        icon: 'search1',
                                        onPress: (menu) => {
                                            menu.current?.close()
                                            setShowViewer(true)
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
                                    {
                                        label: '移除背景',
                                        icon: 'delete',
                                        onPress: (menu) => {
                                            menu.current?.close()
                                            if (backgroundImage)
                                                Characters.deleteBackground(charId, backgroundImage)
                                        },
                                        disabled: !backgroundImage,
                                        warning: true,
                                    },
                                ]}>
                                <Avatar
                                    targetImage={Characters.getImageDir(
                                        currentCard?.image_id ?? -1
                                    )}
                                    style={styles.avatar}
                                />
                                <AntDesign
                                    name="edit"
                                    color={color.text._100}
                                    style={styles.editHover}
                                />
                            </PopupMenu>

                            <View style={styles.characterHeaderInfo}>
                                <View style={styles.buttonContainer}>
                                    {!Characters.isSystemCard(characterCard) && (
                                        <ThemedButton
                                            iconName="delete"
                                            iconSize={20}
                                            variant="critical"
                                            label="删除"
                                            onPress={handleDeleteCard}
                                        />
                                    )}
                                    {!edited && (
                                        <ThemedButton
                                            iconName="upload"
                                            iconSize={20}
                                            label="导出"
                                            onPress={handleExportCard}
                                            variant="secondary"
                                        />
                                    )}
                                    {edited && (
                                        <ThemedButton
                                            iconName="save"
                                            iconSize={20}
                                            label="保存"
                                            onPress={handleSaveCard}
                                            variant="secondary"
                                        />
                                    )}
                                    <ThemedButton
                                        iconName="rocket1"
                                        iconSize={20}
                                        label="AI 生成头像"
                                        variant="secondary"
                                        onPress={() => setShowAvatarGenerator(true)}
                                    />
                                </View>
                                <ThemedTextInput
                                    onChangeText={(mes) => {
                                        setCharacterCardEdited({
                                            ...characterCard,
                                            name: mes,
                                        })
                                    }}
                                    value={characterCard?.name}
                                />
                            </View>
                        </View>

                        <ThemedTextInput
                            scrollEnabled
                            label={`描述 Token 数：${getTokenCount(characterCard?.description ?? '')}`}
                            multiline
                            containerStyle={styles.input}
                            numberOfLines={8}
                            onChangeText={(mes) => {
                                setCharacterCardEdited({
                                    ...characterCard,
                                    description: mes,
                                })
                            }}
                            value={characterCard?.description}
                        />

                        <ThemedTextInput
                            label="首条消息"
                            multiline
                            containerStyle={styles.input}
                            onChangeText={(mes) => {
                                setCharacterCardEdited({
                                    ...characterCard,
                                    first_mes: mes,
                                })
                            }}
                            value={characterCard?.first_mes}
                            numberOfLines={8}
                        />
                        <View style={styles.input}>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    paddingBottom: 12,
                                }}>
                                <Text style={{ color: color.text._100 }}>
                                    备选问候语{'   '}
                                    {characterCard.alternate_greetings.length !== 0 && (
                                        <Text
                                            style={{
                                                color: color.text._100,
                                            }}>
                                            {altSwipeIndex + 1} /{' '}
                                            {characterCard.alternate_greetings.length}
                                        </Text>
                                    )}
                                </Text>

                                <View style={{ flexDirection: 'row', columnGap: 32 }}>
                                    <TouchableOpacity onPress={handleDeleteAltMessage}>
                                        {characterCard.alternate_greetings.length !== 0 && (
                                            <AntDesign
                                                color={color.error._400}
                                                name="delete"
                                                size={20}
                                            />
                                        )}
                                    </TouchableOpacity>
                                    {characterCard.alternate_greetings.length > 0 && (
                                        <TouchableOpacity
                                            onPress={() =>
                                                setAltSwipeIndex(Math.max(altSwipeIndex - 1, 0))
                                            }>
                                            <AntDesign
                                                color={
                                                    altSwipeIndex === 0
                                                        ? color.text._700
                                                        : color.text._100
                                                }
                                                name="left"
                                                size={20}
                                            />
                                        </TouchableOpacity>
                                    )}
                                    {altSwipeIndex ===
                                        characterCard.alternate_greetings.length - 1 ||
                                    characterCard.alternate_greetings.length === 0 ? (
                                        <TouchableOpacity onPress={handleAddAltMessage}>
                                            <AntDesign
                                                color={color.text._100}
                                                name="plus"
                                                size={20}
                                            />
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity
                                            onPress={() =>
                                                setAltSwipeIndex(
                                                    Math.min(
                                                        altSwipeIndex + 1,
                                                        characterCard.alternate_greetings.length - 1
                                                    )
                                                )
                                            }>
                                            <AntDesign
                                                color={color.text._100}
                                                name="right"
                                                size={20}
                                            />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                            {characterCard.alternate_greetings.length !== 0 ? (
                                <ThemedTextInput
                                    multiline
                                    numberOfLines={8}
                                    onChangeText={(mes) => {
                                        const greetings = [...characterCard.alternate_greetings]
                                        greetings[altSwipeIndex].greeting = mes
                                        setCharacterCardEdited({
                                            ...characterCard,
                                            alternate_greetings: greetings,
                                        })
                                    }}
                                    value={
                                        characterCard?.alternate_greetings?.[altSwipeIndex]
                                            .greeting ?? ''
                                    }
                                />
                            ) : (
                                <Text
                                    style={{
                                        borderColor: color.neutral._400,
                                        borderWidth: 1,
                                        borderRadius: 8,
                                        padding: spacing.m,
                                        color: color.text._500,
                                        fontStyle: 'italic',
                                    }}>
                                    暂无备选问候语
                                </Text>
                            )}
                        </View>

                        <ThemedTextInput
                            label="示例消息"
                            multiline
                            containerStyle={styles.input}
                            onChangeText={(mes) => {
                                setCharacterCardEdited({
                                    ...characterCard,
                                    mes_example: mes,
                                })
                            }}
                            value={characterCard?.mes_example}
                            numberOfLines={8}
                        />

                        <StringArrayEditor
                            label="标签"
                            containerStyle={styles.input}
                            suggestions={data.data
                                .map((item) => item.tag)
                                .filter(
                                    (a) => !characterCard?.tags.some((item) => item.tag.tag === a)
                                )}
                            showSuggestionsOnEmpty
                            value={characterCard?.tags.map((item) => item.tag.tag) ?? []}
                            setValue={(value) => {
                                const newTags = value
                                    .filter((v) => !characterCard.tags.some((a) => a.tag.tag === v))
                                    .map((a) => {
                                        const existing = data.data.filter(
                                            (item) => item.tag === a
                                        )?.[0]
                                        if (existing) {
                                            return { tag_id: existing.id, tag: existing }
                                        }
                                        return { tag_id: -1, tag: { tag: a, id: -1 } }
                                    })
                                setCharacterCardEdited({
                                    ...characterCard,
                                    tags: [
                                        ...characterCard.tags.filter((v) =>
                                            value.some((a) => a === v.tag.tag)
                                        ),
                                        ...newTags,
                                    ],
                                })
                            }}
                        />

                        <SectionTitle>基本属性</SectionTitle>
                        <View style={{ flexDirection: 'row', columnGap: spacing.m }}>
                            <ThemedTextInput
                                label="性别"
                                containerStyle={{ flex: 1 }}
                                onChangeText={(mes) => {
                                    setCharacterCardEdited({ ...characterCard, gender: mes })
                                }}
                                value={characterCard?.gender}
                                placeholder="如：女"
                            />
                            <ThemedTextInput
                                label="年龄"
                                containerStyle={{ flex: 1 }}
                                onChangeText={(mes) => {
                                    setCharacterCardEdited({ ...characterCard, age: mes })
                                }}
                                value={characterCard?.age}
                                placeholder="如：22岁"
                            />
                        </View>
                        <View style={{ flexDirection: 'row', columnGap: spacing.m }}>
                            <ThemedTextInput
                                label="身高"
                                containerStyle={{ flex: 1 }}
                                onChangeText={(mes) => {
                                    setCharacterCardEdited({ ...characterCard, height: mes })
                                }}
                                value={characterCard?.height}
                                placeholder="如：165cm"
                            />
                            <ThemedTextInput
                                label="体重"
                                containerStyle={{ flex: 1 }}
                                onChangeText={(mes) => {
                                    setCharacterCardEdited({ ...characterCard, weight: mes })
                                }}
                                value={characterCard?.weight}
                                placeholder="如：50kg"
                            />
                        </View>

                        <ThemedTextInput
                            label="性格特点"
                            multiline
                            containerStyle={styles.input}
                            numberOfLines={2}
                            onChangeText={(mes) => {
                                setCharacterCardEdited({
                                    ...characterCard,
                                    personality_traits: mes,
                                })
                            }}
                            value={characterCard?.personality_traits}
                            placeholder="温柔、善良、有些傲娇..."
                        />

                        <ThemedTextInput
                            label="背景故事"
                            multiline
                            containerStyle={styles.input}
                            numberOfLines={4}
                            onChangeText={(mes) => {
                                setCharacterCardEdited({ ...characterCard, background_story: mes })
                            }}
                            value={characterCard?.background_story}
                            placeholder="角色的成长经历、重要事件..."
                        />

                        <ThemedTextInput
                            label="人物关系"
                            multiline
                            containerStyle={styles.input}
                            numberOfLines={3}
                            onChangeText={(mes) => {
                                setCharacterCardEdited({ ...characterCard, relationships: mes })
                            }}
                            value={characterCard?.relationships}
                            placeholder="与其他角色的关系描述..."
                        />

                        <SectionTitle>NSFW 设置</SectionTitle>
                        <ThemedSwitch
                            label="启用 NSFW 内容"
                            description="允许此角色生成成人内容"
                            value={characterCard?.nsfw ?? false}
                            onChangeValue={(b) => {
                                setCharacterCardEdited({
                                    ...characterCard,
                                    nsfw: b,
                                })
                            }}
                        />
                        {characterCard?.nsfw && (
                            <>
                                <ThemedTextInput
                                    label="NSFW 描述"
                                    multiline
                                    containerStyle={styles.input}
                                    numberOfLines={4}
                                    placeholder="描述角色在 NSFW 场景中的行为特征..."
                                    onChangeText={(mes) => {
                                        setCharacterCardEdited({
                                            ...characterCard,
                                            nsfw_description: mes,
                                        })
                                    }}
                                    value={characterCard?.nsfw_description}
                                />
                                <View style={{ flexDirection: 'row', columnGap: spacing.m }}>
                                    <ThemedTextInput
                                        label="罩杯"
                                        containerStyle={{ flex: 1 }}
                                        onChangeText={(mes) => {
                                            setCharacterCardEdited({
                                                ...characterCard,
                                                nsfw_cup_size: mes,
                                            })
                                        }}
                                        value={characterCard?.nsfw_cup_size}
                                        placeholder="如：C"
                                    />
                                    <ThemedTextInput
                                        label="臀围"
                                        containerStyle={{ flex: 1 }}
                                        onChangeText={(mes) => {
                                            setCharacterCardEdited({
                                                ...characterCard,
                                                nsfw_hip: mes,
                                            })
                                        }}
                                        value={characterCard?.nsfw_hip}
                                        placeholder="如：90cm"
                                    />
                                </View>
                                <ThemedTextInput
                                    label="敏感部位"
                                    multiline
                                    containerStyle={styles.input}
                                    numberOfLines={2}
                                    onChangeText={(mes) => {
                                        setCharacterCardEdited({
                                            ...characterCard,
                                            nsfw_sensitive_areas: mes,
                                        })
                                    }}
                                    value={characterCard?.nsfw_sensitive_areas}
                                    placeholder="描述角色的敏感部位..."
                                />
                                <ThemedTextInput
                                    label="性取向"
                                    containerStyle={styles.input}
                                    onChangeText={(mes) => {
                                        setCharacterCardEdited({
                                            ...characterCard,
                                            nsfw_orientation: mes,
                                        })
                                    }}
                                    value={characterCard?.nsfw_orientation}
                                    placeholder="如：双性恋"
                                />
                            </>
                        )}
                    </KeyboardAwareScrollView>
                )}
            </ImageBackground>
        </SafeAreaView>
    )
}

const useStyles = () => {
    const { color, spacing, borderRadius } = Theme.useTheme()
    return StyleSheet.create({
        mainContainer: {
            flex: 1,
            paddingHorizontal: spacing.m,
            paddingTop: spacing.m,
            paddingBottom: spacing.s,
        },
        chatBackgroundCard: {
            backgroundColor: color.neutral._100,
            borderRadius: borderRadius.xl,
            padding: spacing.l,
            rowGap: spacing.l,
        },
        chatBackgroundTitle: {
            paddingBottom: spacing.s,
        },
        chatBackgroundPreview: {
            minHeight: 140,
            borderRadius: borderRadius.l,
            overflow: 'hidden',
            backgroundColor: color.neutral._200,
            alignItems: 'center',
            justifyContent: 'center',
        },
        chatBackgroundPlaceholder: {
            color: color.text._400,
            textAlign: 'center',
            paddingHorizontal: spacing.xl,
        },
        chatBackgroundActions: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            columnGap: spacing.m,
            rowGap: spacing.m,
        },
        characterHeader: {
            alignContent: 'flex-start',
            borderRadius: borderRadius.xl,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: color.neutral._100,
            paddingVertical: 12,
            paddingHorizontal: 12,
        },
        characterHeaderInfo: {
            marginLeft: spacing.xl2,
            rowGap: 12,
            flex: 1,
        },
        input: {
            backgroundColor: color.neutral._100,
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderRadius: 8,
        },
        buttonContainer: {
            justifyContent: 'flex-start',
            flexDirection: 'row',
            flexWrap: 'wrap',
            columnGap: 4,
            rowGap: 4,
        },
        avatar: {
            width: 80,
            height: 80,
            borderRadius: borderRadius.xl2,
            borderColor: color.primary._500,
            borderWidth: 2,
        },
        editHover: {
            position: 'absolute',
            left: '75%',
            top: '75%',
            padding: spacing.m,
            borderColor: color.text._700,
            borderWidth: 1,
            backgroundColor: color.primary._300,
            borderRadius: borderRadius.l,
        },
    })
}

export default ChracterEditorScreen
