import { Instructs } from '@lib/state/Instructs'
import { SamplersManager } from '@lib/state/SamplerState'
import { DeviceType, getDeviceTypeAsync } from 'expo-device'
import {
    deleteAsync,
    documentDirectory,
    makeDirectoryAsync,
    readAsStringAsync,
    readDirectoryAsync,
} from 'expo-file-system'
import { router } from 'expo-router'
import { setBackgroundColorAsync as setUIBackgroundColor } from 'expo-system-ui'

import { AppSettings, AppSettingsDefault, Global } from '../constants/GlobalValues'
import { Characters } from '../state/Characters'
import { Chats } from '../state/Chat'
import { Logger } from '../state/Logger'
import { mmkv } from '../storage/MMKV'
import { Theme } from '../theme/ThemeManager'
import { AppDirectory } from './File'
import { patchAndroidText } from './PatchText'
import { lockScreenOrientation } from './Screen'

export const loadChatOnInit = async () => {
    if (!mmkv.getBoolean(AppSettings.ChatOnStartup)) return
    const newestChat = await Chats.db.query.chatNewest()
    if (!newestChat) return
    await Characters.useCharacterStore.getState().setCard(newestChat.character_id)
    await Chats.useChatState.getState().load(newestChat.id)
    router.push('/screens/ChatScreen')
}

const setAppDefaultSettings = () => {
    Object.keys(AppSettingsDefault).map((item) => {
        const data = mmkv.getBoolean(item)
        if (data !== undefined) return
        if (item === AppSettings.UnlockOrientation) {
            getDeviceTypeAsync().then((result) => {
                mmkv.set(item, result === DeviceType.TABLET)
            })
        } else mmkv.set(item, AppSettingsDefault[item as AppSettings])
    })
}

const createDefaultCard = async () => {
    if (!mmkv.getBoolean(AppSettings.CreateDefaultCard)) return
    const result = await Characters.db.query.cardList('character')
    if (result.length === 0) await Characters.createDefaultCard()
    mmkv.set(AppSettings.CreateDefaultCard, false)
}

export const generateDefaultDirectories = async () => {
    Object.values(AppDirectory).map(async (dir) => {
        await makeDirectoryAsync(`${dir}`, {})
            .then(() =>
                Logger.info(
                    `Successfully made directory: ${dir.replace(`${documentDirectory}`, '')}`
                )
            )
            .catch(() => {})
    })
}

const migratePresets_0_8_3_to_0_8_4 = async () => {
    const presetDir = `${documentDirectory}presets`
    const files = await readDirectoryAsync(presetDir).catch(() => [] as string[])
    if (files.length === 0) return

    files.map(async (item) => {
        try {
            const data = await readAsStringAsync(`${presetDir}/${item}`)
            SamplersManager.useSamplerStore.getState().addSamplerConfig({
                data: JSON.parse(data),
                name: item.replace('.json', ''),
            })
        } catch (e) {
            Logger.error(`Failed to migrate preset ${item}: ${e}`)
        }
    })
    await deleteAsync(presetDir)
}

const createDefaultUserData = async () => {
    const id = await Characters.db.mutate.createCard('User', 'user')
    Characters.useUserStore.getState().setCard(id)
}

const setDefaultUser = async () => {
    const userList = await Characters.db.query.cardList('user')
    if (!userList) {
        Logger.error(
            'User database is Invalid, this should not happen! Please report this occurence.'
        )
    } else if (userList?.length === 0) {
        Logger.warn('No Users exist, creating default Users')
        await createDefaultUserData()
    } else if (userList.length > 0 && !Characters.useUserStore.getState().card) {
        Characters.useUserStore.getState().setCard(userList[0].id)
    }
}

const setDefaultInstruct = () => {
    Instructs.db.query.instructList().then(async (list) => {
        if (!list) {
            Logger.error('Instruct database Invalid, this should not happen! Please report this!')
        } else if (list?.length === 0) {
            Logger.warn('No Instructs exist, creating default Instruct')
            const id = await Instructs.generateInitialDefaults()
            Instructs.useInstruct.getState().load(id)
        }
    })
}

export const startupApp = () => {
    console.log('[APP STARTED]: Entra')

    // Sets default preferences
    setAppDefaultSettings()
    generateDefaultDirectories()
    setDefaultUser()
    setDefaultInstruct()

    // Initialize the default card
    createDefaultCard()

    // patch for Bold Text bug
    patchAndroidText()

    // migrations for old versions
    migratePresets_0_8_3_to_0_8_4()

    lockScreenOrientation()

    const backgroundColor = Theme.useColorState.getState().color.neutral._100
    setUIBackgroundColor(backgroundColor)

    Logger.info('Resetting state values for startup.')
}
