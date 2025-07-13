import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { providersApi, categoriesApi } from '../utils/api';
import { ServiceProvider, ServiceCategory } from '../types';
import ServiceProviderCard from '../components/ServiceProviderCard';
import ServiceCategoryCard from '../components/ServiceCategoryCard';

const { width } = Dimensions.get('window');

interface ServicesScreenProps {
  route?: {
    params?: {
      categoryId?: number;
    };
  };
}

const ServicesScreen: React.FC<ServicesScreenProps> = ({ route }) => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<ServiceProvider[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(route?.params?.categoryId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load categories and providers simultaneously
      const [categoriesData, providersData] = await Promise.all([
        categoriesApi.getAll(),
        providersApi.getAll()
      ]);
      
      setCategories(categoriesData || []);
      setProviders(providersData || []);
      
      // Apply initial filter if categoryId is provided
      if (route?.params?.categoryId) {
        const filtered = (providersData || []).filter(
          (provider) => provider.categoryId === route.params.categoryId
        );
        setFilteredProviders(filtered);
      } else {
        setFilteredProviders(providersData || []);
      }
    } catch (error) {
      console.error('Error loading services data:', error);
      Alert.alert('Error', 'Failed to load services. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterProviders();
  }, [selectedCategory, searchQuery, providers]);

  const filterProviders = () => {
    let filtered = providers;

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(provider => provider.categoryId === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(provider => 
        provider.user?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        provider.user?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        provider.category?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        provider.bio?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProviders(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCategoryPress = (categoryId: number) => {
    setSelectedCategory(selectedCategory === categoryId ? null : categoryId);
  };

  const renderCategoryItem = ({ item }: { item: ServiceCategory }) => (
    <TouchableOpacity
      style={[
        styles.categoryFilterChip,
        selectedCategory === item.id && styles.selectedCategoryChip
      ]}
      onPress={() => handleCategoryPress(item.id)}
    >
      <Text style={[
        styles.categoryFilterText,
        selectedCategory === item.id && styles.selectedCategoryText
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderProviderItem = ({ item }: { item: ServiceProvider }) => (
    <ServiceProviderCard 
      provider={item} 
      onPress={() => navigation.navigate('ServiceProviderDetail' as never, { providerId: item.id })}
    />
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading services...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Service Providers</Text>
        <Text style={styles.headerSubtitle}>
          {filteredProviders.length} provider{filteredProviders.length !== 1 ? 's' : ''} available
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search providers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filters */}
      <View style={styles.filtersSection}>
        <Text style={styles.filtersTitle}>Categories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.categoryFilterChip,
              !selectedCategory && styles.selectedCategoryChip
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[
              styles.categoryFilterText,
              !selectedCategory && styles.selectedCategoryText
            ]}>
              All
            </Text>
          </TouchableOpacity>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryFilterChip,
                selectedCategory === category.id && styles.selectedCategoryChip
              ]}
              onPress={() => handleCategoryPress(category.id)}
            >
              <Text style={[
                styles.categoryFilterText,
                selectedCategory === category.id && styles.selectedCategoryText
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Providers List */}
      <FlatList
        data={filteredProviders}
        renderItem={renderProviderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No providers found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery || selectedCategory
                ? 'Try adjusting your search or filters'
                : 'No service providers available at the moment'
              }
            </Text>
            {(searchQuery || selectedCategory) && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSearchQuery('');
                  setSelectedCategory(null);
                }}
              >
                <Text style={styles.clearFiltersText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 8,
  },
  clearButton: {
    marginLeft: 8,
  },
  filtersSection: {
    marginBottom: 16,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  categoryFilterChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedCategoryChip: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  categoryFilterText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: '#FFFFFF',
  },
  listContainer: {
    paddingBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  clearFiltersButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  clearFiltersText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ServicesScreen;