import ThemedButton from '@components/buttons/ThemedButton'
import ThemedTextInput from '@components/input/ThemedTextInput'
import FadeBackrop from '@components/views/FadeBackdrop'
import {
    GeneratedImageResult,
    ImageGeneration,
    ImageGenerationTarget,
} from '@lib/image-generation/Seedream'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import * as DocumentPicker from 'expo-document-picker'
import { Image } from 'expo-image'
import * as MediaLibrary from 'expo-media-library'
import { useEffect, useMemo, useState } from 'react'
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native'

type ImageGenerationModalProps = {
    visible: boolean
    title: string
    defaultPrompt: string
    target: ImageGenerationTarget
    onClose: () => void
    onApplyAvatar?: (uri: string) => Promise<void> | void
    onApplyChatBackground?: (uri: string) => Promise<void> | void
}

type ReferenceImage = {
    uri: string
    mimeType?: string | null
    name?: string | null
}

const ImageGenerationModal: React.FC<ImageGenerationModalProps> = ({
    visible,
    title,
    defaultPrompt,
    target,
    onClose,
    onApplyAvatar,
    onApplyChatBackground,
}) => {
    const { color, spacing, borderRadius } = Theme.useTheme()
    const { width, height } = useWindowDimensions()
    const [prompt, setPrompt] = useState(defaultPrompt)
    const [referenceImage, setReferenceImage] = useState<ReferenceImage | null>(null)
    const [loading, setLoading] = useState(false)
    const [applying, setApplying] = useState(false)
    const [results, setResults] = useState<GeneratedImageResult[]>([])
    const [selectedId, setSelectedId] = useState<string | null>(null)

    useEffect(() => {
        if (!visible) return
        setPrompt(defaultPrompt)
        setResults([])
        setSelectedId(null)
        setReferenceImage(null)
        setLoading(false)
        setApplying(false)
    }, [defaultPrompt, visible])

    const selectedImage = useMemo(() => {
        return results.find((item) => item.id === selectedId) ?? results[0]
    }, [results, selectedId])

    const handlePickReferenceImage = async () => {
        const result = await DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: true,
            type: 'image/*',
        })
        if (result.canceled) return
        setReferenceImage(result.assets[0])
    }

    const handleGenerate = async () => {
        setLoading(true)
        try {
            const referenceImages = referenceImage?.uri
                ? [
                      await ImageGeneration.imageToDataUrl(
                          referenceImage.uri,
                          referenceImage.mimeType || undefined
                      ),
                  ]
                : undefined
            const generated = await ImageGeneration.generate({
                prompt,
                target,
                screenWidth: width,
                screenHeight: height,
                referenceImages,
            })
            setResults(generated)
            setSelectedId(generated[0]?.id ?? null)
        } catch (error) {
            Logger.errorToast(error instanceof Error ? error.message : '图像生成失败')
        } finally {
            setLoading(false)
        }
    }

    const persistSelection = async (prefix: string) => {
        if (!selectedImage) {
            Logger.errorToast('请先选择一张生成结果')
            return null
        }
        return await ImageGeneration.persistGeneratedImage(selectedImage.uri, prefix)
    }

    const handleSaveLocal = async () => {
        setApplying(true)
        try {
            const permission = await MediaLibrary.requestPermissionsAsync()
            if (!permission.granted) {
                Logger.errorToast('未获得相册权限')
                return
            }
            const localUri = await persistSelection('seedream-save')
            if (!localUri) return
            await MediaLibrary.saveToLibraryAsync(localUri)
            Logger.infoToast('图片已保存到本地相册')
        } catch (error) {
            Logger.errorToast(error instanceof Error ? error.message : '保存图片失败')
        } finally {
            setApplying(false)
        }
    }

    const handleApplyAvatar = async () => {
        if (!onApplyAvatar) return
        setApplying(true)
        try {
            const localUri = await persistSelection('seedream-avatar')
            if (!localUri) return
            await onApplyAvatar(localUri)
            onClose()
        } catch (error) {
            Logger.errorToast(error instanceof Error ? error.message : '应用头像失败')
        } finally {
            setApplying(false)
        }
    }

    const handleApplyBackground = async () => {
        if (!onApplyChatBackground) return
        setApplying(true)
        try {
            const localUri = await persistSelection('seedream-background')
            if (!localUri) return
            await onApplyChatBackground(localUri)
            onClose()
        } catch (error) {
            Logger.errorToast(error instanceof Error ? error.message : '应用聊天背景失败')
        } finally {
            setApplying(false)
        }
    }

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={onClose}>
            <FadeBackrop handleOverlayClick={onClose}>
                <View style={styles.centerWrap}>
                    <View
                        style={[
                            styles.modalCard,
                            {
                                backgroundColor: color.neutral._200,
                                borderRadius: borderRadius.xl,
                                padding: spacing.xl,
                            },
                        ]}>
                        <Text style={{ color: color.text._100, fontSize: 18, fontWeight: '600' }}>
                            {title}
                        </Text>

                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={{ rowGap: spacing.l, paddingBottom: spacing.s }}
                            showsVerticalScrollIndicator={false}>
                            <ThemedTextInput
                                label="提示词"
                                value={prompt}
                                onChangeText={setPrompt}
                                multiline
                                numberOfLines={8}
                                placeholder="输入图像生成提示词..."
                            />

                            <View style={styles.inlineRow}>
                                <ThemedButton
                                    label="重置为资料提示词"
                                    variant="tertiary"
                                    onPress={() => setPrompt(defaultPrompt)}
                                />
                                <ThemedButton
                                    label={referenceImage ? '更换参考图' : '添加参考图'}
                                    variant="secondary"
                                    iconName="picture"
                                    iconSize={18}
                                    onPress={handlePickReferenceImage}
                                />
                                <ThemedButton
                                    label="移除参考图"
                                    variant={referenceImage ? 'critical' : 'disabled'}
                                    iconName="delete"
                                    iconSize={18}
                                    onPress={() => setReferenceImage(null)}
                                />
                            </View>

                            {referenceImage && (
                                <View style={{ rowGap: 8 }}>
                                    <Text style={{ color: color.text._300 }}>
                                        {`已添加参考图：${referenceImage.name || '未命名图片'}`}
                                    </Text>
                                    <Image
                                        source={{ uri: referenceImage.uri }}
                                        style={{
                                            width: '100%',
                                            aspectRatio: 1,
                                            borderRadius: borderRadius.l,
                                            backgroundColor: color.neutral._100,
                                        }}
                                        contentFit="cover"
                                    />
                                </View>
                            )}

                            <ThemedButton
                                label={loading ? '生成中...' : '开始生成'}
                                variant={loading ? 'disabled' : 'secondary'}
                                iconName="rocket1"
                                iconSize={18}
                                onPress={handleGenerate}
                            />

                            {loading && (
                                <ActivityIndicator size="small" color={color.primary._400} />
                            )}

                            {!!selectedImage && (
                                <View style={{ rowGap: spacing.m }}>
                                    <Image
                                        source={{ uri: selectedImage.uri }}
                                        style={{
                                            width: '100%',
                                            aspectRatio: target === 'avatar' ? 1 : 9 / 16,
                                            borderRadius: borderRadius.l,
                                            backgroundColor: color.neutral._100,
                                        }}
                                        contentFit="cover"
                                    />

                                    <View style={styles.thumbnailRow}>
                                        {results.map((item) => {
                                            const selected = item.id === selectedImage.id
                                            return (
                                                <TouchableOpacity
                                                    key={item.id}
                                                    style={[
                                                        styles.thumbnailButton,
                                                        {
                                                            borderColor: selected
                                                                ? color.primary._500
                                                                : color.neutral._500,
                                                        },
                                                    ]}
                                                    onPress={() => setSelectedId(item.id)}>
                                                    <Image
                                                        source={{ uri: item.uri }}
                                                        style={styles.thumbnailImage}
                                                        contentFit="cover"
                                                    />
                                                </TouchableOpacity>
                                            )
                                        })}
                                    </View>

                                    <View style={styles.actionRow}>
                                        <ThemedButton
                                            label="保存到本地"
                                            variant={applying ? 'disabled' : 'secondary'}
                                            iconName="download"
                                            iconSize={18}
                                            onPress={handleSaveLocal}
                                        />
                                        {onApplyAvatar && (
                                            <ThemedButton
                                                label="设为头像"
                                                variant={applying ? 'disabled' : 'secondary'}
                                                iconName="user"
                                                iconSize={18}
                                                onPress={handleApplyAvatar}
                                            />
                                        )}
                                        {onApplyChatBackground && (
                                            <ThemedButton
                                                label="设为聊天背景"
                                                variant={applying ? 'disabled' : 'secondary'}
                                                iconName="picture"
                                                iconSize={18}
                                                onPress={handleApplyBackground}
                                            />
                                        )}
                                    </View>
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.footerRow}>
                            <ThemedButton label="关闭" variant="tertiary" onPress={onClose} />
                        </View>
                    </View>
                </View>
            </FadeBackrop>
        </Modal>
    )
}

export default ImageGenerationModal

const styles = StyleSheet.create({
    centerWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    modalCard: {
        width: '100%',
        maxWidth: 520,
        maxHeight: '88%',
        rowGap: 16,
    },
    inlineRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    thumbnailRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    thumbnailButton: {
        width: 72,
        height: 72,
        borderWidth: 2,
        borderRadius: 10,
        overflow: 'hidden',
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    actionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
})
