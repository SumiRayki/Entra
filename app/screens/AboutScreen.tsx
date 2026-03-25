import ThemedButton from '@components/buttons/ThemedButton'
import HeaderTitle from '@components/views/HeaderTitle'
import { AppSettings } from '@lib/constants/GlobalValues'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import appConfig from 'app.config'
import React, { useState } from 'react'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

const AboutScreen = () => {
    const styles = useStyles()
    const { spacing } = Theme.useTheme()
    const [counter, setCounter] = useState<number>(0)
    const [devMode, setDevMode] = useMMKVBoolean(AppSettings.DevMode)

    const updateCounter = () => {
        if (devMode) return
        if (counter === 6) {
            Logger.infoToast(`已启用开发者模式。`)
            setDevMode(true)
        }
        setCounter(counter + 1)
    }

    const version = 'v' + appConfig.expo.version
    return (
        <View style={styles.container}>
            <HeaderTitle title="关于" />
            <TouchableOpacity activeOpacity={0.8} onPress={updateCounter}>
                <Image source={require('../../assets/images/icon.png')} style={styles.icon} />
            </TouchableOpacity>

            <Text style={styles.titleText}>Entra</Text>
            <Text style={styles.subtitleText}>
                {version} {devMode && '[开发者模式]'}
            </Text>
            {devMode && (
                <ThemedButton
                    label="关闭开发者模式"
                    variant="critical"
                    buttonStyle={{
                        marginTop: spacing.xl,
                    }}
                    onPress={() => {
                        setCounter(0)
                        setDevMode(false)
                        Logger.info('已关闭开发者模式')
                    }}
                />
            )}

            <Text style={styles.body}>
                Entra 是一款 AI 角色扮演聊天应用。{'\n'}
                支持多种远程 API 接口，畅享沉浸式角色扮演体验。
            </Text>
        </View>
    )
}

export default AboutScreen

const useStyles = () => {
    const { color, spacing } = Theme.useTheme()

    return StyleSheet.create({
        container: {
            paddingHorizontal: spacing.xl3,
            paddingBottom: spacing.xl2,
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1,
        },
        titleText: { color: color.text._100, fontSize: 32, marginTop: 16 },
        subtitleText: { color: color.text._400 },
        body: { color: color.text._100, marginTop: spacing.l, textAlign: 'center', lineHeight: 22 },
        icon: {
            width: 120,
            height: 120,
            borderRadius: 24,
        },
    })
}
