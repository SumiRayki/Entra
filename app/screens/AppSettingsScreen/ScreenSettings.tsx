import ThemedSwitch from '@components/input/ThemedSwitch'
import SectionTitle from '@components/text/SectionTitle'
import { AppSettings } from '@lib/constants/GlobalValues'
import React from 'react'
import { View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

const ScreenSettings = () => {
    const [unlockOrientation, setUnlockOrientation] = useMMKVBoolean(AppSettings.UnlockOrientation)
    return (
        <View style={{ rowGap: 8 }}>
            <SectionTitle>屏幕</SectionTitle>
            <ThemedSwitch
                label="解锁屏幕方向"
                value={unlockOrientation}
                onChangeValue={setUnlockOrientation}
                description="允许横屏显示（需要重启应用）"
            />
        </View>
    )
}

export default ScreenSettings
