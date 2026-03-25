import ThemedButton from '@components/buttons/ThemedButton'
import SectionTitle from '@components/text/SectionTitle'
import Alert from '@components/views/Alert'
import { Characters } from '@lib/state/Characters'
import React from 'react'
import { View } from 'react-native'

import TagHiderSettings from './TagHiderSettings'

const CharacterSettings = () => {
    return (
        <View style={{ rowGap: 8 }}>
            <SectionTitle>角色管理</SectionTitle>
            <ThemedButton
                label="重新生成默认角色"
                variant="secondary"
                onPress={() => {
                    Alert.alert({
                        title: `重新生成默认角色`,
                        description: `这将在角色列表中添加默认的 AI 助手角色。`,
                        buttons: [
                            { label: '取消' },
                            {
                                label: '创建默认角色',
                                onPress: async () => await Characters.createDefaultCard(),
                            },
                        ],
                    })
                }}
            />
            <TagHiderSettings />
        </View>
    )
}

export default CharacterSettings
