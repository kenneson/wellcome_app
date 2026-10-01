import { AppIcon } from '@/components/ui/icon';
import { BrandHeader, BrandSheet } from '@/components/ui/wellcome';
import { useMyProfile } from '@/hooks/useMyProfile';
import { registrationService } from '@/services/api/RegistrationService';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
import { DEFAULT_PLACEHOLDER_IMAGE } from '@/shared/lib/styles';
import { formatFirstName } from '@/utils/formatters';
import { getOptimizedImageUrl } from '@/utils/imageOptimizer';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type Segment = 'upcoming' | 'past';

const ACTIVE_STATUSES = new Set(['PENDING', 'APPROVED', 'WAITLIST']);

const STATUS_STYLE: Record<string, { label: string; background: string; color: string }> = {
    APPROVED: { label: 'CONFIRMADA', background: Palette.greenSoft, color: Palette.green },
    PENDING: { label: 'AGUARDANDO ANFITRIÃO', background: Palette.orangeSoft, color: Palette.orangeDarker },
    WAITLIST: { label: 'LISTA DE ESPERA', background: Palette.blueSoft, color: Palette.blue },
    REJECTED: { label: 'RECUSADA', background: Palette.track, color: Palette.inkSoft },
    CANCELLED: { label: 'CANCELADA', background: Palette.track, color: Palette.inkSoft },
    EXPIRED: { label: 'PRAZO EXPIRADO', background: Palette.track, color: Palette.inkSoft },
};

function eventTime(booking: any) {
    const time = new Date(booking.event?.eventDate ?? '').getTime();
    return Number.isNaN(time) ? null : time;
}

function formatWhen(date?: string) {
    if (!date) return 'Data a confirmar';
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) return 'Data a confirmar';
    const day = value.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace(/\./g, '');
    const time = value.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${day} · ${time}`;
}

export default function ReservationsScreen() {
    const router = useRouter();
    const { userId, data: profile, isLoading, refetch, isRefetching } = useMyProfile();
    const [segment, setSegment] = useState<Segment>('upcoming');
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    // Reference time for splitting upcoming/past; refreshed whenever the tab gains focus.
    const [now, setNow] = useState(() => Date.now());

    useFocusEffect(useCallback(() => {
        setNow(Date.now());
        if (userId) void refetch();
    }, [refetch, userId]));

    const { upcoming, past } = useMemo(() => {
        const bookings: any[] = profile?.bookings ?? [];
        const withDate = bookings.filter((booking) => eventTime(booking) !== null);

        return {
            upcoming: withDate
                .filter((booking) => eventTime(booking)! >= now && ACTIVE_STATUSES.has(booking.status))
                .sort((a, b) => eventTime(a)! - eventTime(b)!),
            past: withDate
                .filter((booking) => eventTime(booking)! < now || !ACTIVE_STATUSES.has(booking.status))
                .sort((a, b) => eventTime(b)! - eventTime(a)!),
        };
    }, [now, profile?.bookings]);

    const data = segment === 'upcoming' ? upcoming : past;

    const handleCancel = (booking: any) => {
        if (!userId || cancellingId) return;
        const eventId = booking.event?.id;
        // Mirrors backend CancellationPolicy: confirmed guests cancelling < 7 days before get 50% back.
        const lateCancellation = booking.status === 'APPROVED'
            && (eventTime(booking) ?? 0) - now < 7 * 24 * 60 * 60 * 1000;

        Alert.alert(
            'Cancelar reserva',
            lateCancellation
                ? 'Faltam menos de 7 dias para o evento. Se você já pagou, será devolvido 50% do valor; os outros 50% ficam como multa de cancelamento.'
                : 'Tem certeza que deseja cancelar? Se você já pagou, o valor será devolvido integralmente.',
            [
                { text: 'Manter reserva', style: 'cancel' },
                {
                    text: 'Sim, cancelar',
                    style: 'destructive',
                    onPress: async () => {
                        setCancellingId(booking.id);
                        try {
                            await registrationService.cancelBooking(eventId, userId);
                            await refetch();
                        } catch {
                            Alert.alert('Erro', 'Não foi possível cancelar. Tente novamente.');
                        } finally {
                            setCancellingId(null);
                        }
                    },
                },
            ],
        );
    };

    return (
        <View style={styles.screen}>
            <BrandHeader eyebrow="SUAS EXPERIÊNCIAS" title="Reservas" />
            <BrandSheet>
                <View style={styles.segmented} accessibilityRole="tablist">
                    {([
                        { id: 'upcoming', label: 'Próximas', count: upcoming.length },
                        { id: 'past', label: 'Anteriores', count: past.length },
                    ] as const).map((item) => {
                        const selected = segment === item.id;
                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.segment, selected && styles.segmentSelected]}
                                onPress={() => setSegment(item.id)}
                                accessibilityRole="tab"
                                accessibilityState={{ selected }}
                            >
                                <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                                    {item.label}{profile ? ` · ${item.count}` : ''}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {isLoading || !userId ? (
                    <View style={styles.loading}>
                        <ActivityIndicator size="large" color={Palette.orange} />
                    </View>
                ) : (
                    <FlatList
                        data={data}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        refreshControl={(
                            <RefreshControl
                                refreshing={isRefetching}
                                onRefresh={() => void refetch()}
                                tintColor={Palette.orange}
                                colors={[Palette.orange]}
                            />
                        )}
                        renderItem={({ item }) => (
                            <ReservationCard
                                booking={item}
                                isPast={segment === 'past'}
                                now={now}
                                cancelling={cancellingId === item.id}
                                onOpen={() => router.push(`/events/${item.event?.id}`)}
                                onTicket={() => router.push(`/events/${item.event?.id}/ticket`)}
                                onReview={() => router.push(`/events/${item.event?.id}/review` as any)}
                                onCancel={() => handleCancel(item)}
                            />
                        )}
                        ListEmptyComponent={(
                            <View style={styles.empty}>
                                <View style={styles.emptyIcon}>
                                    <AppIcon name="ticket" size={32} color={Palette.orangeDeep} />
                                </View>
                                <Text style={styles.emptyTitle}>
                                    {segment === 'upcoming' ? 'Nenhuma reserva por enquanto' : 'Nada por aqui ainda'}
                                </Text>
                                <Text style={styles.emptyBody}>
                                    {segment === 'upcoming'
                                        ? 'Quando você pedir para participar de um evento, ele aparece aqui com o seu ingresso.'
                                        : 'Os eventos que você já viveu ficam guardados aqui para você avaliar.'}
                                </Text>
                                {segment === 'upcoming' && (
                                    <TouchableOpacity
                                        style={styles.primaryButton}
                                        onPress={() => router.navigate('/(tabs)')}
                                        accessibilityRole="button"
                                    >
                                        <Text style={styles.primaryButtonText}>Explorar eventos</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    />
                )}
            </BrandSheet>
        </View>
    );
}

type ReservationCardProps = {
    booking: any;
    isPast: boolean;
    now: number;
    cancelling: boolean;
    onOpen: () => void;
    onTicket: () => void;
    onReview: () => void;
    onCancel: () => void;
};

function ReservationCard({ booking, isPast, now, cancelling, onOpen, onTicket, onReview, onCancel }: ReservationCardProps) {
    const event = booking.event ?? {};
    const status = STATUS_STYLE[booking.status] ?? { label: String(booking.status ?? ''), background: Palette.track, color: Palette.inkSoft };
    const approved = booking.status === 'APPROVED';
    const canCancel = !isPast && ACTIVE_STATUSES.has(booking.status);
    const canReview = isPast && approved && (eventTime(booking) ?? Infinity) < now;
    const hostName = event.host?.fullName ? formatFirstName(event.host.fullName) : null;

    return (
        <View style={styles.card}>
            <TouchableOpacity
                style={styles.cardSummary}
                onPress={onOpen}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`${event.title ?? 'Evento'}, ${status.label.toLowerCase()}`}
                accessibilityHint="Abrir detalhes do evento"
            >
                <Image
                    source={{ uri: getOptimizedImageUrl(event.coverImageUrl, { width: 200 }) || DEFAULT_PLACEHOLDER_IMAGE }}
                    style={styles.cardImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                />
                <View style={styles.cardInfo}>
                    <View style={[styles.statusPill, { backgroundColor: status.background }]}>
                        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={2}>{event.title ?? 'Evento'}</Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                        {formatWhen(event.eventDate)}{hostName ? ` · ${hostName}` : ''}
                    </Text>
                </View>
            </TouchableOpacity>

            <View style={styles.cardActions}>
                {!isPast && approved && (
                    <ActionButton label="Ver ingresso" icon="qr-code-outline" variant="primary" onPress={onTicket} grow={2} />
                )}
                {!isPast && !approved && (
                    <ActionButton label="Ver detalhes" variant="outline" onPress={onOpen} grow={2} />
                )}
                {canReview && (
                    <ActionButton label="Avaliar" icon="star-outline" variant="primary" onPress={onReview} grow={2} />
                )}
                {isPast && !canReview && (
                    <ActionButton label="Ver evento" variant="outline" onPress={onOpen} grow={2} />
                )}
                {canCancel && (
                    <ActionButton label={cancelling ? 'Cancelando…' : 'Cancelar'} variant="danger" onPress={onCancel} disabled={cancelling} />
                )}
            </View>
        </View>
    );
}

type ActionButtonProps = {
    label: string;
    icon?: string;
    variant: 'primary' | 'outline' | 'danger';
    onPress: () => void;
    grow?: number;
    disabled?: boolean;
};

function ActionButton({ label, icon, variant, onPress, grow = 1, disabled }: ActionButtonProps) {
    const color = variant === 'primary' ? '#FFFFFF' : variant === 'danger' ? Palette.danger : Palette.ink;
    return (
        <TouchableOpacity
            style={[
                styles.action,
                { flex: grow },
                variant === 'primary' && styles.actionPrimary,
                variant === 'danger' && styles.actionDanger,
                disabled && styles.actionDisabled,
            ]}
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
        >
            {!!icon && <AppIcon name={icon} size={18} color={color} />}
            <Text style={[styles.actionText, { color }]}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Palette.paper,
    },
    segmented: {
        flexDirection: 'row',
        gap: 4,
        padding: 4,
        marginHorizontal: Spacing.xl,
        marginTop: Spacing.lg,
        marginBottom: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: Palette.track,
    },
    segment: {
        flex: 1,
        minHeight: 40,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    segmentSelected: {
        backgroundColor: Palette.surface,
        shadowColor: '#452314',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    segmentText: {
        fontSize: 14,
        fontWeight: '700',
        color: Palette.inkSoft,
    },
    segmentTextSelected: {
        color: Palette.ink,
        fontWeight: '800',
    },
    loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    list: {
        padding: Spacing.xl,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.xxxl * 2,
        gap: Spacing.md,
    },
    card: {
        backgroundColor: Palette.surface,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        padding: 14,
        gap: Spacing.md,
    },
    cardSummary: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    cardImage: {
        width: 76,
        height: 76,
        borderRadius: BorderRadius.lg,
        backgroundColor: Palette.track,
    },
    cardInfo: {
        flex: 1,
        gap: 4,
        justifyContent: 'center',
    },
    statusPill: {
        alignSelf: 'flex-start',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: BorderRadius.full,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.4,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: Palette.ink,
    },
    cardMeta: {
        fontSize: 13,
        color: Palette.inkSoft,
    },
    cardActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    action: {
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Palette.line,
        backgroundColor: Palette.surface,
    },
    actionPrimary: {
        backgroundColor: Palette.orange,
        borderColor: Palette.orange,
    },
    actionDanger: {
        borderColor: Palette.dangerLine,
    },
    actionDisabled: {
        opacity: 0.6,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '800',
    },
    empty: {
        alignItems: 'center',
        paddingVertical: Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
        gap: Spacing.md,
    },
    emptyIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: Palette.orangeSoft,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xs,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Palette.ink,
        textAlign: 'center',
    },
    emptyBody: {
        fontSize: 14,
        lineHeight: 21,
        color: Palette.inkSoft,
        textAlign: 'center',
        maxWidth: 300,
    },
    primaryButton: {
        minHeight: 48,
        paddingHorizontal: Spacing.xxl,
        marginTop: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: Palette.orange,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
});
