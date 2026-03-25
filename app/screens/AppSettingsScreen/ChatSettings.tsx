import ThemedSwitch from '@components/input/ThemedSwitch'
import SectionTitle from '@components/text/SectionTitle'
import { AppSettings } from '@lib/constants/GlobalValues'
import React from 'react'
import { View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

const ChatSettings = () => {
    const [firstMes, setFirstMes] = useMMKVBoolean(AppSettings.CreateFirstMes)
    const [chatOnStartup, setChatOnStartup] = useMMKVBoolean(AppSettings.ChatOnStartup)
    const [autoScroll, setAutoScroll] = useMMKVBoolean(AppSettings.AutoScroll)
    const [sendOnEnter, setSendOnEnter] = useMMKVBoolean(AppSettings.SendOnEnter)
    const [autoLoadUser, setAutoLoadUser] = useMMKVBoolean(AppSettings.AutoLoadUser)
    const [quickDelete, setQuickDelete] = useMMKVBoolean(AppSettings.QuickDelete)
    const [saveScroll, setSaveScroll] = useMMKVBoolean(AppSettings.SaveScrollPosition)
    const [autoTitle, setAutoTitle] = useMMKVBoolean(AppSettings.AutoGenerateTitle)
    const [alternate, setAlternate] = useMMKVBoolean(AppSettings.AlternatingChatMode)
    const [wide, setWide] = useMMKVBoolean(AppSettings.WideChatMode)

    const [showTokensPerSecond, setShowTokensPerSecond] = useMMKVBoolean(
        AppSettings.ShowTokenPerSecond
    )

    return (
        <View style={{ rowGap: 8 }}>
            <SectionTitle>聊天</SectionTitle>

            <ThemedSwitch
                label="自动滚动"
                value={autoScroll}
                onChangeValue={setAutoScroll}
                description="生成时自动滚动文本"
            />

            <ThemedSwitch
                label="使用首条消息"
                value={firstMes}
                onChangeValue={setFirstMes}
                description="关闭后新对话将从空白开始，某些模型需要此设置"
            />

            <ThemedSwitch
                label="启动时加载对话"
                value={chatOnStartup}
                onChangeValue={setChatOnStartup}
                description="启动时自动加载最近的对话"
            />

            <ThemedSwitch
                label="自动加载用户"
                value={autoLoadUser}
                onChangeValue={setAutoLoadUser}
                description="打开对话时自动加载创建对话时使用的用户"
            />

            <ThemedSwitch
                label="回车发送"
                value={sendOnEnter}
                onChangeValue={setSendOnEnter}
                description="按回车键发送消息"
            />

            <ThemedSwitch
                label="显示生成速度"
                value={showTokensPerSecond}
                onChangeValue={setShowTokensPerSecond}
                description="显示每秒生成的 Token 数"
            />

            <ThemedSwitch
                label="快速删除"
                value={quickDelete}
                onChangeValue={setQuickDelete}
                description="在聊天选项栏显示删除按钮"
            />

            <ThemedSwitch
                label="保存滚动位置"
                value={saveScroll}
                onChangeValue={setSaveScroll}
                description="自动恢复上次的滚动位置"
            />

            <ThemedSwitch
                label="自动生成标题"
                value={autoTitle}
                onChangeValue={setAutoTitle}
                description="自动为对话生成标题"
            />

            <ThemedSwitch
                label="宽屏聊天"
                value={wide}
                onChangeValue={setWide}
                description="移除边距以获得更宽的聊天区域"
            />

            <ThemedSwitch
                label="交替用户和角色位置"
                value={alternate}
                onChangeValue={setAlternate}
                description="角色消息左对齐，用户消息右对齐"
            />
        </View>
    )
}

export default ChatSettings
