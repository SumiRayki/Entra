import ThemedButton from '@components/buttons/ThemedButton'
import ThemedTextInput from '@components/input/ThemedTextInput'
import SectionTitle from '@components/text/SectionTitle'
import Alert from '@components/views/Alert'
import HeaderTitle from '@components/views/HeaderTitle'
import { db as database } from '@db'
import { AntDesign } from '@expo/vector-icons'
import { Characters } from '@lib/state/Characters'
import { Logger } from '@lib/state/Logger'
import { getStoryNarratorCreatorNote, syncStoryNarrator } from '@lib/state/Story'
import { Theme } from '@lib/theme/ThemeManager'
import { characters, stories, storyCharacters } from 'db/schema'
import { asc, eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { ImageBackground } from 'expo-image'
import { useNavigation } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView } from 'react-native-safe-area-context'

let currentStoryId: number | null = null
export const setCurrentStoryId = (id: number | null) => {
    currentStoryId = id
}
export const getCurrentStoryId = () => currentStoryId

type CastMember = {
    id: number
    name: string
    brief_description: string
}

const StoryEditorScreen = () => {
    const styles = useStyles()
    const { color, spacing } = Theme.useTheme()
    const navigation = useNavigation()

    const [storyId, setStoryId] = useState<number | null>(getCurrentStoryId())
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [worldSetting, setWorldSetting] = useState('')
    const [background, setBackground] = useState('')
    const [cast, setCast] = useState<CastMember[]>([])

    const { data: narratorCard } = useLiveQuery(
        database.query.characters.findFirst({
            where: eq(characters.creator_notes, getStoryNarratorCreatorNote(storyId ?? -1)),
            columns: {
                id: true,
                chat_background_image: true,
            },
        })
    )

    useEffect(() => {
        if (!storyId) return
        const load = async () => {
            const story = await database.query.stories.findFirst({
                where: eq(stories.id, storyId),
            })
            if (story) {
                setName(story.name)
                setDescription(story.description)
                setWorldSetting(story.world_setting)
                setBackground(story.background)
            }
            const members = await database.query.storyCharacters.findMany({
                where: eq(storyCharacters.story_id, storyId),
                orderBy: asc(storyCharacters.id),
            })
            setCast(
                members.map((member) => ({
                    id: member.id,
                    name: member.name,
                    brief_description: member.brief_description,
                }))
            )
        }
        load()
    }, [storyId])

    const saveStory = async () => {
        if (!name.trim()) {
            Logger.errorToast('故事名称不能为空')
            return null
        }
        try {
            let id = storyId
            if (id) {
                await database
                    .update(stories)
                    .set({
                        name: name.trim(),
                        description: description.trim(),
                        world_setting: worldSetting.trim(),
                        background: background.trim(),
                        last_modified: Date.now(),
                    })
                    .where(eq(stories.id, id))
                await database.delete(storyCharacters).where(eq(storyCharacters.story_id, id))
            } else {
                const [created] = await database
                    .insert(stories)
                    .values({
                        name: name.trim(),
                        description: description.trim(),
                        world_setting: worldSetting.trim(),
                        background: background.trim(),
                    })
                    .returning({ id: stories.id })
                id = created.id
                setStoryId(id)
                setCurrentStoryId(id)
            }

            const members = cast.filter((member) => member.name.trim())
            if (members.length > 0) {
                await database.insert(storyCharacters).values(
                    members.map((member) => ({
                        story_id: id!,
                        name: member.name.trim(),
                        brief_description: member.brief_description.trim(),
                    }))
                )
            }

            const narratorId = await syncStoryNarrator(id!)
            return { storyId: id!, narratorId }
        } catch (e) {
            Logger.errorToast('保存失败：' + e)
            return null
        }
    }

    const handleSave = async () => {
        const result = await saveStory()
        if (result) {
            Logger.infoToast('故事已保存！')
            navigation.goBack()
        }
    }

    const handleImportChatBackground = async () => {
        const result = await saveStory()
        if (!result?.narratorId) {
            Logger.errorToast('无法同步故事聊天背景')
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

    const handleDelete = () => {
        if (!storyId) return
        Alert.alert({
            title: '删除故事',
            description: `确定要删除「${name}」吗？此操作无法撤销。`,
            buttons: [
                { label: '取消' },
                {
                    label: '删除',
                    type: 'warning',
                    onPress: async () => {
                        await database.delete(stories).where(eq(stories.id, storyId))
                        Logger.infoToast('故事已删除')
                        navigation.goBack()
                    },
                },
            ],
        })
    }

    return (
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
            <HeaderTitle title={storyId ? '编辑故事' : '创建故事'} />
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
                                未设置该故事的单独聊天背景
                            </Text>
                        )}
                    </ImageBackground>
                    <View style={styles.chatBackgroundActions}>
                        <ThemedButton
                            label={
                                narratorCard?.chat_background_image ? '更换聊天背景' : '设置聊天背景'
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
                    {storyId && (
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
                    label="故事名称"
                    value={name}
                    onChangeText={setName}
                    placeholder="输入故事名称..."
                />
                <ThemedTextInput
                    label="故事简介"
                    multiline
                    numberOfLines={3}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="一两句话说明这个故事..."
                />
                <ThemedTextInput
                    label="世界观"
                    multiline
                    numberOfLines={5}
                    value={worldSetting}
                    onChangeText={setWorldSetting}
                    placeholder="世界如何运转、时代、地点、规则..."
                />
                <ThemedTextInput
                    label="故事背景"
                    multiline
                    numberOfLines={5}
                    value={background}
                    onChangeText={setBackground}
                    placeholder="故事开始前已经发生的事..."
                />

                <SectionTitle>主要角色</SectionTitle>
                <Text style={{ color: color.text._400, marginBottom: spacing.m }}>
                    写出身份、性格，以及和别人的关系
                </Text>
                {cast.map((member, index) => (
                    <View key={member.id} style={styles.castCard}>
                        <View style={styles.castHeader}>
                            <Text style={styles.castLabel}>角色 {index + 1}</Text>
                            <TouchableOpacity
                                onPress={() => setCast(cast.filter((_, i) => i !== index))}>
                                <AntDesign name="close" size={20} color={color.error._400} />
                            </TouchableOpacity>
                        </View>
                        <ThemedTextInput
                            label="名称"
                            value={member.name}
                            onChangeText={(text) => {
                                const updated = [...cast]
                                updated[index] = { ...updated[index], name: text }
                                setCast(updated)
                            }}
                            placeholder="角色名称"
                        />
                        <ThemedTextInput
                            label="描述"
                            multiline
                            numberOfLines={3}
                            value={member.brief_description}
                            onChangeText={(text) => {
                                const updated = [...cast]
                                updated[index] = { ...updated[index], brief_description: text }
                                setCast(updated)
                            }}
                            placeholder="身份、性格、关系..."
                            containerStyle={{ marginTop: spacing.s }}
                        />
                    </View>
                ))}
                <ThemedButton
                    label="添加角色"
                    iconName="plus"
                    iconSize={18}
                    variant="secondary"
                    onPress={() =>
                        setCast([
                            ...cast,
                            { id: Date.now(), name: '', brief_description: '' },
                        ])
                    }
                />
            </KeyboardAwareScrollView>
        </SafeAreaView>
    )
}

export default StoryEditorScreen

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
        castCard: {
            backgroundColor: color.neutral._200,
            borderRadius: borderRadius.m,
            padding: spacing.l,
            marginBottom: spacing.s,
        },
        castHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.s,
        },
        castLabel: {
            color: color.text._300,
            fontSize: fontSize.m,
            fontWeight: '500',
        },
    })
}
