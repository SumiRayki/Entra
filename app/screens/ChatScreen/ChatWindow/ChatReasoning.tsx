import { AntDesign } from '@expo/vector-icons'
import { MarkdownStyle } from '@lib/markdown/Markdown'
import { Theme } from '@lib/theme/ThemeManager'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Markdown from 'react-native-markdown-display'

type ChatReasoningProps = {
    reasoning: string
    hasReasoning: boolean
    isThinking: boolean
}

const ChatReasoning: React.FC<ChatReasoningProps> = ({ reasoning, hasReasoning, isThinking }) => {
    const [expanded, setExpanded] = useState(false)
    const { markdown, rules, style } = MarkdownStyle.useCustomFormatting()
    const { color, spacing, borderRadius, fontSize } = Theme.useTheme()

    if (!hasReasoning) return null

    const title = isThinking ? '\u601d\u8003\u4e2d...' : '\u5df2\u6df1\u5ea6\u601d\u8003'
    const action = expanded ? '\u6536\u8d77' : '\u5c55\u5f00'
    const displayedReasoning = reasoning || (isThinking ? '\u6b63\u5728\u601d\u8003...' : '')

    return (
        <View style={{ marginBottom: spacing.m }}>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${title}, ${action}`}
                onPress={(event) => {
                    event.stopPropagation()
                    setExpanded((value) => !value)
                }}
                style={{
                    alignItems: 'center',
                    alignSelf: 'flex-start',
                    backgroundColor: color.neutral._300,
                    borderRadius: borderRadius.m,
                    flexDirection: 'row',
                    gap: spacing.sm,
                    paddingHorizontal: spacing.m,
                    paddingVertical: spacing.sm,
                }}>
                <AntDesign name="bulb1" size={14} color={color.text._400} />
                <Text
                    style={{
                        color: color.text._300,
                        fontSize: fontSize.s,
                        fontWeight: '500',
                    }}>
                    {title}
                </Text>
                <Text style={{ color: color.text._500, fontSize: fontSize.s }}>{action}</Text>
                <AntDesign name={expanded ? 'up' : 'down'} size={11} color={color.text._500} />
            </Pressable>

            {expanded && (
                <View
                    style={{
                        borderColor: color.neutral._500,
                        borderLeftWidth: 2,
                        marginTop: spacing.m,
                        paddingLeft: spacing.l,
                    }}>
                    <Markdown
                        mergeStyle={false}
                        markdownit={markdown}
                        rules={rules}
                        style={{
                            ...style,
                            body: {
                                ...style.body,
                                color: color.text._400,
                                fontSize: fontSize.m,
                            },
                        }}>
                        {displayedReasoning}
                    </Markdown>
                </View>
            )}
        </View>
    )
}

export default ChatReasoning
