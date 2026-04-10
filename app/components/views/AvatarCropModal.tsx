import ThemedButton from '@components/buttons/ThemedButton'
import FadeBackrop from '@components/views/FadeBackdrop'
import Slider from '@react-native-community/slider'
import { Theme } from '@lib/theme/ThemeManager'
import { Image } from 'expo-image'
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'
import { useEffect, useMemo, useState } from 'react'
import {
    ActivityIndicator,
    Image as RNImage,
    Modal,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from 'react-native'

type AvatarCropModalProps = {
    visible: boolean
    imageUri: string
    onClose: () => void
    onApply: (uri: string) => Promise<void> | void
}

type ImageSize = {
    width: number
    height: number
}

const AvatarCropModal: React.FC<AvatarCropModalProps> = ({
    visible,
    imageUri,
    onClose,
    onApply,
}) => {
    const { color, spacing, borderRadius } = Theme.useTheme()
    const { width } = useWindowDimensions()
    const [imageSize, setImageSize] = useState<ImageSize | null>(null)
    const [zoom, setZoom] = useState(1)
    const [xRatio, setXRatio] = useState(0.5)
    const [yRatio, setYRatio] = useState(0.5)
    const [saving, setSaving] = useState(false)

    const frameSize = Math.min(width - spacing.xl3 * 2, 320)

    useEffect(() => {
        if (!visible || !imageUri) return
        setZoom(1)
        setXRatio(0.5)
        setYRatio(0.5)
        RNImage.getSize(
            imageUri,
            (imgWidth, imgHeight) => {
                setImageSize({ width: imgWidth, height: imgHeight })
            },
            () => {
                setImageSize(null)
            }
        )
    }, [visible, imageUri])

    const layout = useMemo(() => {
        if (!imageSize) return null

        const baseScale = Math.max(frameSize / imageSize.width, frameSize / imageSize.height)
        const displayScale = baseScale * zoom
        const displayWidth = imageSize.width * displayScale
        const displayHeight = imageSize.height * displayScale
        const maxPanX = Math.max(0, displayWidth - frameSize)
        const maxPanY = Math.max(0, displayHeight - frameSize)
        const offsetX = -maxPanX * xRatio
        const offsetY = -maxPanY * yRatio
        const cropSize = frameSize / displayScale
        const originX = Math.max(0, Math.min(imageSize.width - cropSize, -offsetX / displayScale))
        const originY = Math.max(0, Math.min(imageSize.height - cropSize, -offsetY / displayScale))

        return {
            displayWidth,
            displayHeight,
            offsetX,
            offsetY,
            cropSize,
            originX,
            originY,
        }
    }, [frameSize, imageSize, xRatio, yRatio, zoom])

    const handleApply = async () => {
        if (!imageUri || !layout) return
        setSaving(true)
        try {
            const result = await manipulateAsync(
                imageUri,
                [
                    {
                        crop: {
                            originX: Math.round(layout.originX),
                            originY: Math.round(layout.originY),
                            width: Math.round(layout.cropSize),
                            height: Math.round(layout.cropSize),
                        },
                    },
                    {
                        resize: {
                            width: 1024,
                            height: 1024,
                        },
                    },
                ],
                {
                    format: SaveFormat.PNG,
                    compress: 1,
                }
            )
            await onApply(result.uri)
        } finally {
            setSaving(false)
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
                            styles.panel,
                            {
                                backgroundColor: color.neutral._200,
                                borderRadius: borderRadius.xl,
                                padding: spacing.xl,
                                rowGap: spacing.l,
                            },
                        ]}>
                        <Text style={{ color: color.text._100, fontSize: 18, fontWeight: '600' }}>
                            裁剪头像
                        </Text>

                        <Text style={{ color: color.text._400 }}>
                            头像会按 1:1 方图保存。可通过缩放和位置滑块调整取景。
                        </Text>

                        <View
                            style={[
                                styles.cropFrame,
                                {
                                    width: frameSize,
                                    height: frameSize,
                                    borderRadius: borderRadius.l,
                                    borderColor: color.primary._400,
                                    backgroundColor: color.neutral._100,
                                },
                            ]}>
                            {!layout && (
                                <ActivityIndicator size="small" color={color.primary._400} />
                            )}
                            {layout && (
                                <Image
                                    source={{ uri: imageUri }}
                                    contentFit="fill"
                                    style={{
                                        width: layout.displayWidth,
                                        height: layout.displayHeight,
                                        transform: [
                                            { translateX: layout.offsetX },
                                            { translateY: layout.offsetY },
                                        ],
                                    }}
                                />
                            )}
                        </View>

                        <View style={styles.sliderGroup}>
                            <Text style={{ color: color.text._300 }}>缩放</Text>
                            <Slider
                                minimumValue={1}
                                maximumValue={3}
                                step={0.01}
                                minimumTrackTintColor={color.primary._500}
                                maximumTrackTintColor={color.neutral._500}
                                thumbTintColor={color.primary._400}
                                value={zoom}
                                onValueChange={setZoom}
                            />
                        </View>

                        <View style={styles.sliderGroup}>
                            <Text style={{ color: color.text._300 }}>水平位置</Text>
                            <Slider
                                minimumValue={0}
                                maximumValue={1}
                                step={0.001}
                                disabled={!layout || layout.displayWidth <= frameSize}
                                minimumTrackTintColor={color.primary._500}
                                maximumTrackTintColor={color.neutral._500}
                                thumbTintColor={color.primary._400}
                                value={xRatio}
                                onValueChange={setXRatio}
                            />
                        </View>

                        <View style={styles.sliderGroup}>
                            <Text style={{ color: color.text._300 }}>垂直位置</Text>
                            <Slider
                                minimumValue={0}
                                maximumValue={1}
                                step={0.001}
                                disabled={!layout || layout.displayHeight <= frameSize}
                                minimumTrackTintColor={color.primary._500}
                                maximumTrackTintColor={color.neutral._500}
                                thumbTintColor={color.primary._400}
                                value={yRatio}
                                onValueChange={setYRatio}
                            />
                        </View>

                        <View style={styles.buttonRow}>
                            <ThemedButton label="取消" variant="tertiary" onPress={onClose} />
                            <ThemedButton
                                label={saving ? '处理中...' : '应用头像'}
                                variant={layout && !saving ? 'secondary' : 'disabled'}
                                onPress={handleApply}
                            />
                        </View>
                    </View>
                </View>
            </FadeBackrop>
        </Modal>
    )
}

export default AvatarCropModal

const styles = StyleSheet.create({
    centerWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    panel: {
        width: '100%',
        maxWidth: 420,
    },
    cropFrame: {
        alignSelf: 'center',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    sliderGroup: {
        rowGap: 8,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        columnGap: 12,
    },
})
