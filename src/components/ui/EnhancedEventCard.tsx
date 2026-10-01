import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { BorderRadius, Elevation, Palette, Spacing } from '@/shared/constants/theme';
import { DEFAULT_PLACEHOLDER_IMAGE } from '@/shared/lib/styles';
import { formatPrice, formatEventDate, formatSpotsAvailable } from '@/utils/formatters';
import { getOptimizedImageUrl } from '@/utils/imageOptimizer';

interface EnhancedEventCardProps {
  event: {
    id: string;
    title: string;
    cover_image_url?: string;
    coverImageUrl?: string;
    host?: {
      full_name?: string;
      fullName?: string;
    };
    location?: string;
    event_date?: string;
    eventDate?: string;
    end_time?: string;
    endTime?: string;
    max_guests?: number;
    maxGuests?: number;
    price?: number | string;
    average_rating?: number;
    averageRating?: number;
    distance_km?: number;
    distanceKm?: number;
    cuisine_types?: string[];
    cuisineTypes?: string[];
    vibe?: string[];
    event_participants?: Array<{ count: number }>;
    bookings?: Array<{ status: string }>;
    participantCount?: number;
  };
  onPress: () => void;
}

export function EnhancedEventCard({ event, onPress }: EnhancedEventCardProps) {
  // Support both snake_case (from Supabase) and camelCase (from API)
  const coverImageUrl = event.cover_image_url || event.coverImageUrl;
  const optimizedCoverImage = getOptimizedImageUrl(coverImageUrl, { width: 600 });
  const eventDate = event.event_date || event.eventDate;
  const endTime = event.end_time || event.endTime;
  const rawMaxGuests = event.maxGuests ?? event.max_guests ?? 0;
  const maxGuests = Math.max(0, Number(rawMaxGuests) || 0);
  const averageRating = event.average_rating || event.averageRating;
  const distanceKm = event.distance_km || event.distanceKm;
  const cuisineTypes = event.cuisine_types || event.cuisineTypes || [];
  const hostName = event.host?.full_name || event.host?.fullName;
  
  // The API applies payment expiry, approval and capacity-hold rules before returning this count.
  // Do not infer occupancy from raw booking statuses here because expired requests are not seats.
  const rawTaken = event.participantCount ?? event.event_participants?.[0]?.count ?? 0;
  const taken = Math.min(maxGuests, Math.max(0, Number(rawTaken) || 0));
  const spotsLabel = formatSpotsAvailable(taken, maxGuests);

  const tags = [...(cuisineTypes || []), ...(event.vibe || [])].slice(0, 2);
  const remaining = Math.max(0, maxGuests - taken);
  const soldOut = remaining === 0;

  const start = eventDate ? new Date(eventDate) : null;
  const hasStart = !!start && !Number.isNaN(start.getTime());
  const day = hasStart ? String(start!.getDate()).padStart(2, '0') : '--';
  const month = hasStart
    ? start!.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()
    : '';

  const formatTimeRange = () => {
    if (!hasStart) return '';
    const startTime = start!.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (!endTime) return startTime;
    const endDate = new Date(endTime);
    if (Number.isNaN(endDate.getTime())) return startTime;
    return `${startTime}–${endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const meta = [hostName, formatTimeRange(), event.location].filter(Boolean).join(' · ');
  const distanceLabel = distanceKm === undefined || distanceKm === null
    ? null
    : distanceKm < 1
      ? `${Math.round(distanceKm * 1000)} m`
      : `${distanceKm.toFixed(1).replace('.', ',')} km`;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`Evento: ${event.title}. Anfitrião: ${hostName}. ${formatEventDate(eventDate || '')}. ${formatPrice(event.price)} por pessoa. ${spotsLabel}`}
      accessibilityHint="Toque para ver detalhes do evento"
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: optimizedCoverImage || DEFAULT_PLACEHOLDER_IMAGE }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          placeholder={DEFAULT_PLACEHOLDER_IMAGE}
          accessible={false}
        />

        <View style={styles.dateBadge}>
          <Text style={styles.dateMonth}>{month}</Text>
          <Text style={styles.dateDay}>{day}</Text>
        </View>

        {!!averageRating && (
          <View style={[styles.glassPill, styles.ratingPill]}>
            <Ionicons name="star" size={12} color={Palette.star} />
            <Text style={styles.glassText}>{averageRating.toFixed(1).replace('.', ',')}</Text>
          </View>
        )}

        {!!distanceLabel && (
          <View style={[styles.glassPill, styles.distancePill]}>
            <Ionicons name="location" size={12} color="#FFFFFF" />
            <Text style={styles.glassText}>{distanceLabel}</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
        {!!meta && <Text style={styles.meta} numberOfLines={1}>{meta}</Text>}

        {tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {tags.map((tag, index) => (
              <View key={`${tag}-${index}`} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={[styles.spotsText, soldOut && styles.spotsTextSoldOut]}>
            {soldOut ? 'Esgotado' : `${remaining} de ${maxGuests} vagas livres`}
          </Text>
          <Text style={styles.priceText}>
            {formatPrice(event.price)}
            <Text style={styles.priceSub}> /pessoa</Text>
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.surface,
    borderRadius: 22,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Palette.lineSoft,
    ...Elevation.card,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 188,
    backgroundColor: Palette.track,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  dateBadge: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    minWidth: 48,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Palette.surface,
    alignItems: 'center',
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: Palette.orangeDeep,
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.ink,
    lineHeight: 20,
  },
  glassPill: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Palette.scrim,
  },
  ratingPill: {
    top: Spacing.md,
    right: Spacing.md,
  },
  distancePill: {
    bottom: Spacing.md,
    left: Spacing.md,
  },
  glassText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 14,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: Palette.ink,
    lineHeight: 22,
  },
  meta: {
    fontSize: 13,
    color: Palette.inkSoft,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Palette.orangeSoft,
    borderRadius: BorderRadius.full,
  },
  tagText: {
    fontSize: 12,
    color: Palette.orangeDarker,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Palette.lineSoft,
  },
  spotsText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.green,
  },
  spotsTextSoldOut: {
    color: Palette.danger,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.ink,
  },
  priceSub: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.muted,
  },
});
