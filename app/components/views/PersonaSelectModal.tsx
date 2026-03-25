import Avatar from '@components/views/Avatar'
import FadeBackrop from '@components/views/FadeBackdrop'
import ThemedButton from '@components/buttons/ThemedButton'
import { Characters } from '@lib/state/Characters'
import { Theme } from '@lib/theme/ThemeManager'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import React from 'react'
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

type PersonaSelectModalProps = {
    visible: boolean
    onClose: () => void
    onSelect: (userId: number) => void
}

const PersonaSelectModal: React.FC<PersonaSelectModalProps> = ({ visible, onClose, onSelect }) => {
    const styles = useStyles()
    const { data } = useLiveQuery(Characters.db.query.cardListQuery('user'))

    const currentUserId = Characters.useUserStore(useShallow((state) => state.id))

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={onClose}>
            <FadeBackrop handleOverlayClick={onClose}>
                <Animated.View style={styles.container} entering={FadeInDown.duration(150)}>
                    <View style={styles.content}>
                        <Text style={styles.title}>选择扮演角色</Text>
                        <Text style={styles.subtitle}>选择你在本次对话中要扮演的角色</Text>
                        {data.length === 0 ? (
                            <Text style={styles.emptyText}>
                                还没有创建角色档案，将使用默认身份进入对话
                            </Text>
                        ) : (
                            <FlatList
                                data={data}
                                style={styles.list}
                                keyExtractor={(item) => item.id.toString()}
                                showsVerticalScrollIndicator={false}
                                renderItem={({ item }) => {
                                    const isActive = item.id === currentUserId
                                    return (
                                        <TouchableOpacity
                                            style={[
                                                styles.personaItem,
                                                isActive && styles.personaItemActive,
                                            ]}
                                            onPress={() => onSelect(item.id)}>
                                            <Avatar
                                                targetImage={Characters.getImageDir(item.image_id)}
                                                style={styles.avatar}
                                            />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.personaName}>{item.name}</Text>
                                                {isActive && (
                                                    <Text style={styles.currentLabel}>当前角色</Text>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    )
                                }}
                            />
                        )}
                        <View style={styles.buttonRow}>
                            <ThemedButton label="取消" variant="tertiary" onPress={onClose} />
                            {data.length === 0 && (
                                <ThemedButton
                                    label="直接进入"
                                    variant="primary"
                                    onPress={() => onSelect(-1)}
                                />
                            )}
                        </View>
                    </View>
                </Animated.View>
            </FadeBackrop>
        </Modal>
    )
}

export default PersonaSelectModal

const useStyles = () => {
    const { color, spacing, borderRadius, fontSize } = Theme.useTheme()

    return StyleSheet.create({
        container: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        content: {
            backgroundColor: color.neutral._200,
            paddingHorizontal: spacing.xl2,
            paddingVertical: spacing.xl2,
            borderRadius: borderRadius.xl,
            width: '90%',
            maxHeight: '70%',
        },
        title: {
            color: color.text._100,
            fontSize: 20,
            fontWeight: '600',
            marginBottom: spacing.s,
        },
        subtitle: {
            color: color.text._400,
            fontSize: fontSize.m,
            marginBottom: spacing.xl,
        },
        emptyText: {
            color: color.text._500,
            fontSize: fontSize.m,
            textAlign: 'center',
            paddingVertical: spacing.xl2,
        },
        list: {
            maxHeight: 300,
        },
        personaItem: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: spacing.l,
            borderRadius: borderRadius.m,
            marginBottom: spacing.s,
            backgroundColor: color.neutral._300,
        },
        personaItemActive: {
            borderWidth: 2,
            borderColor: color.primary._500,
        },
        avatar: {
            width: 44,
            height: 44,
            borderRadius: 22,
            marginRight: spacing.l,
            backgroundColor: color.neutral._400,
        },
        personaName: {
            color: color.text._100,
            fontSize: fontSize.l,
            fontWeight: '500',
        },
        currentLabel: {
            color: color.primary._500,
            fontSize: fontSize.s,
            marginTop: 2,
        },
        buttonRow: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            marginTop: spacing.xl,
            columnGap: spacing.l,
        },
    })
}
