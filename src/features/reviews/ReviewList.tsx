import { ReportSheet } from '@/components/ui/ReportSheet';
import { EventReview } from '@/entities/event/types';
import { useBlockedIds } from '@/hooks/useBlockedIds';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ReviewListProps {
    reviews: EventReview[];
    onDelete?: (reviewId: string) => void;
    currentUserId?: string;
}

export function ReviewList({ reviews, onDelete, currentUserId }: ReviewListProps) {
    const blockedIds = useBlockedIds();
    const [reportReviewId, setReportReviewId] = useState<string | null>(null);

    // Oculta avaliações de usuários bloqueados (filtro client-side).
    const visibleReviews = (reviews || []).filter((r) => !blockedIds.has(r.userId));

    if (visibleReviews.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhuma avaliação ainda.</Text>
            </View>
        );
    }

    const renderItem = ({ item }: { item: EventReview }) => (
        <View style={styles.reviewItem}>
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    <Image
                        source={{ uri: item.user?.avatarUrl || 'https://via.placeholder.com/40' }}
                        style={styles.avatar}
                    />
                    <View style={styles.userText}>
                        <Text style={styles.userName}>{item.user?.fullName || 'Usuário'}</Text>
                        <Text style={styles.date}>
                            {format(new Date(item.createdAt), "d 'de' MMMM, yyyy", { locale: ptBR })}
                        </Text>
                    </View>
                </View>
                {currentUserId === item.userId && onDelete ? (
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => onDelete(item.id)}
                        accessibilityRole="button"
                        accessibilityLabel="Excluir avaliação"
                    >
                        <Ionicons name="trash-outline" size={18} color={Palette.danger} />
                    </TouchableOpacity>
                ) : currentUserId && currentUserId !== item.userId ? (
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => setReportReviewId(item.id)}
                        accessibilityRole="button"
                        accessibilityLabel="Denunciar avaliação"
                    >
                        <Ionicons name="flag-outline" size={18} color={Palette.muted} />
                    </TouchableOpacity>
                ) : null}
            </View>
            <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                        key={star}
                        name={star <= item.rating ? 'star' : 'star-outline'}
                        size={16}
                        color={star <= item.rating ? Palette.star : Palette.subtle}
                    />
                ))}
            </View>
            {item.comment && <Text style={styles.comment}>{item.comment}</Text>}
        </View>
    );

    return (
        <View style={styles.container}>
            {visibleReviews.map((item) => (
                <View key={item.id} style={styles.wrapper}>
                    {renderItem({ item })}
                </View>
            ))}

            <ReportSheet
                visible={reportReviewId !== null}
                onClose={() => setReportReviewId(null)}
                targetType="REVIEW"
                targetId={reportReviewId ?? ''}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: Spacing.lg,
        gap: Spacing.md,
    },
    wrapper: {},
    emptyContainer: {
        padding: Spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        color: Palette.inkSoft,
        fontSize: 14,
    },
    reviewItem: {
        backgroundColor: Palette.surface,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        padding: 14,
        gap: Spacing.sm,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    userInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    userText: {
        flex: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: Spacing.md,
        backgroundColor: Palette.track,
    },
    userName: {
        fontSize: 15,
        fontWeight: '800',
        color: Palette.ink,
    },
    date: {
        fontSize: 12,
        color: Palette.muted,
        marginTop: 1,
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.full,
        backgroundColor: Palette.paper,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ratingContainer: {
        flexDirection: 'row',
        gap: 2,
    },
    comment: {
        fontSize: 14,
        color: Palette.inkSoft,
        lineHeight: 21,
    },
});
