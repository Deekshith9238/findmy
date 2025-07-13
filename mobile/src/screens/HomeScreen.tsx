import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useLocation } from '../contexts/LocationContext';
import { useNavigation } from '@react-navigation/native';
import { tasksApi, providersApi, categoriesApi } from '../utils/api';
import { Task, ServiceProvider, ServiceCategory } from '../types';
import ServiceCategoryCard from '../components/ServiceCategoryCard';
import ServiceProviderCard from '../components/ServiceProviderCard';

const { width } = Dimensions.get('window');

const HomeScreen: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { notifications } = useNotifications();
  const { location } = useLocation();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [nearbyProviders, setNearbyProviders] = useState<ServiceProvider[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const loadData = async () => {
    try {
      setLoadingData(true);
      
      // Load categories
      const categoriesData = await categoriesApi.getAll();
      setCategories(categoriesData?.slice(0, 6) || []);

      if (user?.role === 'client') {
        // Load recent tasks for clients
        const tasksData = await tasksApi.getByClient(user.id);
        setRecentTasks(tasksData?.slice(0, 3) || []);
      } else if (user?.role === 'payment_approver') {
        // For payment approvers, redirect to payment approver screen
        navigation.navigate('PaymentApprover' as never);
        return;
      }

      // Load nearby providers
      const providersData = await providersApi.getAll();
      setNearbyProviders(providersData?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (user && !authLoading) {
      loadData();
    }
  }, [user, authLoading]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (authLoading || loadingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const renderCategoryItem = ({ item }: { item: ServiceCategory }) => (
    <ServiceCategoryCard 
      category={item} 
      onPress={() => navigation.navigate('Services' as never, { categoryId: item.id })}
    />
  );

  const renderProviderItem = ({ item }: { item: ServiceProvider }) => (
    <ServiceProviderCard 
      provider={item} 
      onPress={() => navigation.navigate('ServiceProviderDetail' as never, { providerId: item.id })}
    />
  );

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return '#FEF3C7';
      case 'in_progress':
        return '#DBEAFE';
      case 'completed':
        return '#D1FAE5';
      case 'cancelled':
        return '#FEE2E2';
      default:
        return '#F3F4F6';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>
          Find Your Perfect Helper
        </Text>
        <Text style={styles.heroSubtitle}>
          Connect with trusted local service providers for all your needs
        </Text>
        <TouchableOpacity 
          style={styles.heroButton}
          onPress={() => navigation.navigate('CreateTask' as never)}
        >
          <Text style={styles.heroButtonText}>Post a Task</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsSection}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>1,500+</Text>
          <Text style={styles.statLabel}>Happy Clients</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>800+</Text>
          <Text style={styles.statLabel}>Service Providers</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>5,000+</Text>
          <Text style={styles.statLabel}>Tasks Completed</Text>
        </View>
      </View>

      {/* Service Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Services</Text>
        <Text style={styles.sectionSubtitle}>Browse by category to find the right service for you</Text>
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          scrollEnabled={false}
          contentContainerStyle={styles.categoriesGrid}
        />
      </View>

      {/* Featured Providers */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Providers</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Services' as never)}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionSubtitle}>Top-rated professionals ready to help</Text>
        <FlatList
          data={nearbyProviders}
          renderItem={renderProviderItem}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
        />
      </View>

      {/* Recent Activity */}
      {user?.role === 'client' && recentTasks.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Tasks</Text>
          {recentTasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={styles.taskCard}
              onPress={() => navigation.navigate('TaskDetail' as never, { taskId: task.id })}
            >
              <View style={styles.taskHeader}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}>
                  <Text style={styles.statusText}>{task.status}</Text>
                </View>
              </View>
              <Text style={styles.taskDescription} numberOfLines={2}>
                {task.description}
              </Text>
              <View style={styles.taskFooter}>
                <Text style={styles.taskLocation}>
                  <Ionicons name="location-outline" size={14} color="#6B7280" />
                  {task.location}
                </Text>
                {task.budget && (
                  <Text style={styles.taskBudget}>
                    ${task.budget}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('CreateTask' as never)}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="add-circle" size={32} color="#3B82F6" />
            </View>
            <Text style={styles.actionTitle}>Post Task</Text>
            <Text style={styles.actionSubtitle}>Get help with your tasks</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('Services' as never)}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="people" size={32} color="#059669" />
            </View>
            <Text style={styles.actionTitle}>Find Providers</Text>
            <Text style={styles.actionSubtitle}>Browse service providers</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('Map' as never)}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="map" size={32} color="#7C3AED" />
            </View>
            <Text style={styles.actionTitle}>Map View</Text>
            <Text style={styles.actionSubtitle}>See nearby services</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('Tasks' as never)}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="list" size={32} color="#F59E0B" />
            </View>
            <Text style={styles.actionTitle}>My Tasks</Text>
            <Text style={styles.actionSubtitle}>Manage your tasks</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
  heroSection: {
    backgroundColor: '#3B82F6',
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#E0E7FF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  heroButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  seeAllText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  categoriesGrid: {
    paddingHorizontal: 16,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  taskDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskLocation: {
    fontSize: 12,
    color: '#6B7280',
  },
  taskBudget: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  quickActionsSection: {
    marginBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: (width - 48) / 2,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default HomeScreen;