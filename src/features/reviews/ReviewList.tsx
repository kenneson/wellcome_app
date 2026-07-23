import { ReportSheet } from '@/components/ui/ReportSheet';
import { EventReview } from '@/entities/event/types';
import { useBlockedIds } from '@/hooks/useBlockedIds';
import { Ionicons } from '@expo/vector-icons';
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
                    <View>
                        <Text style={styles.userName}>{item.user?.fullName || 'Usuário'}</Text>
                        <Text style={styles.date}>
                            {format(new Date(item.createdAt), "d 'de' MMMM, yyyy", { locale: ptBR })}
                        </Text>
                    </View>
                </View>
                {currentUserId === item.userId && onDelete ? (
                    <TouchableOpacity onPress={() => onDelete(item.id)}>
                        <Ionicons name="trash-outline" size={20} color="#FF4B4B" />
                    </TouchableOpacity>
                ) : currentUserId && currentUserId !== item.userId ? (
                    <TouchableOpacity onPress={() => setReportReviewId(item.id)}>
                        <Ionicons name="flag-outline" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                ) : null}
            </View>
            <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                        key={star}
                        name={star <= item.rating ? 'star' : 'star-outline'}
                        size={16}
                        color="#FFD700"
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
        marginTop: 16,
    },
    wrapper: {
        marginBottom: 16,
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: '#666',
        fontSize: 14,
    },
    reviewItem: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: '#F0F0F0',
    },
    userName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    date: {
        fontSize: 12,
        color: '#999',
    },
    ratingContainer: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    comment: {
        fontSize: 14,
        color: '#444',
        lineHeight: 20,
    },
});
