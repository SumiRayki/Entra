import HeaderTitle from '@components/views/HeaderTitle'
import { db } from '@db'
import { Theme } from '@lib/theme/ThemeManager'
import { loadChatOnInit, startupApp } from '@lib/utils/Startup'
import CharacterList from '@screens/CharacterListScreen'
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import { SplashScreen } from 'expo-router'
import { useEffect, useState } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'

import migrations from '../db/migrations/migrations'
import ThemedButton from '@components/buttons/ThemedButton'

const Home = () => {
    const styles = useStyles()
    const { success, error } = useMigrations(db, migrations)

    const [firstRender, setFirstRender] = useState<boolean>(true)

    useEffect(() => {
        if (success) {
            loadChatOnInit()
        }
    }, [success])

    useEffect(() => {
        if (success) {
            startupApp()
            setFirstRender(false)
            SplashScreen.hideAsync()
        }
        if (error) SplashScreen.hideAsync()
    }, [success, error])

    if (error)
        return (
            <View style={styles.centeredContainer}>
                <HeaderTitle />
                <Text style={styles.title}>数据库迁移失败</Text>
                <Text style={styles.errorLog}>{error.message}</Text>
                <Text style={styles.subtitle}>
                    遇到了严重错误，请截图此页面并反馈给开发者。
                </Text>
                <ThemedButton
                    variant="secondary"
                    label="反馈问题"
                    iconName="github"
                    iconSize={20}
                    onPress={() => {
                        Linking.openURL('https://github.com/Vali-98/ChatterUI')
                    }}
                />
            </View>
        )

    if (!firstRender && success) return <CharacterList />
    return <HeaderTitle />
}

export default Home

const useStyles = () => {
    const { color, spacing, fontSize } = Theme.useTheme()
    return StyleSheet.create({
        centeredContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },

        title: {
            color: color.text._300,
            fontSize: fontSize.xl2,
        },

        subtitle: {
            color: color.text._400,
            marginHorizontal: 32,
            textAlign: 'center',
        },

        errorLog: {
            color: color.text._400,
            fontSize: fontSize.s,
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.l,
            borderRadius: 12,
            margin: spacing.xl2,
            backgroundColor: 'black',
        },
    })
}
