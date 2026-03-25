import ThemedButton from '@components/buttons/ThemedButton'
import SectionTitle from '@components/text/SectionTitle'
import Alert from '@components/views/Alert'
import { useBackgroundStore } from '@lib/state/BackgroundImage'
import { useRouter } from 'expo-router'
import React from 'react'
import { View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

const StyleSettings = () => {
    const router = useRouter()

    const { chatBackground, importBackground, deleteBackground } = useBackgroundStore(
        useShallow((state) => ({
            chatBackground: state.image,
            importBackground: state.importImage,
            deleteBackground: state.removeImage,
        }))
    )

    return (
        <View style={{ rowGap: 8 }}>
            <SectionTitle>外观</SectionTitle>

            <ThemedButton
                label="更换主题"
                variant="secondary"
                onPress={() => router.push('/screens/AppSettingsScreen/ColorSelector')}
            />
            <ThemedButton
                label={chatBackground ? '更换聊天背景' : '导入聊天背景'}
                variant="secondary"
                onPress={importBackground}
            />
            {chatBackground && (
                <ThemedButton
                    label="删除聊天背景"
                    variant="critical"
                    onPress={() =>
                        Alert.alert({
                            title: '删除背景',
                            description:
                                '确定要删除此背景吗？此操作无法撤销！',
                            buttons: [
                                { label: '取消' },
                                {
                                    label: '删除背景',
                                    type: 'warning',
                                    onPress: deleteBackground,
                                },
                            ],
                        })
                    }
                />
            )}
        </View>
    )
}

export default StyleSettings
