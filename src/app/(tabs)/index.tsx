import { EnhancedEventCard } from '@/components/ui/EnhancedEventCard';
import { FilterCriteria, FilterModal } from '@/components/ui/events/FilterModal';
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete';
import { QuickStats } from '@/components/ui/QuickStats';
import { SideMenu } from '@/components/ui/SideMenu';
import { useBlockedIds } from '@/hooks/useBlockedIds';
import { eventService } from '@/services/api/EventService';
import { BorderRadius, Colors, Dimensions, Spacing } from '@/shared/constants/theme';
import { supabase } from '@/shared/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const STORAGE_LOCATION_KEY = '@user_location';
const DEFAULT_RADIUS_KM = 60;
const DEFAULT_FILTERS: FilterCriteria = { radiusInKm: DEFAULT_RADIUS_KM };

type FeedCoordinates = { lat: number; lon: number };

interface StoredFeedLocation {
  label: string;
  latitude: number;
  longitude: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const blockedIds = useBlockedIds();
  const eventsRequestId = useRef(0);

  const [location, setLocation] = useState<string | null>(null);
  const [locationCoords, setLocationCoords] = useState<FeedCoordinates | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<FilterCriteria>(DEFAULT_FILTERS);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    void fetchCurrentUser();
    void initializeFeed();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    setCurrentUser(profile);
  }

  async function initializeFeed() {
    try {
      setLoadingLocation(true);
      const storedLocation = await readStoredLocation();

      if (storedLocation) {
        const coords = {
          lat: storedLocation.latitude,
          lon: storedLocation.longitude,
        };
        setLocation(storedLocation.label);
        setLocationCoords(coords);
        await getEvents(coords, DEFAULT_FILTERS);
        return;
      }

      await getLocation(DEFAULT_FILTERS);
    } catch {
      await getLocation(DEFAULT_FILTERS);
    } finally {
      setLoadingLocation(false);
    }
  }

  async function readStoredLocation(): Promise<StoredFeedLocation | null> {
    const stored = await AsyncStorage.getItem(STORAGE_LOCATION_KEY);
    if (!stored) return null;

    try {
      const parsed = JSON.parse(stored) as Partial<StoredFeedLocation>;
      if (
        typeof parsed.label === 'string' &&
        typeof parsed.latitude === 'number' &&
        typeof parsed.longitude === 'number'
      ) {
        return parsed as StoredFeedLocation;
      }
    } catch {
      // Older versions stored only the city label.
    }

    const geocoded = await eventService.geocodeLocation(stored);
    if (geocoded.latitude === null || geocoded.longitude === null) return null;

    const migratedLocation: StoredFeedLocation = {
      label: stored,
      latitude: geocoded.latitude,
      longitude: geocoded.longitude,
    };
    try {
      await AsyncStorage.setItem(STORAGE_LOCATION_KEY, JSON.stringify(migratedLocation));
    } catch {
      // The current session can still use the migrated coordinates.
    }
    return migratedLocation;
  }

  async function persistLocation(label: string, coords: FeedCoordinates) {
    const storedLocation: StoredFeedLocation = {
      label,
      latitude: coords.lat,
      longitude: coords.lon,
    };
    try {
      await AsyncStorage.setItem(STORAGE_LOCATION_KEY, JSON.stringify(storedLocation));
    } catch {
      // Storage failure should not block the current nearby search.
    }
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

      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude: coords.lat,
          longitude: coords.lon,
        });
        const address = addresses[0];

        if (address) {
          const city = address.city || address.subregion;
          if (city && address.region) locationLabel = `${city} - ${address.region}`;
          else if (city || address.region) locationLabel = city || address.region || locationLabel;
        }
      } catch {
        // Coordinates still allow the nearby search when the label lookup fails.
      }

      setLocation(locationLabel);
      setLocationCoords(coords);
      await persistLocation(locationLabel, coords);
      await getEvents(coords, appliedFilters);
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
    municipality: { fullName: string },
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
      setLocationCoords(selectedCoords);
      await persistLocation(municipality.fullName, selectedCoords);
      setShowLocationModal(false);
      await getEvents(selectedCoords, filters);
    } finally {
      setLoadingLocation(false);
    }
  };

  async function getEvents(
    coords: FeedCoordinates | null,
    appliedFilters: FilterCriteria = filters
  ) {
    const requestId = ++eventsRequestId.current;

    if (!coords) {
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
      if (locationCoords) await getEvents(locationCoords, filters);
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
    await getEvents(locationCoords, DEFAULT_FILTERS);
  };

  const renderEmptyState = () => {
    if (!locationCoords) {
      return (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIconContainer}>
            <Ionicons name="location-outline" size={56} color="#CDCDE0" />
          </View>
          <Text style={styles.emptyStateTitle}>Defina sua localização</Text>
          <Text style={styles.emptyStateBody}>
            Escolha sua cidade para encontrar eventos realmente próximos a você.
          </Text>
          <TouchableOpacity style={styles.emptyStateButton} onPress={() => setShowLocationModal(true)}>
            <Text style={styles.emptyStateButtonText}>Escolher cidade</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (eventsError) {
      return (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIconContainer}>
            <Ionicons name="cloud-offline-outline" size={56} color="#CDCDE0" />
          </View>
          <Text style={styles.emptyStateTitle}>Não foi possível carregar</Text>
          <Text style={styles.emptyStateBody}>{eventsError}</Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => void getEvents(locationCoords, filters)}
          >
            <Text style={styles.emptyStateButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeFilterCount > 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIconContainer}>
            <Ionicons name="search-outline" size={56} color="#CDCDE0" />
          </View>
          <Text style={styles.emptyStateTitle}>Nenhum evento encontrado</Text>
          <Text style={styles.emptyStateBody}>
            Amplie a distância ou remova alguns filtros para ver mais opções.
          </Text>
          <TouchableOpacity style={styles.emptyStateButton} onPress={() => void clearFilters()}>
            <Text style={styles.emptyStateButtonText}>Limpar filtros</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyStateContainer}>
        <View style={styles.emptyStateIconContainer}>
          <Ionicons name="calendar-outline" size={56} color="#CDCDE0" />
        </View>
        <Text style={styles.emptyStateTitle}>Nenhum evento por perto</Text>
        <Text style={styles.emptyStateBody}>
          Que tal ser o primeiro a criar um evento na sua região?
        </Text>
        <TouchableOpacity
          style={styles.emptyStateButton}
          onPress={() => router.push('/events/create')}
        >
          <Text style={styles.emptyStateButtonText}>Criar evento</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const getQuickStats = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const eventsToday = events.filter((event) => {
      const eventDate = new Date(event.eventDate || event.event_date);
      return eventDate >= today && eventDate < tomorrow;
    }).length;
    const eventsThisWeek = events.filter((event) => {
      const eventDate = new Date(event.eventDate || event.event_date);
      return eventDate >= today && eventDate < weekFromNow;
    }).length;

    return {
      eventsToday,
      eventsThisWeek,
      newHosts: new Set(events.map((event) => event.hostId || event.host_id)).size,
    };
  };

  const quickStats = getQuickStats();
  const visibleEvents = events.filter((event) => !blockedIds.has(event.hostId || event.host_id));
  const radiusInKm = filters.radiusInKm || DEFAULT_RADIUS_KM;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainHeader}>
        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Abrir menu de navegação"
          style={styles.headerButton}
        >
          <Ionicons name="menu" size={Dimensions.icon.xlarge} color="#FFF" />
        </TouchableOpacity>
        <Image
          source={require('../../../assets/images/logo.png')}
          style={styles.logoImage}
          contentFit="contain"
          tintColor="#FFF"
          accessible
          accessibilityLabel="Logo Wellcome"
        />
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/profile')}
          accessibilityRole="button"
          accessibilityLabel="Ir para perfil"
          style={styles.headerButton}
        >
          <Ionicons name="person-circle-outline" size={30} color="#FFF" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => setShowLocationModal(true)}
        accessibilityRole="button"
        accessibilityLabel={`Localização atual: ${location || 'não definida'}`}
        accessibilityHint="Toque para alterar sua localização"
      >
        <Ionicons name="location-outline" size={Dimensions.icon.medium} color={Colors.light.textSecondary} />
        <Text style={styles.searchText} numberOfLines={1}>
          {loadingLocation ? 'Buscando localização...' : location || 'Definir localização'}
        </Text>
        {loadingLocation ? (
          <ActivityIndicator size="small" color={Colors.light.primary} />
        ) : (
          <Ionicons name="search-outline" size={Dimensions.icon.medium} color={Colors.light.textSecondary} />
        )}
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.light.primary]}
          />
        )}
      >
        <QuickStats
          eventsToday={quickStats.eventsToday}
          eventsThisWeek={quickStats.eventsThisWeek}
          newHosts={quickStats.newHosts}
        />

        <Text style={styles.sectionTitle}>Eventos próximos a você</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
          accessibilityLabel="Filtros de eventos"
        >
          <TouchableOpacity
            style={[styles.filterChip, styles.filterChipActive]}
            onPress={() => setFilterModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={`Abrir filtros${activeFilterCount ? `, ${activeFilterCount} ativos` : ''}`}
          >
            <Ionicons name="options" size={18} color="#FFF" />
            <Text style={styles.filterTextActive}>
              {activeFilterCount ? `Filtros (${activeFilterCount})` : 'Filtros'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filterChip}
            onPress={() => setFilterModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={`Alterar raio atual de ${radiusInKm} quilômetros`}
          >
            <Ionicons name="navigate-outline" size={18} color={Colors.light.textSecondary} />
            <Text style={styles.filterText}>Até {radiusInKm} km</Text>
          </TouchableOpacity>

          {activeFilterCount > 0 && (
            <TouchableOpacity
              style={styles.clearFilterButton}
              onPress={() => void clearFilters()}
              accessibilityRole="button"
              accessibilityLabel="Limpar filtros"
            >
              <Ionicons name="close" size={18} color={Colors.light.primary} />
              <Text style={styles.clearFilterText}>Limpar</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {loadingEvents ? (
          <View style={styles.loadingContainer} accessible accessibilityLabel="Carregando eventos">
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <Text style={styles.loadingText}>Carregando eventos...</Text>
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

      <TouchableOpacity
        style={[styles.fab, { bottom: 30 + insets.bottom }]}
        onPress={() => router.push('/events/create')}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Criar novo evento"
      >
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      <LocationAutocomplete
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onSelectMunicipality={handleSelectCity}
        type="municipality"
        asModal
        value={location || ''}
        placeholder="Digite sua cidade"
      />

      <SideMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        user={currentUser}
      />

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={(newFilters) => {
          setFilters(newFilters);
          void getEvents(locationCoords, newFilters);
        }}
        initialFilters={filters}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  mainHeader: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerButton: {
    minWidth: Dimensions.touchTarget.min,
    minHeight: Dimensions.touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: Dimensions.logo.width,
    height: Dimensions.logo.height,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    margin: Spacing.lg,
    padding: Spacing.md,
    minHeight: Dimensions.touchTarget.min,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchText: {
    flex: 1,
    marginLeft: Spacing.sm,
    color: Colors.light.text,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginLeft: Spacing.lg,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
    letterSpacing: 0,
  },
  filtersContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: Dimensions.touchTarget.min,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
  },
  filterChipActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  filterText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  filterTextActive: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: Dimensions.touchTarget.min,
    paddingHorizontal: Spacing.md,
  },
  clearFilterText: {
    color: Colors.light.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  loadingText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: Spacing.xl,
    width: Dimensions.fab.size,
    height: Dimensions.fab.size,
    borderRadius: Dimensions.fab.borderRadius,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  emptyStateContainer: {
    alignItems: 'center',
    padding: Spacing.xxxl,
    marginTop: Spacing.xl,
  },
  emptyStateIconContainer: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  emptyStateBody: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
    lineHeight: 22,
    maxWidth: 320,
  },
  emptyStateButton: {
    minHeight: Dimensions.touchTarget.min,
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    paddingVertical: 12,
    paddingHorizontal: Spacing.xxxl,
    borderRadius: BorderRadius.sm,
  },
  emptyStateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
