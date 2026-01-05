import { Image } from 'expo-image';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function HomeScreen() {
  const router = useRouter();

  useEffect(() => {
    // POC: Show welcome modal after a short delay
    const timer = setTimeout(() => {
      router.push('/welcome');
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity>
          <Ionicons name="menu-outline" size={28} color="#FF8C42" />
        </TouchableOpacity>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.headerLogo}
          contentFit="contain"
        />
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <Ionicons name="person-circle-outline" size={32} color="#FF8C42" />
        </TouchableOpacity>
      </View>

      <View style={styles.locationBar}>
        <Ionicons name="location-outline" size={20} color="#667" />
        <Text style={styles.locationText}>Trindade, Florianópolis - SC</Text>
        <Ionicons name="search-outline" size={20} color="#667" style={styles.searchIcon} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Eventos próximos</Text>

        {/* Horizontal Scroll for Featured */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredContainer}>
          <View style={styles.featuredCard}>
            <View style={styles.featuredImagePlaceholder} />
            <Text style={styles.featuredTitle}>Almoço de Domingo</Text>
          </View>
          <View style={styles.featuredCard}>
            <View style={styles.featuredImagePlaceholder} />
            <Text style={styles.featuredTitle}>Jantar Italiano</Text>
          </View>
        </ScrollView>

        <Text style={styles.sectionTitle}>Destaques da semana</Text>

        {/* Feed Card 1 */}
        <View style={styles.feedCard}>
          <View style={styles.cardImagePlaceholder} />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Almoço típico manezinho na casa da dona Cida</Text>
            <View style={styles.hostInfo}>
              <Text style={styles.hostName}>Maria Aparecida Andrade Melo</Text>
              <Ionicons name="checkmark-circle" size={14} color="#FF8C42" style={{ marginLeft: 4 }} />
            </View>
            <Text style={styles.cardLocation}>Morro das Pedras, Florianópolis</Text>
            <Text style={styles.cardTime}>24 de Dezembro - de 8:30 às 10:00</Text>
            <Text style={styles.cardSpots}>4 lugares • 3 disponíveis</Text>
          </View>
        </View>

        {/* Feed Card 2 */}
        <View style={styles.feedCard}>
          <View style={styles.cardImagePlaceholder} />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Café da tarde colonial</Text>
            <View style={styles.hostInfo}>
              <Text style={styles.hostName}>Roberto Silva</Text>
              <Ionicons name="checkmark-circle" size={14} color="#FF8C42" style={{ marginLeft: 4 }} />
            </View>
            <Text style={styles.cardLocation}>Centro, Florianópolis</Text>
            <Text style={styles.cardTime}>25 de Dezembro - de 16:00 às 18:00</Text>
            <Text style={styles.cardSpots}>6 lugares • 2 disponíveis</Text>
          </View>
        </View>


      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/events/create')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLogo: {
    width: 120,
    height: 40,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
  },
  locationText: {
    flex: 1,
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  searchIcon: {
    marginLeft: 8,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  featuredContainer: {
    paddingLeft: 16,
  },
  featuredCard: {
    width: 200,
    marginRight: 16,
  },
  featuredImagePlaceholder: {
    width: 200,
    height: 120,
    backgroundColor: '#eee',
    borderRadius: 12,
    marginBottom: 8,
  },
  featuredTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  feedCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#eee',
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  hostName: {
    fontSize: 12,
    color: '#666',
  },
  cardLocation: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  cardTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  cardSpots: {
    fontSize: 12,
    color: '#FF8C42',
    fontWeight: '600',
  },
});
