import HeartbeatButton from '@components/buttons/HeartbeatButton'
import ThemedButton from '@components/buttons/ThemedButton'
import DropdownSheet from '@components/input/DropdownSheet'
import MultiDropdownSheet from '@components/input/MultiDropdownSheet'
import ThemedTextInput from '@components/input/ThemedTextInput'
import { CLAUDE_VERSION } from '@lib/constants/GlobalValues'
import { minimaxModelFallbacks } from '@lib/engine/API/DefaultAPI'
import { APIManagerValue, APIManager } from '@lib/engine/API/APIManagerState'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { Stack, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/react/shallow'

const AddConnection = () => {
    const styles = useStyles()
    const router = useRouter()
    const { addValue, getTemplates } = APIManager.useConnectionsStore(
        useShallow((state) => ({
            getTemplates: state.getTemplates,
            addValue: state.addValue,
        }))
    )

    const [template, setTemplate] = useState(getTemplates()[0])
    const [values, setValues] = useState<APIManagerValue>({
        ...template.defaultValues,
        configName: template.name,
        friendlyName: 'New API',
        active: true,
    })
    const [modelList, setModelList] = useState<any[]>([])

    const handleGetModelList = async () => {
        if (!template.features.useModel) return

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
            if (template.name === 'MiniMax') {
                setModelList(minimaxModelFallbacks)
            }
            Logger.error(`无法获取模型列表：${data?.error?.message}`)
            return
        }
        const models = getNestedValue(data, template.model.modelListParser)
        const isArray = Array.isArray(models)
        if (!models || !isArray) {
            if (template.name === 'MiniMax') {
                setModelList(minimaxModelFallbacks)
            }
            Logger.warn('无法解析模型列表！')
            if (!models) {
                Logger.error('模型列表返回空值')
            } else if (!isArray)
                Logger.error(
                    'Models resulted in an non-array value. `modelListParser` of template is likely incorrect'
                )
            return
        }
        setModelList(models)
    }

    useEffect(() => {
        handleGetModelList()
    }, [template])

    return (
        <SafeAreaView edges={['bottom']} style={styles.mainContainer}>
            <Stack.Screen options={{ title: '添加连接' }} />
            <KeyboardAwareScrollView
                bottomOffset={16}
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                contentContainerStyle={{ rowGap: 16, paddingBottom: 24 }}>
                <DropdownSheet
                    style={{ marginBottom: 8 }}
                    data={getTemplates()}
                    labelExtractor={(template) => template.name}
                    selected={template}
                    onChangeValue={(item) => {
                        setTemplate(item)
                        setModelList([])
                        setValues({
                            ...item.defaultValues,
                            friendlyName: values.friendlyName,
                            active: true,
                            configName: item.name,
                            model: item.defaultValues.model,
                        })
                    }}
                    modalTitle="选择连接类型"
                    search
                />

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
                        label="API 密钥"
                        secureTextEntry
                        value={values.key}
                        onChangeText={(value) => {
                            setValues({ ...values, key: value })
                        }}
                    />
                )}

                {template.features.useModel && (
                    <View>
                        <Text style={styles.title}>模型</Text>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                columnGap: 8,
                                marginTop: 8,
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
                        <Text style={styles.hintText}>发送给 Claude 的默认首条消息</Text>
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
            </KeyboardAwareScrollView>
            <ThemedButton
                label="创建 API"
                onPress={() => {
                    addValue(values)
                    router.back()
                }}
            />
        </SafeAreaView>
    )
}

export default AddConnection

const useStyles = () => {
    const { color, spacing } = Theme.useTheme()
    return StyleSheet.create({
        mainContainer: {
            marginVertical: spacing.xl,
            paddingVertical: spacing.xl,
            paddingHorizontal: spacing.xl,
            flex: 1,
        },

        title: {
            paddingTop: spacing.m,
            color: color.text._100,
            fontSize: spacing.xl,
        },

        hintText: {
            marginTop: spacing.s,
            color: color.text._400,
        },

        modelInfo: {
            borderRadius: spacing.m,
            backgroundColor: color.neutral._200,
            flex: 1,
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.l,
            paddingBottom: spacing.xl2,
        },
    })
}

const getNestedValue = (obj: any, path: string) => {
    if (path === '') return obj
    const keys = path.split('.')
    const value = keys.reduce((acc, key) => acc?.[key], obj)
    return value ?? null
}
