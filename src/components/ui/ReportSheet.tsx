import { moderationService, ReportReason, ReportTargetType } from '@/services/api/ModerationService';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
            Alert.alert('Erro', error?.message || 'Não foi possível enviar a denúncia.');
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
                    >
                        <Text style={styles.optionText}>{r.label}</Text>
                        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                ))}

                {submitting && (
                    <View style={styles.loading}>
                        <ActivityIndicator color="#FF8C42" />
                    </View>
                )}

                <TouchableOpacity style={styles.cancel} onPress={onClose} disabled={submitting}>
                    <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 32,
    },
    handle: {
        alignSelf: 'center',
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E5E7EB',
        marginBottom: 16,
    },
    title: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
    subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4, marginBottom: 12 },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    optionText: { fontSize: 15, color: '#1A1A1A' },
    loading: { paddingVertical: 12 },
    cancel: { marginTop: 16, alignItems: 'center', paddingVertical: 12 },
    cancelText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
});
