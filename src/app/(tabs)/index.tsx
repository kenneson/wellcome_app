import { Image } from 'expo-image';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform, StatusBar, RefreshControl, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/shared/lib/supabase';
import { SideMenu } from '@/components/ui/SideMenu';
import { FilterModal, FilterCriteria } from '@/components/ui/events/FilterModal';
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete';
import { DEFAULT_PLACEHOLDER_IMAGE, shadows } from '@/shared/lib/styles';

const STORAGE_LOCATION_KEY = '@user_location';

export default function HomeScreen() {
  const router = useRouter();
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

      let query;

      if (lat && long) {
        // Use Spatial Search (60km radius default)
        query = supabase
          .rpc('get_events_nearby', { lat, long, radius_km: 60 })
          .select(`
                *,
                host:profiles(full_name, avatar_url),
                event_participants(count)
            `);
      } else {
        // Fallback: Fetch all future events if no location
        query = supabase
          .from('events')
          .select(`
              *,
              host:profiles(full_name, avatar_url),
              event_participants(count)
            `)
          .gte('event_date', new Date().toISOString())
          .order('event_date', { ascending: true });
      }

      // Apply Filters
      if (filters.priceMin && filters.priceMin.trim() !== '') query = query.gte('price', parseFloat(filters.priceMin));
      if (filters.priceMax && filters.priceMax.trim() !== '') query = query.lte('price', parseFloat(filters.priceMax));
      if (filters.cuisine && filters.cuisine.length > 0) query = query.overlaps('cuisine_types', filters.cuisine);
      if (filters.vibe && filters.vibe.length > 0) query = query.overlaps('vibe', filters.vibe);

      const { data, error } = await query;

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

  const getSpotsLabel = (event: any) => {
    // @ts-ignore
    const taken = event.event_participants?.[0]?.count || 0;
    const total = event.max_guests || 0;
    const remaining = total - taken;

    if (remaining <= 0) return 'Esgotado';
    if (remaining === 1) return '1 disponível';
    return `${remaining} disponíveis`;
  };

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
        <TouchableOpacity onPress={() => setMenuVisible(true)}>
          <Ionicons name="menu" size={28} color="#FFF" />
        </TouchableOpacity>
        <Image
          source={require('../../../assets/images/logo.png')}
          style={styles.logoImage}
          contentFit="contain"
          tintColor="#FFF"
        />
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
          <Ionicons name="person-circle-outline" size={30} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Location Search Bar */}
      <TouchableOpacity style={styles.searchBar} onPress={openLocationModal}>
        <Ionicons name="location-outline" size={20} color="#666" />
        <Text style={styles.searchText} numberOfLines={1}>
          {loadingLocation ? 'Buscando...' : location || 'Definir localização'}
        </Text>
        <Ionicons name="search-outline" size={20} color="#666" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF8C42']} />}
      >
        {/* Categories Carousel */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
          {CATEGORIES.map(cat => (
            <View key={cat.id} style={styles.categoryCard}>
              <Image source={{ uri: cat.image }} style={styles.categoryImage} />
              <View style={styles.categoryOverlay} />
              <Text style={styles.categoryText}>{cat.name}</Text>
            </View>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Eventos disponíveis agora:</Text>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
          <TouchableOpacity style={[styles.filterChip, styles.filterChipActive]} onPress={() => setFilterModalVisible(true)}>
            <Ionicons name="options" size={16} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.filterTextActive}>Filtros</Text>
          </TouchableOpacity>

          {FILTERS.map((f, i) => (
            <TouchableOpacity key={i} style={styles.filterChip}>
              <Text style={styles.filterText}>{f}</Text>
              <Ionicons name="chevron-down" size={12} color="#666" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Events List */}
        {loadingEvents ? (
          <ActivityIndicator size="large" color="#FF8C42" style={{ marginTop: 20 }} />
        ) : events.length === 0 ? (
          renderEmptyState()
        ) : (
          events.map((event) => (
            <TouchableOpacity key={event.id} style={styles.feedCard} onPress={() => router.push(`/events/${event.id}`)}>
              {/* Image & Rating */}
              <View>
                <Image source={{ uri: event.cover_image_url || DEFAULT_PLACEHOLDER_IMAGE }} style={styles.cardImage} />
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={12} color="#FF8C42" />
                  <Text style={styles.ratingText}>4,5</Text>
                </View>
              </View>

              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{event.title}</Text>

                <View style={styles.hostRow}>
                  <Text style={styles.hostName}>{event.host?.full_name}</Text>
                  <Ionicons name="checkmark-circle" size={14} color="#FF8C42" style={{ marginLeft: 4 }} />
                </View>

                <Text style={styles.cardLocation}>{event.location}</Text>

                {/* Date Row */}
                <Text style={styles.cardContext}>
                  {new Date(event.event_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })} - às {new Date(event.event_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </Text>

                {/* Footer: Spots + Price */}
                <View style={styles.cardFooter}>
                  <Text style={styles.spotsText}>
                    {event.max_guests} lugares • {getSpotsLabel(event)}
                  </Text>
                  <View style={styles.priceContainer}>
                    <Text style={styles.priceText}>
                      {event.price && Number(event.price) > 0 ? `R$ ${parseFloat(event.price).toFixed(2).replace('.', ',')}` : 'Grátis'}
                    </Text>
                    <Text style={styles.priceSub}>por convidado</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/events/create')}
        activeOpacity={0.8}
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
    backgroundColor: '#fff', // Status bar handles orange top
  },
  mainHeader: {
    backgroundColor: '#FF8C42',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logoImage: {
    width: 100,
    height: 30,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchText: {
    flex: 1,
    marginLeft: 8,
    color: '#333',
  },
  scrollContent: {
    paddingBottom: 90,
  },
  // Categories
  categoriesContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
    flexDirection: 'row',
  },
  categoryCard: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginRight: 10,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 16,
    marginBottom: 12,
  },
  // Filters
  filtersContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#FF8C42',
    borderWidth: 0,
  },
  filterText: {
    fontSize: 14,
    color: '#333',
  },
  filterTextActive: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
  },
  // Card
  feedCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#eee',
  },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    elevation: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
    color: '#333',
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  hostName: {
    fontSize: 14,
    color: '#555',
  },
  cardLocation: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  cardContext: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spotsText: {
    fontSize: 12,
    color: '#666',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  priceSub: {
    fontSize: 10,
    color: '#999',
  },
  // OLD STYLES KEPT FOR SAFTEY (can be cleaned)
  fab: {
    position: 'absolute',
    bottom: 30, // Adjusted since tab bar is fixed
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF8C42',
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
    padding: 32,
    marginTop: 20,
  },
  emptyStateIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyStateBody: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    maxWidth: '80%',
  },
  createEventButton: {
    backgroundColor: '#FF8C42',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    shadowColor: '#FF8C42',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  useGpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 8,
  },
  useGpsText: {
    color: '#FF8C42',
    fontWeight: '600',
    marginLeft: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FF8C42',
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
