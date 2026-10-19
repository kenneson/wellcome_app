import { moderationService, ReportReason, ReportTargetType } from '@/services/api/ModerationService';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { friendlyErrorMessage } from '@/shared/lib/errorMessages';

const REASONS: { value: ReportReason; label: string }[] = [
    { value: 'SPAM', label: 'Spam' },
    { value: 'HARASSMENT', label: 'Assédio ou bullying' },
    { value: 'INAPPROPRIATE_CONTENT', label: 'Conteúdo impróprio' },
    { value: 'SCAM', label: 'Golpe ou fraude' },
    { value: 'VIOLENCE', label: 'Violência ou discurso de ódio' },
    { value: 'OTHER', label: 'Outro motivo' },
];

interface ReportSheetProps {
    visible: boolean;
    onClose: () => void;
    targetType: ReportTargetType;
    targetId: string;
}

export function ReportSheet({ visible, onClose, targetType, targetId }: ReportSheetProps) {
    const [submitting, setSubmitting] = useState(false);

    async function submit(reason: ReportReason) {
        if (submitting) return;
        try {
            setSubmitting(true);
            await moderationService.report({ targetType, targetId, reason });
            onClose();
            Alert.alert('Denúncia enviada', 'Obrigado. Nossa equipe vai analisar o conteúdo.');
        } catch (error: any) {
            Alert.alert('Erro', friendlyErrorMessage(error, 'Não foi possível enviar a denúncia.'));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose} />
            <View style={styles.sheet}>
                <View style={styles.handle} />
                <Text style={styles.title}>Denunciar</Text>
                <Text style={styles.subtitle}>Por que você está denunciando?</Text>

                {REASONS.map((r) => (
                    <TouchableOpacity
                        key={r.value}
                        style={styles.option}
                        onPress={() => submit(r.value)}
                        disabled={submitting}
                        accessibilityRole="button"
                        accessibilityLabel={r.label}
                    >
                        <Text style={styles.optionText}>{r.label}</Text>
                        <Ionicons name="chevron-forward" size={18} color={Palette.muted} />
                    </TouchableOpacity>
                ))}

                {submitting && (
                    <View style={styles.loading}>
                        <ActivityIndicator color={Palette.orange} />
                    </View>
                )}

                <TouchableOpacity style={styles.cancel} onPress={onClose} disabled={submitting} accessibilityRole="button">
                    <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: Palette.scrim },
    sheet: {
        backgroundColor: Palette.paper,
        borderTopLeftRadius: BorderRadius.sheet,
        borderTopRightRadius: BorderRadius.sheet,
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.xxxl,
    },
    handle: {
        alignSelf: 'center',
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: Palette.line,
        marginBottom: Spacing.lg,
    },
    title: { fontSize: 20, fontWeight: '800', color: Palette.ink },
    subtitle: { fontSize: 14, color: Palette.inkSoft, marginTop: 4, marginBottom: Spacing.md },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 52,
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.sm,
        backgroundColor: Palette.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
    },
    optionText: { fontSize: 15, fontWeight: '600', color: Palette.ink },
    loading: { paddingVertical: Spacing.md },
    cancel: {
        marginTop: Spacing.sm,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Palette.line,
        backgroundColor: Palette.surface,
    },
    cancelText: { fontSize: 15, fontWeight: '800', color: Palette.ink },
});
