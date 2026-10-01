import { EnhancedEventCard } from '@/components/ui/EnhancedEventCard';
import { FilterCriteria, FilterModal } from '@/components/ui/events/FilterModal';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete';
import { BrandHeader, BrandSheet, HeaderIconButton } from '@/components/ui/wellcome';
import { useBlockedIds } from '@/hooks/useBlockedIds';
import { useMyProfile } from '@/hooks/useMyProfile';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { eventService } from '@/services/api/EventService';
import { BorderRadius, Dimensions, Palette, Spacing } from '@/shared/constants/theme';
import { supabase } from '@/shared/lib/supabase';
import { formatFirstName } from '@/utils/formatters';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const DEFAULT_RADIUS_KM = 60;
const DEFAULT_FILTERS: FilterCriteria = { radiusInKm: DEFAULT_RADIUS_KM };
const DAY_MS = 24 * 60 * 60 * 1000;

type FeedCoordinates = { lat: number; lon: number };
type DateRange = 'all' | 'today' | 'week';

const DATE_RANGES: { id: DateRange; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'today', label: 'Hoje' },
  { id: 'week', label: 'Esta semana' },
];

function eventStart(event: any) {
  return new Date(event.eventDate || event.event_date);
}

function isWithinRange(event: any, range: DateRange, now = new Date()) {
  if (range === 'all') return true;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(today.getTime() + (range === 'today' ? 1 : 7) * DAY_MS);
  const date = eventStart(event);
  return date >= today && date < end;
}

/** Earliest upcoming reservation that still holds (or may hold) a seat. */
function findNextBooking(bookings: any[] | undefined) {
  const now = Date.now();
  return (bookings ?? [])
    .filter((booking) => ['APPROVED', 'PENDING', 'WAITLIST'].includes(booking.status))
    .filter((booking) => new Date(booking.event?.eventDate ?? '').getTime() >= now)
    .sort((a, b) => new Date(a.event.eventDate).getTime() - new Date(b.event.eventDate).getTime())[0];
}

export default function HomeScreen() {
  const router = useRouter();
  const blockedIds = useBlockedIds();
  const eventsRequestId = useRef(0);
  const { userId, data: currentUser, refetch: refetchProfile } = useMyProfile();
  const { unreadCount, refetch: refetchUnread } = useUnreadNotifications();

  const [location, setLocation] = useState<string | null>(null);
  const [locationCity, setLocationCity] = useState<string | null>(null);
  const [locationCoords, setLocationCoords] = useState<FeedCoordinates | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<FilterCriteria>(DEFAULT_FILTERS);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [showLocationModal, setShowLocationModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (userId) void refetchProfile();
      void refetchUnread();
    }, [refetchProfile, refetchUnread, userId])
  );

  useEffect(() => {
    void initializeFeed();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function initializeFeed() {
    await getLocation(DEFAULT_FILTERS);
  }

  async function getLocation(appliedFilters: FilterCriteria = filters) {
    try {
      setLoadingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Precisamos da sua localização',
          'Não foi possível acessar o GPS. Escolha sua cidade para ver eventos próximos.'
        );
        setEvents([]);
        setEventsError(null);
        setLoadingEvents(false);
        setShowLocationModal(true);
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({});
      const coords = {
        lat: currentPosition.coords.latitude,
        lon: currentPosition.coords.longitude,
      };
      let locationLabel = 'Localização atual';
      let currentCity: string | null = null;

      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude: coords.lat,
          longitude: coords.lon,
        });
        const address = addresses[0];

        if (address) {
          const city = address.city || address.subregion;
          currentCity = city || null;
          if (city && address.region) locationLabel = `${city} - ${address.region}`;
          else if (city || address.region) locationLabel = city || address.region || locationLabel;
        }
      } catch {
        // The municipality name is required to keep neighboring cities out of the feed.
      }

      if (!currentCity) {
        throw new Error('Current municipality could not be identified');
      }

      setLocation(locationLabel);
      setLocationCity(currentCity);
      setLocationCoords(coords);
      await getEvents(coords, currentCity, appliedFilters);
    } catch {
      setEvents([]);
      setEventsError('Não foi possível obter sua localização.');
      setLoadingEvents(false);
      setShowLocationModal(true);
    } finally {
      setLoadingLocation(false);
    }
  }

  const handleSelectCity = async (
    municipality: { name: string; fullName: string },
    coords?: FeedCoordinates
  ) => {
    try {
      setLoadingLocation(true);
      let selectedCoords = coords;

      if (!selectedCoords) {
        const geocoded = await eventService.geocodeLocation(municipality.fullName);
        if (geocoded.latitude !== null && geocoded.longitude !== null) {
          selectedCoords = { lat: geocoded.latitude, lon: geocoded.longitude };
        }
      }

      if (!selectedCoords) {
        Alert.alert('Cidade não encontrada', 'Não conseguimos localizar essa cidade. Tente novamente.');
        return;
      }

      setLocation(municipality.fullName);
      setLocationCity(municipality.name);
      setLocationCoords(selectedCoords);
      setShowLocationModal(false);
      await getEvents(selectedCoords, municipality.name, filters);
    } finally {
      setLoadingLocation(false);
    }
  };

  async function getEvents(
    coords: FeedCoordinates | null,
    city: string | null,
    appliedFilters: FilterCriteria = filters
  ) {
    const requestId = ++eventsRequestId.current;

    if (!coords || !city) {
      setEvents([]);
      setEventsError(null);
      setLoadingEvents(false);
      return;
    }

    try {
      setLoadingEvents(true);
      setEventsError(null);

      const { data: { session } } = await supabase.auth.getSession();
      const data = await eventService.listEvents({
        lat: coords.lat.toString(),
        lon: coords.lon.toString(),
        radius: (appliedFilters.radiusInKm || DEFAULT_RADIUS_KM).toString(),
        city,
        cuisine: appliedFilters.cuisine,
        vibe: appliedFilters.vibe,
        priceMin: appliedFilters.priceMin?.trim() || undefined,
        priceMax: appliedFilters.priceMax?.trim() || undefined,
        excludeHostId: session?.user?.id,
      });

      if (requestId === eventsRequestId.current) setEvents(data || []);
    } catch (error) {
      console.error('Unexpected error:', error);
      if (requestId === eventsRequestId.current) {
        setEvents([]);
        setEventsError('Não foi possível carregar os eventos. Verifique sua conexão e tente novamente.');
      }
    } finally {
      if (requestId === eventsRequestId.current) setLoadingEvents(false);
    }
  }

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (locationCoords && locationCity) await getEvents(locationCoords, locationCity, filters);
      else await getLocation(filters);
    } finally {
      setRefreshing(false);
    }
  };

  const activeFilterCount = [
    Boolean(filters.priceMin || filters.priceMax),
    Boolean(filters.cuisine?.length),
    Boolean(filters.vibe?.length),
    (filters.radiusInKm || DEFAULT_RADIUS_KM) !== DEFAULT_RADIUS_KM,
  ].filter(Boolean).length;

  const clearFilters = async () => {
    setFilters(DEFAULT_FILTERS);
    setDateRange('all');
    await getEvents(locationCoords, locationCity, DEFAULT_FILTERS);
  };

  const radiusInKm = filters.radiusInKm || DEFAULT_RADIUS_KM;
  const nextBooking = useMemo(() => findNextBooking(currentUser?.bookings), [currentUser?.bookings]);
  const visibleEvents = events
    .filter((event) => !blockedIds.has(event.hostId || event.host_id))
    .filter((event) => isWithinRange(event, dateRange));
  const cityLabel = locationCity || location;

  const renderEmptyState = () => {
    let icon = 'calendar-outline';
    let title = 'Nenhum evento por perto';
    let body = 'Que tal ser o primeiro a criar um evento na sua região?';
    let action = { label: 'Criar evento', onPress: () => router.push('/events/create') };

    if (!locationCoords) {
      icon = 'location-outline';
      title = 'Defina sua localização';
      body = 'Escolha sua cidade para encontrar eventos realmente próximos a você.';
      action = { label: 'Escolher cidade', onPress: () => setShowLocationModal(true) };
    } else if (eventsError) {
      icon = 'cloud-offline-outline';
      title = 'Não foi possível carregar';
      body = eventsError;
      action = { label: 'Tentar novamente', onPress: () => void getEvents(locationCoords, locationCity, filters) };
    } else if (activeFilterCount > 0 || dateRange !== 'all') {
      icon = 'search-outline';
      title = 'Nenhum evento encontrado';
      body = dateRange === 'today'
        ? 'Nada marcado para hoje com esses filtros. Veja a semana inteira ou amplie a distância.'
        : 'Amplie a distância ou remova alguns filtros para ver mais opções.';
      action = { label: 'Limpar filtros', onPress: () => void clearFilters() };
    }

    return (
      <View style={styles.emptyStateContainer}>
        <View style={styles.emptyStateIconContainer}>
          <Ionicons name={icon} size={36} color={Palette.orangeDeep} />
        </View>
        <Text style={styles.emptyStateTitle}>{title}</Text>
        <Text style={styles.emptyStateBody}>{body}</Text>
        <TouchableOpacity style={styles.emptyStateButton} onPress={action.onPress} accessibilityRole="button">
          <Text style={styles.emptyStateButtonText}>{action.label}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <BrandHeader
        actions={(
          <>
            <HeaderIconButton
              icon="chatbubble-outline"
              accessibilityLabel="Mensagens"
              onPress={() => router.push('/messages' as any)}
            />
            <HeaderIconButton
              icon="notifications-outline"
              accessibilityLabel="Notificações"
              badge={unreadCount}
              onPress={() => router.push('/notifications')}
            />
          </>
        )}
        leading={(
          <View style={styles.greetingBlock}>
            <Text style={styles.greeting}>
              {currentUser?.fullName ? `Olá, ${formatFirstName(currentUser.fullName)}` : 'Olá!'}
            </Text>
            <View style={styles.locationRow}>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={() => setShowLocationModal(true)}
                accessibilityRole="button"
                accessibilityLabel={`Cidade do feed: ${location || 'não definida'}`}
                accessibilityHint="Toque para escolher outra cidade"
              >
                <Ionicons name="location" size={20} color="#FFFFFF" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {loadingLocation ? 'Localizando…' : cityLabel || 'Escolher cidade'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.gpsButton}
                onPress={() => void getLocation(filters)}
                disabled={loadingLocation}
                accessibilityRole="button"
                accessibilityLabel="Usar minha localização atual pelo GPS"
                hitSlop={8}
              >
                {loadingLocation ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="navigate-outline" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <BrandSheet>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={(
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Palette.orange}
              colors={[Palette.orange]}
            />
          )}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}
            accessibilityLabel="Filtros de eventos"
          >
            <TouchableOpacity
              style={[styles.chip, activeFilterCount > 0 && styles.chipAccent]}
              onPress={() => setFilterModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir filtros${activeFilterCount ? `, ${activeFilterCount} ativos` : ''}`}
            >
              <Ionicons name="filter-outline" size={16} color={activeFilterCount > 0 ? Palette.orangeDarker : Palette.ink} />
              <Text style={[styles.chipText, activeFilterCount > 0 && styles.chipTextAccent]}>
                {activeFilterCount ? `Filtros · ${activeFilterCount}` : 'Filtros'}
              </Text>
            </TouchableOpacity>

            {DATE_RANGES.map((range) => {
              const selected = dateRange === range.id;
              return (
                <TouchableOpacity
                  key={range.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setDateRange(range.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{range.label}</Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.chip}
              onPress={() => setFilterModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={`Alterar raio atual de ${radiusInKm} quilômetros`}
            >
              <Text style={styles.chipText}>Até {radiusInKm} km</Text>
            </TouchableOpacity>

            {(activeFilterCount > 0 || dateRange !== 'all') && (
              <TouchableOpacity
                style={styles.clearChip}
                onPress={() => void clearFilters()}
                accessibilityRole="button"
                accessibilityLabel="Limpar filtros"
              >
                <Ionicons name="close" size={16} color={Palette.orangeDeep} />
                <Text style={styles.clearChipText}>Limpar</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {nextBooking && (
            <NextBookingCard
              booking={nextBooking}
              onOpen={() => router.push(`/events/${nextBooking.event.id}`)}
              onTicket={() => router.push(`/events/${nextBooking.event.id}/ticket`)}
            />
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} accessibilityRole="header">Perto de você</Text>
            {!loadingEvents && visibleEvents.length > 0 && (
              <Text style={styles.sectionCount}>
                {visibleEvents.length} {visibleEvents.length === 1 ? 'evento' : 'eventos'}
              </Text>
            )}
          </View>

          {loadingEvents ? (
            <View style={styles.loadingContainer} accessible accessibilityLabel="Carregando eventos">
              <ActivityIndicator size="large" color={Palette.orange} />
              <Text style={styles.loadingText}>Buscando experiências…</Text>
            </View>
          ) : visibleEvents.length === 0 ? (
            renderEmptyState()
          ) : (
            visibleEvents.map((event) => (
              <EnhancedEventCard
                key={event.id}
                event={event}
                onPress={() => router.push(`/events/${event.id}`)}
              />
            ))
          )}
        </ScrollView>
      </BrandSheet>

      <LocationAutocomplete
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onSelectMunicipality={handleSelectCity}
        type="municipality"
        asModal
        value={location || ''}
        placeholder="Digite sua cidade"
      />

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={(newFilters) => {
          setFilters(newFilters);
          void getEvents(locationCoords, locationCity, newFilters);
        }}
        initialFilters={filters}
      />
    </View>
  );
}

function NextBookingCard({ booking, onOpen, onTicket }: { booking: any; onOpen: () => void; onTicket: () => void }) {
  const date = new Date(booking.event.eventDate);
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const approved = booking.status === 'APPROVED';
  const host = booking.event.host?.fullName ? formatFirstName(booking.event.host.fullName) : null;

  return (
    <TouchableOpacity
      style={styles.nextCard}
      onPress={onOpen}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Sua próxima experiência: ${booking.event.title}`}
      accessibilityHint="Abrir detalhes do evento"
    >
      <View style={styles.nextDate}>
        <Text style={styles.nextWeekday}>{weekday}</Text>
        <Text style={styles.nextDay}>{date.getDate()}</Text>
      </View>
      <View style={styles.nextInfo}>
        <Text style={styles.nextEyebrow}>{approved ? 'SUA PRÓXIMA EXPERIÊNCIA' : 'AGUARDANDO CONFIRMAÇÃO'}</Text>
        <Text style={styles.nextTitle} numberOfLines={1}>{booking.event.title}</Text>
        <Text style={styles.nextMeta} numberOfLines={1}>{time}{host ? ` · com ${host}` : ''}</Text>
      </View>
      {approved ? (
        <TouchableOpacity
          style={styles.nextAction}
          onPress={onTicket}
          accessibilityRole="button"
          accessibilityLabel="Ver ingresso"
        >
          <Ionicons name="qr-code-outline" size={16} color={Palette.ink} />
          <Text style={styles.nextActionText}>Ingresso</Text>
        </TouchableOpacity>
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.paper,
  },
  greetingBlock: {
    gap: 0,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.orangeOnBrand,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  locationButton: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: Dimensions.touchTarget.min,
  },
  locationText: {
    flexShrink: 1,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: '#FFFFFF',
  },
  gpsButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.onBrandGlass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl * 2,
  },
  filtersContainer: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
  },
  chipSelected: {
    backgroundColor: Palette.ink,
    borderColor: Palette.ink,
  },
  chipAccent: {
    backgroundColor: Palette.orangeSoft,
    borderColor: Palette.orangeSoft,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.ink,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  chipTextAccent: {
    color: Palette.orangeDarker,
  },
  clearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 40,
    paddingHorizontal: Spacing.sm,
  },
  clearChipText: {
    color: Palette.orangeDeep,
    fontSize: 14,
    fontWeight: '700',
  },
  nextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    padding: 14,
    borderRadius: 20,
    backgroundColor: Palette.ink,
  },
  nextDate: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Palette.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextWeekday: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#FFFFFF',
  },
  nextDay: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 22,
    color: '#FFFFFF',
  },
  nextInfo: {
    flex: 1,
    gap: 2,
  },
  nextEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#FFC9A3',
  },
  nextTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nextMeta: {
    fontSize: 13,
    color: '#E9DAD1',
  },
  nextAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    backgroundColor: '#FFFFFF',
  },
  nextActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.ink,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: Palette.ink,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.muted,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: Spacing.xxxl,
    gap: Spacing.sm,
  },
  loadingText: {
    color: Palette.inkSoft,
    fontSize: 14,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyStateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Palette.orangeSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.ink,
    textAlign: 'center',
  },
  emptyStateBody: {
    fontSize: 14,
    color: Palette.inkSoft,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 320,
  },
  emptyStateButton: {
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: Palette.orange,
    paddingHorizontal: Spacing.xxl,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
