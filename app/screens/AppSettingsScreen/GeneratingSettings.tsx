import ThemedSwitch from '@components/input/ThemedSwitch'
import SectionTitle from '@components/text/SectionTitle'
import { AppSettings } from '@lib/constants/GlobalValues'
import React from 'react'
import { View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

const GeneratingSettings = () => {
    const [printContext, setPrintContext] = useMMKVBoolean(AppSettings.PrintContext)
    const [bypassContextLength, setBypassContextLength] = useMMKVBoolean(
        AppSettings.BypassContextLength
    )
    return (
        <View style={{ rowGap: 8 }}>
            <SectionTitle>生成</SectionTitle>

            <ThemedSwitch
                label="打印上下文"
                value={printContext}
                onChangeValue={setPrintContext}
                description="将生成上下文输出到日志用于调试"
            />

            <ThemedSwitch
                label="绕过上下文长度"
                value={bypassContextLength}
                onChangeValue={setBypassContextLength}
                description="构建提示词时忽略上下文长度限制"
            />
        </View>
    )
}

export default GeneratingSettings
