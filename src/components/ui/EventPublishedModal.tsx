import { AppIcon as Ionicons } from '@/components/ui/icon';
import { WellcomeButton } from '@/components/ui/wellcome';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Palette, Spacing } from '@/shared/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

interface EventPublishedModalProps {
    visible: boolean;
    eventTitle?: string;
    onGoToFeed: () => void;
    onViewEvent: () => void;
}

export function EventPublishedModal({
    visible,
    eventTitle,
    onGoToFeed,
    onViewEvent,
}: EventPublishedModalProps) {
    const reducedMotion = useReducedMotion();

    return (
        <Modal
            visible={visible}
            transparent
            animationType={reducedMotion ? 'none' : 'fade'}
            statusBarTranslucent
            onRequestClose={onGoToFeed}
        >
            <SafeAreaView
                style={styles.backdrop}
                edges={['top', 'bottom']}
            >
                <View
                    style={styles.dialog}
                    accessibilityViewIsModal
                >
                    <View style={styles.iconCircle}>
                        <Ionicons name="checkmark-circle" size={48} color={Palette.orangeDeep} />
                    </View>

                    <Text
                        style={styles.title}
                        accessibilityRole="header"
                    >
                        Parabéns! Seu evento está no ar
                    </Text>
                    <Text style={styles.body}>
                        {eventTitle
                            ? `“${eventTitle}” foi publicado com sucesso.`
                            : 'Seu evento foi publicado com sucesso.'}
                    </Text>

                    <View style={styles.note}>
                        <View style={styles.noteRow}>
                            <Ionicons name="compass-outline" size={20} color={Palette.orangeDeep} />
                            <Text style={styles.noteText}>
                                Ele já está disponível no feed para participantes da cidade escolhida.
                                Para gerenciar inscrições, acesse Perfil → Meus Eventos Criados.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.actions}>
                        <WellcomeButton
                            label="Ver meu evento"
                            variant="outline"
                            icon="eye-outline"
                            onPress={onViewEvent}
                        />
                        <WellcomeButton
                            label="Voltar para o feed"
                            icon="home-outline"
                            onPress={onGoToFeed}
                        />
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: Spacing.xl,
        backgroundColor: Palette.scrim,
    },
    dialog: {
        width: '100%',
        maxWidth: 420,
        alignSelf: 'center',
        borderRadius: 28,
        backgroundColor: Palette.surface,
        paddingHorizontal: Spacing.xxl,
        paddingTop: 28,
        paddingBottom: Spacing.xxl,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Palette.orangeSoft,
        marginBottom: Spacing.xl,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.3,
        textAlign: 'center',
        color: Palette.ink,
    },
    body: {
        marginTop: Spacing.md,
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        color: Palette.inkSoft,
    },
    note: {
        marginTop: Spacing.xl,
        padding: 14,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        backgroundColor: Palette.orangeSoft,
    },
    noteRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.md,
    },
    noteText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 21,
        color: Palette.orangeDarker,
    },
    actions: {
        marginTop: Spacing.xxl,
        gap: Spacing.md,
    },
});
