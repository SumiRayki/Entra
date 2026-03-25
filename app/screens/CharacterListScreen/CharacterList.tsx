import Drawer from '@components/views/Drawer'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import { CharacterSorter } from '@lib/state/CharacterSorter'
import { Characters, CharInfo } from '@lib/state/Characters'
const SYSTEM_MARKER = Characters.SYSTEM_CARD_MARKER
import { TagHider } from '@lib/state/TagHider'
import { db as database } from '@db'
import { adventures } from 'db/schema'
import { desc } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useState } from 'react'
import { Text, View } from 'react-native'
import Animated, { LinearTransition } from 'react-native-reanimated'
import { Theme } from '@lib/theme/ThemeManager'

import CharacterListHeader from './CharacterListHeader'
import CharacterListing from './CharacterListing'
import CharacterNewMenu from './CharacterNewMenu'
import CharactersEmpty from './CharactersEmpty'
import CharactersSearchEmpty from './CharactersSearchEmpty'
import AdventureListing from './AdventureListing'

const PAGE_SIZE = 30

type ListTab = 'characters' | 'adventures'

const CharacterList: React.FC = () => {
    const [nowLoading, setNowLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<ListTab>('characters')
    const { showSearch, searchType, searchOrder, tagFilter, textFilter } =
        CharacterSorter.useSorter()
    const hiddenTags = TagHider.useHiddenTags()
    const [pages, setPages] = useState(3)
    const [previousLength, setPreviousLength] = useState(0)
    const { color } = Theme.useTheme()

    // Character list query
    const { data, updatedAt } = useLiveQuery(
        Characters.db.query.cardListQueryWindow(
            'character',
            searchType,
            searchOrder,
            PAGE_SIZE * pages,
            0,
            textFilter,
            tagFilter,
            hiddenTags
        ),
        [searchType, searchOrder, textFilter, tagFilter, hiddenTags, pages]
    )
    const characterList: CharInfo[] = data
        .map((item) => ({
            ...item,
            latestChat: item.chats[0]?.id,
            latestSwipe: item.chats[0]?.messages[0]?.swipes[0]?.swipe,
            latestName: item.chats[0]?.messages[0]?.name,
            last_modified: item.last_modified ?? 0,
            tags: item.tags.map((item) => item.tag.tag),
            creator_notes: item.creator_notes ?? '',
        }))
        .sort((a, b) => {
            const aSystem = a.creator_notes === SYSTEM_MARKER ? 0 : 1
            const bSystem = b.creator_notes === SYSTEM_MARKER ? 0 : 1
            return aSystem - bSystem
        })

    // Adventure list query
    const { data: adventureData } = useLiveQuery(
        database.query.adventures.findMany({
            orderBy: desc(adventures.last_modified),
        })
    )

    return (
        <View style={{ paddingTop: 16, paddingHorizontal: 8, flex: 1 }}>
            <HeaderTitle />
            <HeaderButton
                headerLeft={() => <Drawer.Button drawerID={Drawer.ID.SETTINGS} />}
                headerRight={() => (
                    <CharacterNewMenu nowLoading={nowLoading} setNowLoading={setNowLoading} />
                )}
            />

            <View style={{ flex: 1 }}>
                <CharacterListHeader
                    resultLength={characterList.length}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />

                {activeTab === 'characters' ? (
                    <>
                        <Animated.FlatList
                            layout={LinearTransition}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ rowGap: 8 }}
                            data={characterList}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <CharacterListing
                                    character={item}
                                    nowLoading={nowLoading}
                                    setNowLoading={setNowLoading}
                                />
                            )}
                            onEndReachedThreshold={1}
                            onEndReached={() => {
                                if (previousLength === data.length) {
                                    return
                                }
                                setPreviousLength(data.length)
                                setPages(pages + 1)
                            }}
                            windowSize={3}
                            onStartReachedThreshold={0.1}
                            onStartReached={() => {
                                setPages(3)
                            }}
                            ListEmptyComponent={() =>
                                data.length === 0 &&
                                !showSearch &&
                                updatedAt && <CharactersEmpty />
                            }
                        />
                        {characterList.length === 0 && data.length !== 0 && updatedAt && (
                            <CharactersSearchEmpty />
                        )}
                    </>
                ) : (
                    <Animated.FlatList
                        layout={LinearTransition}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ rowGap: 8 }}
                        data={adventureData ?? []}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <AdventureListing
                                adventure={item}
                                nowLoading={nowLoading}
                                setNowLoading={setNowLoading}
                            />
                        )}
                        ListEmptyComponent={() => (
                            <View
                                style={{
                                    flex: 1,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    paddingTop: 60,
                                }}>
                                <Text style={{ color: color.text._500, fontSize: 16 }}>
                                    暂无游戏，请通过角色创建大师或右上角菜单创建
                                </Text>
                            </View>
                        )}
                    />
                )}
            </View>
        </View>
    )
}

export default CharacterList
