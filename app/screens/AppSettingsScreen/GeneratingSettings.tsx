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
    const [autoCompressContext, setAutoCompressContext] = useMMKVBoolean(
        AppSettings.AutoCompressContext
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
            <ThemedSwitch
                label={'\u81ea\u52a8\u538b\u7f29\u5bf9\u8bdd\u4e0a\u4e0b\u6587'}
                value={autoCompressContext}
                onChangeValue={setAutoCompressContext}
                description={
                    '\u63a5\u8fd1\u4e0a\u4e0b\u6587\u4e0a\u9650\u65f6\u603b\u7ed3\u65e9\u671f\u5bf9\u8bdd\uff0c\u4e0d\u538b\u7f29\u89d2\u8272\u8bbe\u5b9a\u3001\u6545\u4e8b\u80cc\u666f\u548c\u5176\u4ed6\u524d\u7f6e\u63d0\u793a\u8bcd'
                }
            />
        </View>
    )
}

export default GeneratingSettings
