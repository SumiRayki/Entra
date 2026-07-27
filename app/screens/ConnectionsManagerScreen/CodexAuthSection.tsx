import ThemedButton from '@components/buttons/ThemedButton'
import {
    beginCodexDeviceAuthorization,
    clearCodexAuthSession,
    completeCodexDeviceAuthorization,
    getCodexAuthSession,
    type CodexAuthSession,
} from '@lib/engine/API/CodexAuth'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import * as Clipboard from 'expo-clipboard'
import { useEffect, useRef, useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'

type LoginState = 'loading' | 'signedOut' | 'starting' | 'waiting' | 'signedIn'

const CodexAuthSection = () => {
    const styles = useStyles()
    const abortController = useRef<AbortController | null>(null)
    const [loginState, setLoginState] = useState<LoginState>('loading')
    const [session, setSession] = useState<CodexAuthSession | null>(null)
    const [userCode, setUserCode] = useState('')

    useEffect(() => {
        getCodexAuthSession()
            .then((storedSession) => {
                setSession(storedSession)
                setLoginState(storedSession ? 'signedIn' : 'signedOut')
            })
            .catch((error) => {
                Logger.error(`读取 ChatGPT 登录状态失败：${error}`)
                setLoginState('signedOut')
            })

        return () => abortController.current?.abort()
    }, [])

    const login = async () => {
        abortController.current?.abort()
        const controller = new AbortController()
        abortController.current = controller
        setLoginState('starting')
        setUserCode('')

        try {
            const authorization = await beginCodexDeviceAuthorization()
            setUserCode(authorization.userCode)
            setLoginState('waiting')
            await Clipboard.setStringAsync(authorization.userCode)
            await Linking.openURL(authorization.verificationUrl)
            const nextSession = await completeCodexDeviceAuthorization(
                authorization,
                controller.signal
            )
            setSession(nextSession)
            setLoginState('signedIn')
            Logger.infoToast('ChatGPT 登录成功')
        } catch (error) {
            if (controller.signal.aborted) return
            const message = error instanceof Error ? error.message : String(error)
            Logger.errorToast(message)
            setLoginState('signedOut')
        }
    }

    const logout = async () => {
        abortController.current?.abort()
        await clearCodexAuthSession()
        setSession(null)
        setUserCode('')
        setLoginState('signedOut')
        Logger.infoToast('已退出 ChatGPT')
    }

    const copyCode = async () => {
        if (!userCode) return
        await Clipboard.setStringAsync(userCode)
        Logger.infoToast('登录码已复制')
    }

    const isBusy = loginState === 'starting' || loginState === 'waiting'

    return (
        <View style={styles.container}>
            <Text style={styles.title}>ChatGPT 授权</Text>
            {loginState === 'loading' && <Text style={styles.hint}>正在读取登录状态…</Text>}
            {loginState === 'signedOut' && (
                <>
                    <Text style={styles.hint}>
                        使用 ChatGPT Plus/Pro 所含的 Codex 额度，不会消耗 OpenAI API Key 余额。
                    </Text>
                    <ThemedButton
                        label="登录 ChatGPT"
                        iconName="login"
                        onPress={login}
                        variant="secondary"
                    />
                </>
            )}
            {isBusy && (
                <>
                    <Text style={styles.hint}>
                        {loginState === 'starting'
                            ? '正在创建登录请求…'
                            : '请在浏览器中登录并确认授权，然后返回 Entra。'}
                    </Text>
                    {!!userCode && (
                        <Pressable onPress={copyCode} style={styles.codeContainer}>
                            <Text selectable style={styles.code}>
                                {userCode}
                            </Text>
                            <Text style={styles.codeHint}>点击复制登录码</Text>
                        </Pressable>
                    )}
                    <ThemedButton
                        label="取消登录"
                        onPress={() => {
                            abortController.current?.abort()
                            setLoginState('signedOut')
                        }}
                        variant="tertiary"
                    />
                </>
            )}
            {loginState === 'signedIn' && (
                <>
                    <Text style={styles.status}>
                        已登录{session?.email ? `：${session.email}` : ' ChatGPT'}
                    </Text>
                    {!!session?.planType && (
                        <Text style={styles.hint}>套餐：{session.planType}</Text>
                    )}
                    <ThemedButton label="退出 ChatGPT" onPress={logout} variant="critical" />
                </>
            )}
        </View>
    )
}

export default CodexAuthSection

const useStyles = () => {
    const { color, spacing, borderRadius, borderWidth, fontSize } = Theme.useTheme()
    return StyleSheet.create({
        container: {
            rowGap: spacing.m,
            borderColor: color.neutral._300,
            borderWidth: borderWidth.m,
            borderRadius: borderRadius.l,
            padding: spacing.l,
        },
        title: {
            color: color.text._100,
            fontSize: fontSize.l,
            fontWeight: '500',
        },
        hint: {
            color: color.text._400,
            lineHeight: 20,
        },
        status: {
            color: color.primary._700,
        },
        codeContainer: {
            alignItems: 'center',
            borderRadius: borderRadius.m,
            backgroundColor: color.neutral._200,
            paddingVertical: spacing.l,
        },
        code: {
            color: color.text._100,
            fontSize: fontSize.xl2,
            fontWeight: '600',
            letterSpacing: 2,
        },
        codeHint: {
            color: color.text._400,
            marginTop: spacing.s,
        },
    })
}
