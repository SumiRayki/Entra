import { AppSettings } from '@lib/constants/GlobalValues'
import { useDebounce } from '@lib/hooks/Debounce'
import { useBackgroundStore } from '@lib/state/BackgroundImage'
import { Chats } from '@lib/state/Chat'
import { AppDirectory } from '@lib/utils/File'
import { Image, ImageBackground } from 'expo-image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, LayoutChangeEvent, StyleSheet, View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

import Drawer from '@components/views/Drawer'
import HeaderTitle from '@components/views/HeaderTitle'
import { Characters } from '@lib/state/Characters'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useShallow } from 'zustand/react/shallow'
import { useInputHeightStore } from '../ChatInput'
import ChatEditor from './ChatEditor'
import ChatFooter from './ChatFooter'
import ChatItem from './ChatItem'

type ListItem = {
    index: number
    key: string
    isLastMessage: boolean
    isGreeting: boolean
}

const FADE_SOLID_RATIO = 0.6
const FADE_STEP_COUNT = 8

const ChatWindow = () => {
    const { chat } = Chats.useChat()
    const charId = Characters.useCharacterStore((state) => state.card?.id)
    const [saveScroll, _] = useMMKVBoolean(AppSettings.SaveScrollPosition)
    const [autoScroll, __] = useMMKVBoolean(AppSettings.AutoScroll)
    const [chatTopFade, ___] = useMMKVBoolean(AppSettings.ChatTopFade)
    const [overlayHeight, setOverlayHeight] = useState(0)
    const chatInputHeight = useInputHeightStore(useShallow((state) => state.height))
    const { data: { chat_background_image: chatBackgroundImage } = {} } = useLiveQuery(
        Characters.db.query.chatBackgroundImageQuery(charId ?? -1)
    )
    const flatlistRef = useRef<FlatList | null>(null)
    const { showSettings, showChat } = Drawer.useDrawerStore(
        useShallow((state) => ({
            showSettings: state.values?.[Drawer.ID.SETTINGS],
            showChat: state.values?.[Drawer.ID.CHATLIST],
        }))
    )

    const updateScrollPosition = useDebounce((position: number, chatId: number) => {
        if (chatId) {
            Chats.db.mutate.updateScrollOffset(chatId, position)
        }
    }, 200)

    useEffect(() => {
        if (!chat?.autoScroll) return
        const isSave = chat.autoScroll.cause === 'saveScroll'
        if (!saveScroll && isSave) return
        const offset = Math.min(
            Math.max(0, chat.autoScroll.index + (isSave ? 1 : 0)),
            chat.messages.length - 1
        )

        if (offset > 2)
            flatlistRef.current?.scrollToIndex({
                index: offset,
                animated: chat.autoScroll.cause === 'search',
                viewOffset: 32,
            })
    }, [chat?.id, chat?.autoScroll])
    const image = useBackgroundStore((state) => state.image)
    const backgroundUri = chatBackgroundImage
        ? Characters.getImageDir(chatBackgroundImage)
        : image
          ? AppDirectory.Assets + image
          : ''
    const solidFadeHeight = overlayHeight * FADE_SOLID_RATIO
    const fadeBandHeight = Math.max(0, overlayHeight - solidFadeHeight)
    const fadeSteps = useMemo(
        () =>
            Array.from({ length: FADE_STEP_COUNT }, (_, index) => ({
                key: `fade-step-${index}`,
                top: solidFadeHeight + (fadeBandHeight / FADE_STEP_COUNT) * index,
                height: fadeBandHeight / FADE_STEP_COUNT,
                opacity: 1 - (index + 1) / FADE_STEP_COUNT,
            })).filter((item) => item.height > 0 && item.opacity > 0),
        [fadeBandHeight, solidFadeHeight]
    )

    const list: ListItem[] = (chat?.messages ?? [])
        .map((item, index) => ({
            index: index,
            key: item.id.toString(),
            isGreeting: index === 0,
            isLastMessage: !!chat?.messages && index === chat?.messages.length - 1,
        }))
        .reverse()

    const renderItems = ({ item }: { item: ListItem }) => {
        return (
            <ChatItem
                index={item.index}
                isLastMessage={item.isLastMessage}
                isGreeting={item.isGreeting}
            />
        )
    }

    const handleListContainerLayout = (event: LayoutChangeEvent) => {
        const nextHeight = event.nativeEvent.layout.height
        if (nextHeight !== overlayHeight) {
            setOverlayHeight(nextHeight)
        }
    }

    return (
        <ImageBackground
            cachePolicy="none"
            style={{ flex: 1 }}
            source={{
                uri: backgroundUri,
            }}>
            <ChatEditor />
            <View style={styles.listContainer} onLayout={handleListContainerLayout}>
                <FlatList
                    ref={flatlistRef}
                    maintainVisibleContentPosition={
                        autoScroll ? null : { minIndexForVisible: 1, autoscrollToTopThreshold: 50 }
                    }
                    keyboardShouldPersistTaps="handled"
                    inverted
                    data={list}
                    keyExtractor={(item) => item.key}
                    renderItem={renderItems}
                    scrollEventThrottle={16}
                    onViewableItemsChanged={(item) => {
                        const index = item.viewableItems?.at(0)?.index

                        if (index && chat?.id)
                            updateScrollPosition(
                                index - (item.viewableItems.length === 1 ? 1 : 0),
                                chat.id
                            )
                    }}
                    onScrollToIndexFailed={(error) => {
                        flatlistRef.current?.scrollToOffset({
                            offset: error.averageItemLength * error.index,
                            animated: true,
                        })
                        setTimeout(() => {
                            if (list.length !== 0 && flatlistRef.current !== null) {
                                flatlistRef.current?.scrollToIndex({
                                    index: error.index,
                                    animated: true,
                                    viewOffset: 32,
                                })
                            }
                        }, 100)
                    }}
                    contentContainerStyle={{
                        paddingTop: chatInputHeight + 16,
                        rowGap: 16,
                    }}
                    ListFooterComponent={() => <ChatFooter />}
                />
                {chatTopFade && !!backgroundUri && overlayHeight > 0 && (
                    <View pointerEvents="none" style={styles.topFadeOverlay}>
                        <View
                            style={[
                                styles.fadeSliceContainer,
                                {
                                    top: 0,
                                    height: solidFadeHeight,
                                },
                            ]}>
                            <Image
                                cachePolicy="none"
                                source={{ uri: backgroundUri }}
                                style={[
                                    styles.fadeSliceImage,
                                    {
                                        height: overlayHeight,
                                        top: 0,
                                    },
                                ]}
                                contentFit="cover"
                            />
                        </View>
                        {fadeSteps.map((step) => (
                            <View
                                key={step.key}
                                style={[
                                    styles.fadeSliceContainer,
                                    {
                                        top: step.top,
                                        height: step.height,
                                    },
                                ]}>
                                <Image
                                    cachePolicy="none"
                                    source={{ uri: backgroundUri }}
                                    style={[
                                        styles.fadeSliceImage,
                                        {
                                            height: overlayHeight,
                                            top: -step.top,
                                            opacity: step.opacity,
                                        },
                                    ]}
                                    contentFit="cover"
                                />
                            </View>
                        ))}
                    </View>
                )}
            </View>
        </ImageBackground>
    )
}

export default ChatWindow

const styles = StyleSheet.create({
    listContainer: {
        flex: 1,
    },
    topFadeOverlay: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    fadeSliceContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        overflow: 'hidden',
    },
    fadeSliceImage: {
        position: 'absolute',
        left: 0,
        right: 0,
        width: '100%',
    },
})
