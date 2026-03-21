import { EnhancedEventCard } from '@/components/ui/EnhancedEventCard';
import { FilterCriteria, FilterModal } from '@/components/ui/events/FilterModal';
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete';
import { QuickStats } from '@/components/ui/QuickStats';
import { SideMenu } from '@/components/ui/SideMenu';
import { BorderRadius, Colors, Dimensions, Spacing } from '@/shared/constants/theme';
import { supabase } from '@/shared/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const STORAGE_LOCATION_KEY = '@user_location';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [location, setLocation] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Manual Location State
  // const [modalVisible, setModalVisible] = useState(false); // Removed in favor of showLocationModal
  // const [manualLocation, setManualLocation] = useState(''); // Removed

  // Filter State
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<FilterCriteria>({});

  // Side Menu State
  const [menuVisible, setMenuVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  async function fetchCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      setCurrentUser(profile);
    }
  }

  useEffect(() => {
    loadStoredLocation();
    getEvents();
  }, []);

  async function loadStoredLocation() {
    try {
      setLoadingLocation(true);
      const stored = await AsyncStorage.getItem(STORAGE_LOCATION_KEY);
      if (stored) {
        setLocation(stored);
      } else {
        // First run or no stored pos -> try GPS
        await getLocation();
      }
    } catch (e) {
      await getLocation(); // Fallback to GPS
    } finally {
      setLoadingLocation(false);
    }
  }

  async function fetchData() {
    await Promise.all([getEvents()]); // Location handled separately or via modal
  }

  async function getLocation() {
    try {
      setLoadingLocation(true);

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // If permission denied, open modal to ask user to type
        Alert.alert('Preciso da sua localização', 'Não conseguimos acesso ao GPS. Por favor, digite sua cidade manualmente.');
        setShowLocationModal(true);
        setLoadingLocation(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      let address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      if (address && address.length > 0) {
        const { city, region, subregion } = address[0];
        const cityDisplay = city || subregion;
        const regionDisplay = region;

        let finalLocation = 'Localização desconhecida';
        if (cityDisplay && regionDisplay) {
          finalLocation = `${cityDisplay} - ${regionDisplay}`;
        } else if (cityDisplay || regionDisplay) {
          finalLocation = cityDisplay || regionDisplay || '';
        }

        setLocation(finalLocation);
        AsyncStorage.setItem(STORAGE_LOCATION_KEY, finalLocation);
      } else {
        // GPS worked but empty address?
        setLocation('Localização desconhecida');
      }
    } catch (error) {
      // On error (e.g. PC without GPS), ask for manual
      setShowLocationModal(true);
    } finally {
      setLoadingLocation(false);
    }
  }

  // Location Selection
  const [showLocationModal, setShowLocationModal] = useState(false);

  const openLocationModal = () => {
    setShowLocationModal(true);
  };

  const handleSelectCity = async (municipality: any, coords?: { lat: number; lon: number }) => {
    const cityName = municipality.fullName;
    setLocation(cityName);
    await AsyncStorage.setItem(STORAGE_LOCATION_KEY, cityName);

    setShowLocationModal(false);

    if (coords) {
      // Refresh events with new coordinates
      setLoadingEvents(true);
      try {
        const { data, error } = await supabase
          .rpc('get_events_nearby', {
            lat: coords.lat,
            long: coords.lon,
            radius_km: 60
          })
          .select(`
                *,
                host:profiles(full_name, avatar_url),
                event_participants(count)
            `);

        if (!error && data) {
          setEvents(data);
        }
      } catch (e) {
        console.error('Error refreshing events:', e);
      } finally {
        setLoadingEvents(false);
      }
    } else {
      // Fallback if no coords (weird, but safe)
      getEvents();
    }
  };

  const useGPS = async () => {
    setShowLocationModal(false);
    await getLocation();
  };

  async function getEvents() {
    try {
      setLoadingEvents(true);

      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;

      let lat = null;
      let long = null;

      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({});
          lat = pos.coords.latitude;
          long = pos.coords.longitude;
        }
      } catch (e) {
        console.log('Error getting location', e);
      }

      let data: any[] = [];
      let error = null;

      if (lat && long) {
        // Use Spatial Search (60km radius default)
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_events_nearby', { lat, long, radius_km: 60 })
          .select(`
                *,
                host:profiles(full_name, avatar_url),
                event_participants(count)
            `);
        
        if (rpcError) {
           error = rpcError;
        } else if (rpcData) {
           data = rpcData;
           
           // Apply Filters in JS for RPC results
           if (currentUserId) {
             data = data.filter((e: any) => e.host_id !== currentUserId);
           }
           
           // Filter out past events - Fix absoluto usando timestamp para evitar bugs de fuso horário
           const nowTime = new Date().getTime();
           data = data.filter((e: any) => {
               const eventDateStr = e.event_date || e.eventDate;
               if (!eventDateStr) return false;
               
               // Considera até o final do dia do evento como válido para exibição no dia
               const eventDate = new Date(eventDateStr);
               eventDate.setHours(23, 59, 59, 999);
               
               return eventDate.getTime() >= nowTime;
           });
           
           if (filters.priceMin && filters.priceMin.trim() !== '') {
             data = data.filter((e: any) => e.price >= parseFloat(filters.priceMin!));
           }
           if (filters.priceMax && filters.priceMax.trim() !== '') {
             data = data.filter((e: any) => e.price <= parseFloat(filters.priceMax!));
           }
           if (filters.cuisine && filters.cuisine.length > 0) {
             data = data.filter((e: any) => e.cuisine_types && e.cuisine_types.some((c: string) => filters.cuisine!.includes(c)));
           }
           if (filters.vibe && filters.vibe.length > 0) {
              data = data.filter((e: any) => e.vibe && e.vibe.some((v: string) => filters.vibe!.includes(v)));
           }

           // Sort by created_at desc (most recent)
           data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }

      } else {
        // Fallback: Fetch all future events if no location
        let query = supabase
          .from('events')
          .select(`
              *,
              host:profiles(full_name, avatar_url),
              event_participants(count)
            `)
          .gte('event_date', new Date().toISOString());
        
        // Exclude own events
        if (currentUserId) {
          query = query.neq('host_id', currentUserId);
        }

        // Apply Filters (DB side)
        if (filters.priceMin && filters.priceMin.trim() !== '') query = query.gte('price', parseFloat(filters.priceMin));
        if (filters.priceMax && filters.priceMax.trim() !== '') query = query.lte('price', parseFloat(filters.priceMax));
        if (filters.cuisine && filters.cuisine.length > 0) query = query.overlaps('cuisine_types', filters.cuisine);
        if (filters.vibe && filters.vibe.length > 0) query = query.overlaps('vibe', filters.vibe);

        // Sort by created_at desc (most recent)
        query = query.order('created_at', { ascending: false });

        const result = await query;
        data = result.data || [];
        error = result.error;
      }

      if (error) {
        console.error('Error fetching events:', error);
      } else {
        setEvents(data || []);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoadingEvents(false);
    }
  }


  const onRefresh = async () => {
    setRefreshing(true);
    await getEvents();
    if (!location) await loadStoredLocation();
    setRefreshing(false);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyStateIconContainer}>
        <Ionicons name="calendar-outline" size={64} color="#CDCDE0" />
      </View>
      <Text style={styles.emptyStateTitle}>Nenhum evento por perto</Text>
      <Text style={styles.emptyStateBody}>
        Que tal ser o primeiro a criar um evento na sua região?
        Junte a galera para comer ou cozinhar!
      </Text>
      <TouchableOpacity
        style={styles.createEventButton}
        onPress={() => router.push('/events/create')}
      >
        <Text style={styles.createEventButtonText}>Criar meu primeiro evento</Text>
      </TouchableOpacity>
    </View>
  );

  // Calculate quick stats from events
  const getQuickStats = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const eventsToday = events.filter(e => {
      const eventDate = new Date(e.event_date);
      return eventDate >= today && eventDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
    }).length;

    const eventsThisWeek = events.filter(e => {
      const eventDate = new Date(e.event_date);
      return eventDate >= today && eventDate < weekFromNow;
    }).length;

    // Count unique hosts from recent events
    const uniqueHosts = new Set(events.map(e => e.host_id)).size;

    return {
      eventsToday,
      eventsThisWeek,
      newHosts: uniqueHosts,
    };
  };

  const quickStats = getQuickStats();

  // MOCK DATA for UI
  const CATEGORIES = [
    { id: '1', name: 'Jantar', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500' },
    { id: '2', name: 'Almoço', image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=500' },
    { id: '3', name: 'Brunch', image: 'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=500' },
    { id: '4', name: 'Café', image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500' },
  ];

  const FILTERS = ['Ordenar', 'Data', 'Culinária', 'Opções'];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Customizado */}
      <View style={styles.mainHeader}>
        <TouchableOpacity 
          onPress={() => setMenuVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Abrir menu de navegação"
          accessibilityHint="Toque para ver opções de navegação e configurações"
          style={styles.headerButton}
        >
          <Ionicons name="menu" size={Dimensions.icon.xlarge} color="#FFF" />
        </TouchableOpacity>
        <Image
          source={require('../../../assets/images/logo.png')}
          style={styles.logoImage}
          contentFit="contain"
          tintColor="#FFF"
          accessible={true}
          accessibilityLabel="Logo Wellcome"
        />
        <TouchableOpacity 
          onPress={() => router.push('/(tabs)/profile')}
          accessibilityRole="button"
          accessibilityLabel="Ir para perfil"
          accessibilityHint="Toque para ver seu perfil e configurações"
          style={styles.headerButton}
        >
          <Ionicons name="person-circle-outline" size={30} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Location Search Bar */}
      <TouchableOpacity 
        style={styles.searchBar} 
        onPress={openLocationModal}
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.light.primary]} />}
      >
        {/* Quick Stats */}
        <QuickStats 
          eventsToday={quickStats.eventsToday}
          eventsThisWeek={quickStats.eventsThisWeek}
          newHosts={quickStats.newHosts}
        />

        {/* Section Header */}
        <Text style={styles.sectionTitle}>Explorar por categoria</Text>

        {/* Categories Carousel */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.categoriesContainer}
          accessibilityLabel="Categorias de eventos"
        >
          {CATEGORIES.map(cat => (
            <TouchableOpacity 
              key={cat.id} 
              style={styles.categoryCard}
              accessibilityRole="button"
              accessibilityLabel={`Categoria ${cat.name}`}
              accessibilityHint="Toque para filtrar eventos por esta categoria"
              activeOpacity={0.8}
            >
              <Image 
                source={{ uri: cat.image }} 
                style={styles.categoryImage}
                accessible={true}
                accessibilityLabel={`Imagem da categoria ${cat.name}`}
              />
              <View style={styles.categoryOverlay} />
              <Text style={styles.categoryText}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Section Header */}
        <Text style={styles.sectionTitle}>Eventos próximos a você</Text>

        {/* Filter Pills */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filtersContainer}
          accessibilityLabel="Filtros de eventos"
        >
          <TouchableOpacity 
            style={[styles.filterChip, styles.filterChipActive]} 
            onPress={() => setFilterModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Abrir filtros avançados"
            accessibilityHint="Toque para filtrar eventos por preço, culinária e clima"
          >
            <Ionicons name="options" size={16} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.filterTextActive}>Filtros</Text>
          </TouchableOpacity>

          {FILTERS.map((f, i) => (
            <TouchableOpacity 
              key={i} 
              style={styles.filterChip}
              accessibilityRole="button"
              accessibilityLabel={`Filtrar por ${f}`}
              accessibilityHint={`Toque para abrir opções de ${f}`}
            >
              <Text style={styles.filterText}>{f}</Text>
              <Ionicons name="chevron-down" size={12} color={Colors.light.textSecondary} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Events List */}
        {loadingEvents ? (
          <View style={styles.loadingContainer} accessible={true} accessibilityLabel="Carregando eventos">
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <Text style={styles.loadingText}>Carregando eventos...</Text>
          </View>
        ) : events.length === 0 ? (
          renderEmptyState()
        ) : (
          events.map((event) => (
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
        accessibilityHint="Toque para criar um novo evento gastronômico"
      >
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      {/* Manual Location Modal */}
      {/* Location Autocomplete Modal */}
      <LocationAutocomplete
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onSelectMunicipality={handleSelectCity}
        type="municipality"
        asModal={true}
        value={location || ''}
        placeholder="Digite sua cidade (ex: São Paulo)"
      />

      {/* Side Menu */}
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
          getEvents(); // Refresh
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
  loadingContainer: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  loadingText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  // Categories
  categoriesContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
  },
  categoryCard: {
    width: Dimensions.categoryCard.width,
    height: Dimensions.categoryCard.height,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  categoryText: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginLeft: Spacing.lg,
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
    letterSpacing: -0.5,
  },
  // Filters
  filtersContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginRight: Spacing.sm,
    minHeight: Dimensions.touchTarget.min,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: Colors.light.primary,
    borderWidth: 0,
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
  // Floating Action Button
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
    width: 120,
    height: 120,
    borderRadius: 60,
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
    maxWidth: '80%',
  },
  createEventButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xxxl,
    borderRadius: 25,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createEventButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
