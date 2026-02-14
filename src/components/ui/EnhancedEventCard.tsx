import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Dimensions } from '@/shared/constants/theme';
import { DEFAULT_PLACEHOLDER_IMAGE } from '@/shared/lib/styles';
import { formatPrice, formatEventDate, formatSpotsAvailable } from '@/utils/formatters';

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
  };
  onPress: () => void;
}

export function EnhancedEventCard({ event, onPress }: EnhancedEventCardProps) {
  // Support both snake_case (from Supabase) and camelCase (from API)
  const coverImageUrl = event.cover_image_url || event.coverImageUrl;
  const eventDate = event.event_date || event.eventDate;
  const endTime = event.end_time || event.endTime;
  const maxGuests = event.max_guests || event.maxGuests || 0;
  const averageRating = event.average_rating || event.averageRating;
  const distanceKm = event.distance_km || event.distanceKm;
  const cuisineTypes = event.cuisine_types || event.cuisineTypes || [];
  const hostName = event.host?.full_name || event.host?.fullName;
  
  // Count valid bookings (APPROVED or PENDING)
  const taken = event.event_participants?.[0]?.count || 
                event.bookings?.filter(b => b.status === 'APPROVED' || b.status === 'PENDING').length || 0;
  const spotsLabel = formatSpotsAvailable(taken, maxGuests);

  // Get first 3 tags (combine cuisine and vibe)
  const allTags = [
    ...(cuisineTypes || []),
    ...(event.vibe || [])
  ].slice(0, 3);

  // Format time range
  const formatTimeRange = () => {
    if (!eventDate) return '';
    const date = new Date(eventDate);
    const startTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    if (endTime) {
      const endDate = new Date(endTime);
      const endTimeStr = endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return `${startTime} - ${endTimeStr}`;
    }
    return startTime;
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`Evento: ${event.title}. Anfitrião: ${hostName}. ${formatEventDate(eventDate || '')}. ${formatPrice(event.price)} por pessoa`}
      accessibilityHint="Toque para ver detalhes do evento"
    >
      {/* Image with badges */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: coverImageUrl || DEFAULT_PLACEHOLDER_IMAGE }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          placeholder={DEFAULT_PLACEHOLDER_IMAGE}
          accessible={true}
          accessibilityLabel={`Imagem do evento ${event.title}`}
        />
        
        {/* Rating Badge */}
        {averageRating && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color={Colors.light.warning} />
            <Text style={styles.ratingText}>{averageRating.toFixed(1)}</Text>
          </View>
        )}

        {/* Distance Badge */}
        {distanceKm !== undefined && (
          <View style={styles.distanceBadge}>
            <Ionicons name="location" size={12} color={Colors.light.primary} />
            <Text style={styles.distanceText}>
              {distanceKm < 1 
                ? `${Math.round(distanceKm * 1000)}m` 
                : `${distanceKm.toFixed(1)}km`}
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{event.title}</Text>

        {/* Host Row */}
        <View style={styles.hostRow}>
          <Text style={styles.hostName}>{hostName || 'Host'}</Text>
          <Ionicons 
            name="checkmark-circle" 
            size={14} 
            color={Colors.light.primary} 
            style={{ marginLeft: 4 }} 
          />
        </View>

        {/* Location */}
        <Text style={styles.location} numberOfLines={1}>
          {event.location}
        </Text>

        {/* Date and Time */}
        <Text style={styles.date}>
          {formatEventDate(eventDate || '')}
        </Text>
        
        {/* Time Range */}
        <Text style={styles.time}>
          {formatTimeRange()}
        </Text>

        {/* Tags */}
        {allTags.length > 0 && (
          <View style={styles.tagsContainer}>
            {allTags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.spotsText}>
            {maxGuests} lugares • {spotsLabel}
          </Text>
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>{formatPrice(event.price)}</Text>
            <Text style={styles.priceSub}>por pessoa</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: Dimensions.eventImage.height,
    backgroundColor: '#f0f0f0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  ratingBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.light.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    elevation: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
    color: Colors.light.text,
  },
  distanceBadge: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    backgroundColor: Colors.light.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    elevation: 3,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 2,
    color: Colors.light.text,
  },
  content: {
    padding: Spacing.lg,
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: Spacing.sm,
    lineHeight: 22,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  hostName: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  location: {
    fontSize: 13,
    color: Colors.light.textTertiary,
    fontStyle: 'italic',
    marginBottom: Spacing.sm,
  },
  date: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },
  time: {
    fontSize: 13,
    color: Colors.light.primary,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.md,
  },
  tag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: Colors.light.secondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  tagText: {
    fontSize: 11,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  spotsText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  priceSub: {
    fontSize: 10,
    color: Colors.light.textTertiary,
    marginTop: 2,
  },
});
