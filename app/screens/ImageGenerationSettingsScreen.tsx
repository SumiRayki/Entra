import ThemedButton from '@components/buttons/ThemedButton'
import ThemedTextInput from '@components/input/ThemedTextInput'
import SectionTitle from '@components/text/SectionTitle'
import HeaderTitle from '@components/views/HeaderTitle'
import { ImageGeneration } from '@lib/image-generation/Seedream'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView } from 'react-native-safe-area-context'

const ImageGenerationSettingsScreen = () => {
    const { spacing, color } = Theme.useTheme()
    const [baseUrl, setBaseUrl] = useState('')
    const [apiKey, setApiKey] = useState('')
    const [model, setModel] = useState('')
    const [imageCount, setImageCount] = useState('4')

    useEffect(() => {
        const settings = ImageGeneration.getSettings()
        setBaseUrl(settings.baseUrl)
        setApiKey(settings.apiKey)
        setModel(settings.model)
        setImageCount(String(settings.imageCount))
    }, [])

    const handleSave = () => {
        const count = Number(imageCount)
        if (!Number.isInteger(count) || count < 1 || count > 4) {
            Logger.errorToast('单次生成张数必须是 1 到 4 的整数')
            return
        }

        ImageGeneration.saveSettings({
            baseUrl,
            apiKey,
            model,
            imageCount: count,
        })
        Logger.infoToast('图像生成设置已保存')
    }

    return (
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
            <KeyboardAwareScrollView
                style={{
                    marginVertical: spacing.xl2,
                    paddingHorizontal: spacing.xl2,
                }}
                contentContainerStyle={{ rowGap: spacing.l, paddingBottom: spacing.xl3 }}>
                <HeaderTitle title="图像生成" />

                <View style={{ rowGap: 8 }}>
                    <SectionTitle>API 设置</SectionTitle>
                    <Text style={{ color: color.text._400 }}>
                        当前实现按豆包 Seedream 路线接入。请填写可直接访问图片生成接口的 URL、API
                        Key 和模型名。
                    </Text>
                </View>

                <ThemedTextInput
                    label="Base URL"
                    value={baseUrl}
                    onChangeText={setBaseUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="https://ark.cn-beijing.volces.com/api/v3"
                />

                <ThemedTextInput
                    label="API Key"
                    value={apiKey}
                    onChangeText={setApiKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                    placeholder="输入图像生成 API Key"
                />

                <ThemedTextInput
                    label="模型"
                    value={model}
                    onChangeText={setModel}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="例如：doubao-seedream-5-0-lite-250821"
                />

                <ThemedTextInput
                    label="单次生成张数"
                    value={imageCount}
                    onChangeText={(value) => {
                        setImageCount(value.replace(/[^\d]/g, ''))
                    }}
                    keyboardType="number-pad"
                    placeholder="1 - 4"
                />

                <Text style={{ color: color.text._400 }}>
                    角色头像与聊天背景都会使用这里的配置。单次生成张数建议控制在 1 到 4。
                </Text>

                <ThemedButton label="保存设置" variant="secondary" onPress={handleSave} />
            </KeyboardAwareScrollView>
        </SafeAreaView>
    )
}

export default ImageGenerationSettingsScreen
