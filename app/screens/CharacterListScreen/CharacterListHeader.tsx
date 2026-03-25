import ThemedButton from '@components/buttons/ThemedButton'
import StringArrayEditor from '@components/input/StringArrayEditor'
import ThemedTextInput from '@components/input/ThemedTextInput'
import { db } from '@db'
import { AppSettings } from '@lib/constants/GlobalValues'
import { CharacterSorter } from '@lib/state/CharacterSorter'
import { TagHider } from '@lib/state/TagHider'
import { Theme } from '@lib/theme/ThemeManager'
import { characterTags, tags } from 'db/schema'
import { count, eq, notInArray } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import { BackHandler, Text, TouchableOpacity, View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from 'react-native-reanimated'

import { Logger } from '@lib/state/Logger'

type ListTab = 'characters' | 'adventures'

type CharacterListHeaderProps = {
    resultLength: number
    activeTab: ListTab
    onTabChange: (tab: ListTab) => void
}

const CharacterListHeader: React.FC<CharacterListHeaderProps> = ({
    resultLength,
    activeTab,
    onTabChange,
}) => {
    const [useTagHider, setUseTagHider] = useMMKVBoolean(AppSettings.UseTagHider)
    const { showSearch, setShowSearch, textFilter, setTextFilter, tagFilter, setTagFilter } =
        CharacterSorter.useSorter()

    const { color, spacing, borderRadius } = Theme.useTheme()
    const [showTags, setShowTags] = useMMKVBoolean(AppSettings.ShowTags)
    const hiddenTags = TagHider.useHiddenTags()

    const { data } = useLiveQuery(
        db
            .select({
                tag: tags.tag,
                tagCount: count(characterTags.tag_id),
            })
            .from(tags)
            .leftJoin(characterTags, eq(characterTags.tag_id, tags.id))
            .groupBy(tags.tag)
            .where(notInArray(tags.tag, hiddenTags)),
        [hiddenTags]
    )

    useFocusEffect(
        useCallback(() => {
            if (!showSearch) return
            const handler = BackHandler.addEventListener('hardwareBackPress', () => {
                setTextFilter('')
                setShowSearch(false)
                return true
            })
            return () => handler.remove()
        }, [showSearch])
    )

    const tabStyle = (active: boolean) => ({
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.m,
        backgroundColor: active ? color.primary._300 : color.neutral._200,
        borderRadius: borderRadius.xl,
    })

    const tabTextStyle = (active: boolean) => ({
        color: active ? color.text._100 : color.text._400,
        fontWeight: active ? ('600' as const) : ('400' as const),
    })

    return (
        <>
            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingLeft: 16,
                    paddingRight: 8,
                    paddingBottom: 12,
                }}>
                <View
                    style={{
                        columnGap: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                    }}>
                    <TouchableOpacity
                        style={tabStyle(activeTab === 'characters')}
                        onPress={() => onTabChange('characters')}>
                        <Text style={tabTextStyle(activeTab === 'characters')}>角色</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={tabStyle(activeTab === 'adventures')}
                        onPress={() => onTabChange('adventures')}>
                        <Text style={tabTextStyle(activeTab === 'adventures')}>游戏</Text>
                    </TouchableOpacity>
                </View>
                {activeTab === 'characters' && (
                    <View
                        style={{
                            flexDirection: 'row',
                            columnGap: 12,
                        }}>
                        <ThemedButton
                            iconName="tag"
                            variant="tertiary"
                            onPress={() => {
                                setShowTags(!showTags)
                                if (showTags) {
                                    setTagFilter([])
                                }
                            }}
                            iconStyle={{
                                color: showTags ? color.text._100 : color.text._700,
                            }}
                        />
                        <ThemedButton
                            variant="tertiary"
                            iconName={showSearch ? 'close' : 'search1'}
                            onPress={() => {
                                setShowSearch(!showSearch)
                            }}
                            iconSize={24}
                            delayLongPress={5000}
                            onLongPress={() => {
                                setUseTagHider(!useTagHider)
                                Logger.infoToast('隐藏已' + (!useTagHider ? '启用' : '关闭'))
                            }}
                        />
                    </View>
                )}
            </View>

            {activeTab === 'characters' && (
                <Animated.View layout={LinearTransition}>
                    {showSearch && (
                        <Animated.View
                            entering={FadeInUp}
                            exiting={FadeOutUp}
                            style={{ paddingHorizontal: 12, paddingBottom: 8, rowGap: 8 }}>
                            {showTags && data.length > 0 && (
                                <StringArrayEditor
                                    containerStyle={{ flex: 0 }}
                                    suggestions={data
                                        .sort((a, b) => b.tagCount - a.tagCount)
                                        .map((item) => item.tag)}
                                    label="标签"
                                    value={tagFilter}
                                    setValue={setTagFilter}
                                    placeholder="筛选标签..."
                                    filterOnly
                                    showSuggestionsOnEmpty
                                />
                            )}
                            <ThemedTextInput
                                containerStyle={{ flex: 0 }}
                                value={textFilter}
                                onChangeText={setTextFilter}
                                style={{
                                    color:
                                        resultLength === 0 ? color.text._700 : color.text._100,
                                }}
                                placeholder="搜索角色名..."
                            />
                            {(textFilter || tagFilter.length > 0) && (
                                <Text
                                    style={{
                                        marginTop: 8,
                                        color: color.text._400,
                                    }}>
                                    结果：{resultLength}
                                </Text>
                            )}
                        </Animated.View>
                    )}
                </Animated.View>
            )}
        </>
    )
}

export default CharacterListHeader
