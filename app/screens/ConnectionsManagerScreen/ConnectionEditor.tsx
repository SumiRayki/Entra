import HeartbeatButton from '@components/buttons/HeartbeatButton'
import ThemedButton from '@components/buttons/ThemedButton'
import DropdownSheet from '@components/input/DropdownSheet'
import MultiDropdownSheet from '@components/input/MultiDropdownSheet'
import ThemedTextInput from '@components/input/ThemedTextInput'
import FadeBackrop from '@components/views/FadeBackdrop'
import { CLAUDE_VERSION } from '@lib/constants/GlobalValues'
import { APIConfiguration } from '@lib/engine/API/APIBuilder.types'
import { APIManagerValue, APIManager } from '@lib/engine/API/APIManagerState'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { useEffect, useState } from 'react'
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, SlideOutDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/react/shallow'

type ConnectionEditorProps = {
    index: number
    show: boolean
    close: () => void
    originalValues: APIManagerValue
}

const ConnectionEditor: React.FC<ConnectionEditorProps> = ({
    index,
    show,
    close,
    originalValues,
}) => {
    const { color, spacing, fontSize } = Theme.useTheme()
    const styles = useStyles()

    const { editValue, getTemplates } = APIManager.useConnectionsStore(
        useShallow((state) => ({
            getTemplates: state.getTemplates,
            editValue: state.editValue,
        }))
    )

    const [template, setTemplate] = useState<APIConfiguration>(getTemplates()[0])

    const [values, setValues] = useState<APIManagerValue>(originalValues)
    const [modelList, setModelList] = useState<any[]>([])

    useEffect(() => {
        setValues(originalValues)
    }, [originalValues])

    useEffect(() => {
        const newTemplate = getTemplates().find((item) => item.name === values.configName)
        if (!newTemplate) {
            Logger.errorToast('无法获取有效模板！')
            close()
            return
        }

        setTemplate(newTemplate)
    }, [])

    const handleGetModelList = async () => {
        if (!template.features.useModel || !show) return
        const auth: any = {}
        if (template.features.useKey) {
            auth[template.request.authHeader] = template.request.authPrefix + values.key
            if (template.name === 'Claude') {
                auth['anthropic-version'] = CLAUDE_VERSION
            }
        }
        const result = await fetch(values.modelEndpoint, { headers: { ...auth } })
        const data = await result.json()
        if (result.status !== 200) {
            Logger.error(`无法获取模型列表：${data?.error?.message}`)
            return
        }
        const models = getNestedValue(data, template.model.modelListParser)
        setModelList(models)
    }

    useEffect(() => {
        handleGetModelList()
    }, [])

    return (
        <Modal
            transparent
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={close}
            visible={show}
            animationType="fade">
            <FadeBackrop
                handleOverlayClick={() => {
                    close()
                }}
            />

            <View style={{ flex: 1 }} />
            <Animated.View
                style={styles.mainContainer}
                entering={FadeIn.duration(100)}
                exiting={SlideOutDown.duration(300)}>
                <Text
                    style={{
                        color: color.text._100,
                        fontSize: fontSize.xl2,
                        fontWeight: '500',
                        paddingBottom: spacing.xl2,
                    }}>
                    编辑连接
                </Text>

                <ScrollView
                    style={{ flex: 1 }}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ rowGap: 16, paddingBottom: spacing.xl2 }}>
                    <ThemedTextInput
                        label="连接名称"
                        value={values.friendlyName}
                        onChangeText={(value) => {
                            setValues({ ...values, friendlyName: value })
                        }}
                    />

                    {template.ui.editableCompletionPath && (
                        <View>
                            <ThemedTextInput
                                label="补全接口地址"
                                value={values.endpoint}
                                onChangeText={(value) => {
                                    setValues({ ...values, endpoint: value })
                                }}
                            />
                            <Text style={styles.hintText}>注意：请使用完整 URL</Text>
                        </View>
                    )}

                    {template.ui.editableModelPath && (
                        <View>
                            <ThemedTextInput
                                label="模型接口地址"
                                value={values.modelEndpoint}
                                onChangeText={(value) => {
                                    setValues({ ...values, modelEndpoint: value })
                                }}
                            />
                            <HeartbeatButton
                                api={values.modelEndpoint ?? ''}
                                apiFormat={(s) => s}
                                headers={
                                    template.features.useKey
                                        ? {
                                              [template.request.authHeader]:
                                                  template.request.authPrefix + values.key,
                                          }
                                        : {}
                                }
                                callback={handleGetModelList}
                            />
                        </View>
                    )}

                    {template.features.useKey && (
                        <ThemedTextInput
                            secureTextEntry
                            label="API 密钥"
                            value={values.key}
                            onChangeText={(value) => {
                                setValues({ ...values, key: value })
                            }}
                        />
                    )}

                    {template.features.useModel && (
                        <View style={{ rowGap: 4 }}>
                            <Text style={styles.title}>模型</Text>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    columnGap: 8,
                                }}>
                                {!template.features.multipleModels && (
                                    <DropdownSheet
                                        containerStyle={{ flex: 1 }}
                                        selected={values.model}
                                        data={modelList}
                                        labelExtractor={(value) => {
                                            return getNestedValue(value, template.model.nameParser)
                                        }}
                                        onChangeValue={(item) => {
                                            setValues({ ...values, model: item })
                                        }}
                                        search={modelList.length > 10}
                                        modalTitle="选择模型"
                                    />
                                )}
                                {template.features.multipleModels && (
                                    <MultiDropdownSheet
                                        containerStyle={{ flex: 1 }}
                                        selected={values?.model ?? []}
                                        data={modelList}
                                        labelExtractor={(value) => {
                                            return getNestedValue(value, template.model.nameParser)
                                        }}
                                        onChangeValue={(item) => {
                                            setValues({ ...values, model: item })
                                        }}
                                        search={modelList.length > 10}
                                        modalTitle="选择模型"
                                    />
                                )}
                                <ThemedButton
                                    onPress={() => {
                                        handleGetModelList()
                                    }}
                                    iconName="reload1"
                                    iconSize={18}
                                    variant="secondary"
                                />
                            </View>
                        </View>
                    )}

                    {template.features.useFirstMessage && (
                        <View>
                            <ThemedTextInput
                                label="首条消息"
                                value={values.firstMessage}
                                onChangeText={(value) => {
                                    setValues({ ...values, firstMessage: value })
                                }}
                            />
                            <Text style={styles.hintText}>
                                发送给 Claude 的默认首条消息
                            </Text>
                        </View>
                    )}
                    {template.features.usePrefill && (
                        <View>
                            <ThemedTextInput
                                label="预填充"
                                value={values.prefill}
                                onChangeText={(value) => {
                                    setValues({ ...values, prefill: value })
                                }}
                            />
                            <Text style={styles.hintText}>在模型回复前预填充内容</Text>
                        </View>
                    )}
                </ScrollView>
                <ThemedButton
                    buttonStyle={{ marginTop: 8 }}
                    label="保存修改"
                    onPress={() => {
                        editValue(values, index)
                        close()
                    }}
                />
            </Animated.View>
        </Modal>
    )
}

export default ConnectionEditor

const useStyles = () => {
    const insets = useSafeAreaInsets()
    const { color, spacing, borderRadius } = Theme.useTheme()
    return StyleSheet.create({
        mainContainer: {
            marginVertical: spacing.xl,
            paddingTop: spacing.xl2,
            paddingBottom: insets.bottom,
            paddingHorizontal: spacing.xl,
            borderTopLeftRadius: borderRadius.xl,
            borderTopRightRadius: borderRadius.xl,
            minHeight: '70%',
            backgroundColor: color.neutral._100,
        },

        title: {
            color: color.text._100,
        },

        hintText: {
            marginTop: spacing.s,
            color: color.text._400,
        },
    })
}

const getNestedValue = (obj: any, path: string) => {
    if (path === '') return obj
    const keys = path.split('.')
    const value = keys.reduce((acc, key) => acc?.[key], obj)
    return value ?? null
}
