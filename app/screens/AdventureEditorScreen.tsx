import ThemedButton from '@components/buttons/ThemedButton'
import ThemedTextInput from '@components/input/ThemedTextInput'
import SectionTitle from '@components/text/SectionTitle'
import Alert from '@components/views/Alert'
import Avatar from '@components/views/Avatar'
import FadeBackrop from '@components/views/FadeBackdrop'
import HeaderTitle from '@components/views/HeaderTitle'
import ImageGenerationModal from '@components/views/ImageGenerationModal'
import { db as database } from '@db'
import { AntDesign } from '@expo/vector-icons'
import {
    getAdventureNarratorCreatorNote,
    syncAdventureNarrator,
} from '@lib/state/Adventure'
import { ImageGeneration } from '@lib/image-generation/Seedream'
import { Characters } from '@lib/state/Characters'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { adventureCharacters, adventures, characters } from 'db/schema'
import { eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { ImageBackground } from 'expo-image'
import { useNavigation } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'

let currentAdventureId: number | null = null
export const setCurrentAdventureId = (id: number | null) => {
    currentAdventureId = id
}
export const getCurrentAdventureId = () => currentAdventureId

type SupportingChar = {
    id: number
    name: string
    brief_description: string
    character_id: number | null
    role: 'npc' | 'supporting'
}

const AdventureEditorScreen = () => {
    const styles = useStyles()
    const { color, spacing } = Theme.useTheme()
    const navigation = useNavigation()

    const [adventureId, setAdventureId] = useState<number | null>(getCurrentAdventureId())

    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [scenario, setScenario] = useState('')
    const [systemPrompt, setSystemPrompt] = useState('')

    const [mainChars, setMainChars] = useState<SupportingChar[]>([])
    const [supportingChars, setSupportingChars] = useState<SupportingChar[]>([])

    const [showCharPicker, setShowCharPicker] = useState(false)
    const [showChatBackgroundGenerator, setShowChatBackgroundGenerator] = useState(false)

    const { data: allCharacters } = useLiveQuery(Characters.db.query.cardListQuery('character'))
    const { data: narratorCard } = useLiveQuery(
        database.query.characters.findFirst({
            where: eq(characters.creator_notes, getAdventureNarratorCreatorNote(adventureId ?? -1)),
            columns: {
                id: true,
                chat_background_image: true,
            },
        })
    )

    useEffect(() => {
        if (!adventureId) return
        const load = async () => {
            const adventure = await database.query.adventures.findFirst({
                where: (a, { eq }) => eq(a.id, adventureId),
            })
            if (adventure) {
                setName(adventure.name)
                setDescription(adventure.description)
                setScenario(adventure.scenario)
                setSystemPrompt(adventure.system_prompt)
            }
            const chars = await database.query.adventureCharacters.findMany({
                where: (ac, { eq }) => eq(ac.adventure_id, adventureId),
            })
            const mains: SupportingChar[] = []
            const supports: SupportingChar[] = []
            for (const c of chars) {
                const item: SupportingChar = {
                    id: c.id,
                    name: c.name,
                    brief_description: c.brief_description,
                    character_id: c.character_id,
                    role: c.role as 'npc' | 'supporting',
                }
                if (c.character_id) {
                    mains.push(item)
                } else {
                    supports.push(item)
                }
            }
            setMainChars(mains)
            setSupportingChars(supports)
        }
        load()
    }, [adventureId])

    const saveAdventure = async (): Promise<
        | {
              adventureId: number
              narratorId: number | null
          }
        | null
    > => {
        if (!name.trim()) {
            Logger.errorToast('游戏名称不能为空')
            return null
        }
        try {
            let advId = adventureId
            if (advId) {
                await database
                    .update(adventures)
                    .set({
                        name,
                        description,
                        scenario,
                        system_prompt: systemPrompt,
                    })
                    .where(eq(adventures.id, advId))
                await database
                    .delete(adventureCharacters)
                    .where(eq(adventureCharacters.adventure_id, advId))
            } else {
                const [result] = await database
                    .insert(adventures)
                    .values({ name, description, scenario, system_prompt: systemPrompt })
                    .returning({ id: adventures.id })
                advId = result.id
                setAdventureId(advId)
                setCurrentAdventureId(advId)
            }

            const allChars = [
                ...mainChars.map((c) => ({
                    adventure_id: advId!,
                    character_id: c.character_id,
                    role: 'npc' as const,
                    name: c.name,
                    brief_description: c.brief_description,
                })),
                ...supportingChars.map((c) => ({
                    adventure_id: advId!,
                    character_id: null,
                    role: 'supporting' as const,
                    name: c.name,
                    brief_description: c.brief_description,
                })),
            ]
            if (allChars.length > 0) {
                await database.insert(adventureCharacters).values(allChars)
            }
            const narratorId = await syncAdventureNarrator(advId!)
            return {
                adventureId: advId!,
                narratorId,
            }
        } catch (e) {
            Logger.errorToast('保存失败：' + e)
            return null
        }
    }

    const handleSave = async () => {
        const result = await saveAdventure()
        if (result) {
            Logger.infoToast('游戏已保存！')
            navigation.goBack()
        }
    }

    const handleImportChatBackground = async () => {
        const result = await saveAdventure()
        if (!result?.narratorId) {
            Logger.errorToast('无法同步游戏聊天背景')
            return
        }
        await Characters.importChatBackground(result.narratorId, narratorCard?.chat_background_image)
    }

    const handleDeleteChatBackground = async () => {
        if (narratorCard?.id && narratorCard.chat_background_image) {
            await Characters.deleteChatBackground(
                narratorCard.id,
                narratorCard.chat_background_image
            )
        }
    }

    const handleApplyGeneratedChatBackground = async (uri: string) => {
        const result = await saveAdventure()
        if (!result?.narratorId) {
            throw new Error('无法同步游戏聊天背景')
        }
        await Characters.applyChatBackgroundFromUri(
            result.narratorId,
            uri,
            narratorCard?.chat_background_image
        )
        Logger.infoToast('游戏聊天背景已更新')
    }

    const handleDelete = () => {
        if (!adventureId) return
        Alert.alert({
            title: '删除游戏',
            description: `确定要删除「${name}」吗？此操作无法撤销。`,
            buttons: [
                { label: '取消' },
                {
                    label: '删除',
                    type: 'warning',
                    onPress: async () => {
                        await database.delete(adventures).where(eq(adventures.id, adventureId))
                        Logger.infoToast('游戏已删除')
                        navigation.goBack()
                    },
                },
            ],
        })
    }

    const handleAddExistingChar = (charData: (typeof allCharacters)[0]) => {
        if (mainChars.some((c) => c.character_id === charData.id)) {
            Logger.errorToast('该角色已添加')
            return
        }
        setMainChars([
            ...mainChars,
            {
                id: Date.now(),
                name: charData.name,
                brief_description: '',
                character_id: charData.id,
                role: 'npc',
            },
        ])
        setShowCharPicker(false)
    }

    const handleAddSupporting = () => {
        setSupportingChars([
            ...supportingChars,
            {
                id: Date.now(),
                name: '',
                brief_description: '',
                character_id: null,
                role: 'supporting',
            },
        ])
    }

    const handleRemoveMain = (index: number) => {
        setMainChars(mainChars.filter((_, i) => i !== index))
    }

    const handleRemoveSupporting = (index: number) => {
        setSupportingChars(supportingChars.filter((_, i) => i !== index))
    }

    return (
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
            <HeaderTitle title={adventureId ? '编辑游戏' : '创建游戏'} />
            <ImageGenerationModal
                visible={showChatBackgroundGenerator}
                title="AI 生成游戏聊天背景"
                defaultPrompt={ImageGeneration.buildAdventurePrompt({
                    name,
                    description,
                    scenario,
                    systemPrompt,
                })}
                target="adventure-chat-background"
                onClose={() => setShowChatBackgroundGenerator(false)}
                onApplyChatBackground={handleApplyGeneratedChatBackground}
            />

            <Modal
                visible={showCharPicker}
                transparent
                animationType="fade"
                statusBarTranslucent
                navigationBarTranslucent
                onRequestClose={() => setShowCharPicker(false)}>
                <FadeBackrop handleOverlayClick={() => setShowCharPicker(false)}>
                    <Animated.View
                        style={styles.pickerContainer}
                        entering={FadeInDown.duration(150)}>
                        <View style={styles.pickerContent}>
                            <Text style={styles.pickerTitle}>选择角色</Text>
                            {allCharacters.length === 0 ? (
                                <Text style={styles.emptyText}>还没有创建角色</Text>
                            ) : (
                                <FlatList
                                    data={allCharacters}
                                    style={{ maxHeight: 400 }}
                                    keyExtractor={(item) => item.id.toString()}
                                    showsVerticalScrollIndicator={false}
                                    renderItem={({ item }) => {
                                        const added = mainChars.some(
                                            (c) => c.character_id === item.id
                                        )
                                        return (
                                            <TouchableOpacity
                                                style={[
                                                    styles.charPickerItem,
                                                    added && { opacity: 0.4 },
                                                ]}
                                                disabled={added}
                                                onPress={() => handleAddExistingChar(item)}>
                                                <Avatar
                                                    targetImage={Characters.getImageDir(
                                                        item.image_id
                                                    )}
                                                    style={styles.charPickerAvatar}
                                                />
                                                <Text style={styles.charPickerName}>
                                                    {item.name}
                                                    {added ? ' (已添加)' : ''}
                                                </Text>
                                            </TouchableOpacity>
                                        )
                                    }}
                                />
                            )}
                            <ThemedButton
                                label="取消"
                                variant="tertiary"
                                onPress={() => setShowCharPicker(false)}
                                buttonStyle={{ marginTop: spacing.l }}
                            />
                        </View>
                    </Animated.View>
                </FadeBackrop>
            </Modal>

            <KeyboardAwareScrollView
                bottomOffset={16}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                contentContainerStyle={{
                    rowGap: 8,
                    paddingHorizontal: spacing.l,
                    paddingBottom: 48,
                }}>
                <View style={styles.chatBackgroundCard}>
                    <SectionTitle style={styles.chatBackgroundTitle}>聊天背景</SectionTitle>
                    <ImageBackground
                        cachePolicy="none"
                        style={styles.chatBackgroundPreview}
                        source={{
                            uri: narratorCard?.chat_background_image
                                ? Characters.getImageDir(narratorCard.chat_background_image)
                                : '',
                        }}>
                        {!narratorCard?.chat_background_image && (
                            <Text style={styles.chatBackgroundPlaceholder}>
                                未设置该游戏的单独聊天背景
                            </Text>
                        )}
                    </ImageBackground>
                    <View style={styles.chatBackgroundActions}>
                        <ThemedButton
                            label={
                                narratorCard?.chat_background_image
                                    ? '更换聊天背景'
                                    : '设置聊天背景'
                            }
                            iconName="picture"
                            iconSize={18}
                            variant="secondary"
                            onPress={handleImportChatBackground}
                        />
                        <ThemedButton
                            label="移除聊天背景"
                            iconName="delete"
                            iconSize={18}
                            variant={narratorCard?.chat_background_image ? 'critical' : 'disabled'}
                            onPress={handleDeleteChatBackground}
                        />
                    </View>
                </View>

                <View style={styles.buttonRow}>
                    {adventureId && (
                        <ThemedButton
                            label="删除"
                            variant="critical"
                            iconName="delete"
                            iconSize={20}
                            onPress={handleDelete}
                        />
                    )}
                    <ThemedButton
                        label="保存"
                        variant="secondary"
                        iconName="save"
                        iconSize={20}
                        onPress={handleSave}
                    />
                </View>

                <ThemedTextInput
                    label="游戏名称"
                    value={name}
                    onChangeText={setName}
                    placeholder="输入游戏名称..."
                />

                <ThemedTextInput
                    label="简介"
                    multiline
                    numberOfLines={3}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="简要描述这个游戏..."
                />

                <ThemedTextInput
                    label="背景故事"
                    multiline
                    numberOfLines={6}
                    value={scenario}
                    onChangeText={setScenario}
                    placeholder="游戏的世界观、时代背景、主要事件..."
                />

                <ThemedTextInput
                    label="系统提示词（可选）"
                    multiline
                    numberOfLines={4}
                    value={systemPrompt}
                    onChangeText={setSystemPrompt}
                    placeholder="自定义 AI 游戏主持人的行为指令..."
                />

                <SectionTitle>故事角色</SectionTitle>
                <Text style={{ color: color.text._400, marginBottom: spacing.m }}>
                    从已创建的角色中添加，角色的完整属性会在游戏中生效
                </Text>

                {mainChars.map((char, index) => (
                    <View key={char.id} style={styles.charCard}>
                        <Avatar
                            targetImage={Characters.getImageDir(char.character_id ?? 0)}
                            style={styles.charCardAvatar}
                        />
                        <Text style={styles.charCardName}>{char.name}</Text>
                        <TouchableOpacity onPress={() => handleRemoveMain(index)}>
                            <AntDesign name="close" size={20} color={color.error._400} />
                        </TouchableOpacity>
                    </View>
                ))}

                <ThemedButton
                    label="添加已有角色"
                    iconName="plus"
                    iconSize={18}
                    variant="secondary"
                    onPress={() => setShowCharPicker(true)}
                />

                <SectionTitle>配角</SectionTitle>
                <Text style={{ color: color.text._400, marginBottom: spacing.m }}>
                    简要描述的配角，无需创建完整角色卡
                </Text>

                {supportingChars.map((char, index) => (
                    <View key={char.id} style={styles.supportCard}>
                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: spacing.s,
                            }}>
                            <Text style={styles.supportLabel}>配角 {index + 1}</Text>
                            <TouchableOpacity onPress={() => handleRemoveSupporting(index)}>
                                <AntDesign name="close" size={20} color={color.error._400} />
                            </TouchableOpacity>
                        </View>
                        <ThemedTextInput
                            label="名称"
                            value={char.name}
                            onChangeText={(text) => {
                                const updated = [...supportingChars]
                                updated[index] = { ...updated[index], name: text }
                                setSupportingChars(updated)
                            }}
                            placeholder="配角名称"
                        />
                        <ThemedTextInput
                            label="描述"
                            multiline
                            numberOfLines={3}
                            value={char.brief_description}
                            onChangeText={(text) => {
                                const updated = [...supportingChars]
                                updated[index] = { ...updated[index], brief_description: text }
                                setSupportingChars(updated)
                            }}
                            placeholder="简要描述这个配角的外貌、性格、身份..."
                            containerStyle={{ marginTop: spacing.s }}
                        />
                    </View>
                ))}

                <ThemedButton
                    label="添加配角"
                    iconName="plus"
                    iconSize={18}
                    variant="secondary"
                    onPress={handleAddSupporting}
                />
            </KeyboardAwareScrollView>
        </SafeAreaView>
    )
}

export default AdventureEditorScreen

const useStyles = () => {
    const { color, spacing, borderRadius, fontSize } = Theme.useTheme()

    return StyleSheet.create({
        chatBackgroundCard: {
            backgroundColor: color.neutral._200,
            borderRadius: borderRadius.xl,
            padding: spacing.l,
            rowGap: spacing.l,
            marginBottom: spacing.m,
        },
        chatBackgroundTitle: {
            paddingBottom: spacing.s,
        },
        chatBackgroundPreview: {
            minHeight: 140,
            borderRadius: borderRadius.l,
            overflow: 'hidden',
            backgroundColor: color.neutral._300,
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
        buttonRow: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            columnGap: spacing.m,
            marginBottom: spacing.m,
        },
        charCard: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: color.neutral._200,
            borderRadius: borderRadius.m,
            padding: spacing.l,
            marginBottom: spacing.s,
        },
        charCardAvatar: {
            width: 40,
            height: 40,
            borderRadius: 20,
            marginRight: spacing.l,
        },
        charCardName: {
            flex: 1,
            color: color.text._100,
            fontSize: fontSize.l,
        },
        supportCard: {
            backgroundColor: color.neutral._200,
            borderRadius: borderRadius.m,
            padding: spacing.l,
            marginBottom: spacing.s,
        },
        supportLabel: {
            color: color.text._300,
            fontSize: fontSize.m,
            fontWeight: '500',
        },
        pickerContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        pickerContent: {
            backgroundColor: color.neutral._200,
            paddingHorizontal: spacing.xl2,
            paddingVertical: spacing.xl2,
            borderRadius: borderRadius.xl,
            width: '90%',
            maxHeight: '70%',
        },
        pickerTitle: {
            color: color.text._100,
            fontSize: 20,
            fontWeight: '600',
            marginBottom: spacing.xl,
        },
        emptyText: {
            color: color.text._500,
            textAlign: 'center',
            paddingVertical: spacing.xl2,
        },
        charPickerItem: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: spacing.l,
            borderRadius: borderRadius.m,
            marginBottom: spacing.s,
            backgroundColor: color.neutral._300,
        },
        charPickerAvatar: {
            width: 40,
            height: 40,
            borderRadius: 20,
            marginRight: spacing.l,
        },
        charPickerName: {
            color: color.text._100,
            fontSize: fontSize.l,
        },
    })
}
