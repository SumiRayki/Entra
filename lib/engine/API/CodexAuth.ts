import { fetch } from 'expo/fetch'
import { nativeApplicationVersion } from 'expo-application'
import * as SecureStore from 'expo-secure-store'
import { atob } from 'react-native-quick-base64'

const CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann'
const ISSUER = 'https://auth.openai.com'
const AUTH_STORAGE_KEY = 'entra.codex.oauth'
const LOGIN_TIMEOUT_MS = 15 * 60 * 1000
const POLLING_SAFETY_MARGIN_MS = 3000
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000

const secureStoreOptions: SecureStore.SecureStoreOptions = {
    keychainService: 'entra.codex.oauth',
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
}

type TokenResponse = {
    id_token?: string
    access_token?: string
    refresh_token?: string
    expires_in?: number
}

type JwtClaims = {
    exp?: number
    email?: string
    chatgpt_account_id?: string
    organizations?: { id?: string }[]
    'https://api.openai.com/auth'?: {
        chatgpt_account_id?: string
        chatgpt_plan_type?: string
    }
}

export type CodexAuthSession = {
    accessToken: string
    refreshToken: string
    idToken: string
    accountId: string
    expiresAt: number
    email?: string
    planType?: string
}

export type CodexDeviceAuthorization = {
    deviceAuthId: string
    userCode: string
    verificationUrl: string
    intervalMs: number
}

let refreshPromise: Promise<CodexAuthSession> | undefined

const requestHeaders = {
    'Content-Type': 'application/json',
    'User-Agent': `Entra/${nativeApplicationVersion ?? 'unknown'}`,
}

export const beginCodexDeviceAuthorization = async (): Promise<CodexDeviceAuthorization> => {
    const response = await fetch(`${ISSUER}/api/accounts/deviceauth/usercode`, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({ client_id: CLIENT_ID }),
    })

    if (!response.ok) {
        throw new Error(`无法启动 ChatGPT 登录（HTTP ${response.status}）`)
    }

    const data = (await response.json()) as {
        device_auth_id?: string
        user_code?: string
        interval?: number | string
    }
    if (!data.device_auth_id || !data.user_code) {
        throw new Error('ChatGPT 登录服务返回了无效的设备码')
    }

    return {
        deviceAuthId: data.device_auth_id,
        userCode: data.user_code,
        verificationUrl: `${ISSUER}/codex/device`,
        intervalMs: Math.max(Number(data.interval) || 5, 1) * 1000,
    }
}

export const completeCodexDeviceAuthorization = async (
    authorization: CodexDeviceAuthorization,
    signal?: AbortSignal
): Promise<CodexAuthSession> => {
    const startedAt = Date.now()

    while (Date.now() - startedAt < LOGIN_TIMEOUT_MS) {
        throwIfAborted(signal)

        const response = await fetch(`${ISSUER}/api/accounts/deviceauth/token`, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify({
                device_auth_id: authorization.deviceAuthId,
                user_code: authorization.userCode,
            }),
            signal: signal,
        })

        if (response.ok) {
            const data = (await response.json()) as {
                authorization_code?: string
                code_verifier?: string
            }
            if (!data.authorization_code || !data.code_verifier) {
                throw new Error('ChatGPT 登录授权结果不完整')
            }
            return exchangeAuthorizationCode(data.authorization_code, data.code_verifier, signal)
        }

        if (response.status !== 403 && response.status !== 404) {
            throw new Error(`ChatGPT 登录失败（HTTP ${response.status}）`)
        }

        await wait(authorization.intervalMs + POLLING_SAFETY_MARGIN_MS, signal)
    }

    throw new Error('ChatGPT 登录已超时，请重新尝试')
}

export const getCodexAuthSession = async (): Promise<CodexAuthSession | null> => {
    const value = await SecureStore.getItemAsync(AUTH_STORAGE_KEY, secureStoreOptions)
    if (!value) return null

    try {
        const session = JSON.parse(value) as CodexAuthSession
        if (!session.accessToken || !session.refreshToken || !session.accountId) return null
        return session
    } catch {
        return null
    }
}

export const getCodexAccessCredentials = async (
    forceRefresh = false
): Promise<Pick<CodexAuthSession, 'accessToken' | 'accountId'>> => {
    const session = await getCodexAuthSession()
    if (!session) {
        throw new Error('尚未登录 ChatGPT，请先在 API 连接中完成授权')
    }

    if (!forceRefresh && session.expiresAt > Date.now() + TOKEN_REFRESH_MARGIN_MS) {
        return session
    }

    if (!refreshPromise) {
        refreshPromise = refreshSession(session).finally(() => {
            refreshPromise = undefined
        })
    }

    return refreshPromise
}

export const clearCodexAuthSession = async () => {
    await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY, secureStoreOptions)
}

const exchangeAuthorizationCode = async (
    code: string,
    codeVerifier: string,
    signal?: AbortSignal
) => {
    const response = await fetch(`${ISSUER}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formEncode({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: `${ISSUER}/deviceauth/callback`,
            client_id: CLIENT_ID,
            code_verifier: codeVerifier,
        }),
        signal: signal,
    })

    if (!response.ok) {
        throw new Error(`ChatGPT 令牌交换失败（HTTP ${response.status}）`)
    }

    return persistTokenResponse((await response.json()) as TokenResponse)
}

const refreshSession = async (session: CodexAuthSession) => {
    const response = await fetch(`${ISSUER}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: CLIENT_ID,
            grant_type: 'refresh_token',
            refresh_token: session.refreshToken,
        }),
    })

    if (!response.ok) {
        throw new Error(`ChatGPT 登录已失效，请退出后重新登录（HTTP ${response.status}）`)
    }

    return persistTokenResponse((await response.json()) as TokenResponse, session)
}

const persistTokenResponse = async (
    tokens: TokenResponse,
    previous?: CodexAuthSession
): Promise<CodexAuthSession> => {
    const accessToken = tokens.access_token ?? previous?.accessToken
    const refreshToken = tokens.refresh_token ?? previous?.refreshToken
    const idToken = tokens.id_token ?? previous?.idToken ?? ''

    if (!accessToken || !refreshToken) {
        throw new Error('ChatGPT 登录服务没有返回完整令牌')
    }

    const idClaims = parseJwtClaims(idToken)
    const accessClaims = parseJwtClaims(accessToken)
    const claims = idClaims ?? accessClaims
    const accountId =
        extractAccountId(idClaims) ?? extractAccountId(accessClaims) ?? previous?.accountId

    if (!accountId) {
        throw new Error('无法识别 ChatGPT 账户')
    }

    const expiresAt =
        getJwtExpiry(accessClaims) ??
        (tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined) ??
        previous?.expiresAt ??
        Date.now() + 60 * 60 * 1000
    const session: CodexAuthSession = {
        accessToken: accessToken,
        refreshToken: refreshToken,
        idToken: idToken,
        accountId: accountId,
        expiresAt: expiresAt,
        email: claims?.email ?? previous?.email,
        planType: claims?.['https://api.openai.com/auth']?.chatgpt_plan_type ?? previous?.planType,
    }

    await SecureStore.setItemAsync(AUTH_STORAGE_KEY, JSON.stringify(session), secureStoreOptions)
    return session
}

const parseJwtClaims = (token?: string): JwtClaims | undefined => {
    if (!token) return
    const parts = token.split('.')
    if (parts.length !== 3) return

    try {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
        const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
        const binary = atob(padded)
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
        return JSON.parse(new TextDecoder().decode(bytes)) as JwtClaims
    } catch {}
}

const extractAccountId = (claims?: JwtClaims) => {
    return (
        claims?.chatgpt_account_id ??
        claims?.['https://api.openai.com/auth']?.chatgpt_account_id ??
        claims?.organizations?.[0]?.id
    )
}

const getJwtExpiry = (claims?: JwtClaims) => {
    return typeof claims?.exp === 'number' ? claims.exp * 1000 : undefined
}

const formEncode = (values: Record<string, string>) => {
    return Object.entries(values)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&')
}

const wait = (duration: number, signal?: AbortSignal) => {
    return new Promise<void>((resolve, reject) => {
        const onAbort = () => {
            clearTimeout(timeout)
            reject(new Error('登录已取消'))
        }
        const timeout = setTimeout(() => {
            signal?.removeEventListener('abort', onAbort)
            resolve()
        }, duration)
        signal?.addEventListener('abort', onAbort, { once: true })
    })
}

const throwIfAborted = (signal?: AbortSignal) => {
    if (signal?.aborted) throw new Error('登录已取消')
}
