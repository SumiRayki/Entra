import { AntDesign } from '@expo/vector-icons'
import { AppSettings } from '@lib/constants/GlobalValues'
import { Theme } from '@lib/theme/ThemeManager'
import { Href, useRouter } from 'expo-router'
import { FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import Animated, { Easing, SlideInLeft } from 'react-native-reanimated'

type ButtonData = {
    name: string
    path: Href
    icon?: keyof typeof AntDesign.glyphMap
}

type DrawerButtonProps = {
    item: ButtonData
    index: number
}

const DrawerButton = ({ item, index }: DrawerButtonProps) => {
    const styles = useStyles()
    const router = useRouter()
    const { color } = Theme.useTheme()
    return (
        <Animated.View
            key={index}
            entering={SlideInLeft.duration(500 + index * 30)
                .withInitialValues({ originX: index * -150 + -400 })
                .easing(Easing.out(Easing.exp))}>
            <TouchableOpacity
                style={styles.largeButton}
                onPress={() => {
                    router.push(item.path)
                }}>
                <AntDesign size={24} name={item.icon ?? 'question'} color={color.text._400} />
                <Text style={styles.largeButtonText}>{item.name}</Text>
            </TouchableOpacity>
        </Animated.View>
    )
}

const RouteList = () => {
    const [devMode, _] = useMMKVBoolean(AppSettings.DevMode)
    return (
        <FlatList
            showsVerticalScrollIndicator={false}
            data={__DEV__ || devMode ? [...paths, ...paths_dev] : paths}
            renderItem={({ item, index }) => <DrawerButton item={item} index={index} />}
            keyExtractor={(item) => item.path.toString()}
        />
    )
}

export default RouteList

const useStyles = () => {
    const { color, spacing, fontSize } = Theme.useTheme()
    return StyleSheet.create({
        largeButtonText: {
            fontSize: fontSize.xl,
            paddingVertical: spacing.l,
            paddingLeft: spacing.xl,
            color: color.text._100,
        },

        largeButton: {
            paddingLeft: spacing.xl,
            flexDirection: 'row',
            alignItems: 'center',
        },
    })
}

const paths: ButtonData[] = [
    {
        name: '指令格式',
        path: '/screens/FormattingManagerScreen',
        icon: 'profile',
    },
    {
        name: 'API 连接',
        path: '/screens/ConnectionsManagerScreen',
        icon: 'link',
    },
    {
        name: '关于',
        path: '/screens/AboutScreen',
        icon: 'infocirlceo',
    },
    {
        name: '设置',
        path: '/screens/AppSettingsScreen',
        icon: 'setting',
    },
]

const paths_dev: ButtonData[] = [
    {
        name: '[DEV] Components',
        path: '/screens/ComponentTestScreen',
    },
    {
        name: '[DEV] ColorTest',
        path: '/screens/ColorTestScreen',
    },
    {
        name: '[DEV] Markdown',
        path: '/screens/MarkdownTestScreen',
    },
]
