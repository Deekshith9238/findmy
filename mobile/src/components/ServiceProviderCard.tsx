import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ServiceProvider } from '../types';

interface ServiceProviderCardProps {
  provider: ServiceProvider & {
    user: {
      firstName: string;
      lastName: string;
      profilePicture: string | null;
    };
    category: {
      name: string;
    };
    completedJobs?: number;
  };
  onPress: () => void;
}

const ServiceProviderCard: React.FC<ServiceProviderCardProps> = ({ provider, onPress }) => {
  const { user, category, hourlyRate, rating, bio, completedJobs = 0 } = provider;
  
  // For privacy, only show first name with last initial
  const displayName = `${user.firstName} ${user.lastName ? user.lastName.charAt(0) + '.' : ''}`;
  
  // Use default avatar if no profile picture is available
  const avatarSrc = user.profilePicture || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=random`;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Image 
            source={{ uri: avatarSrc }} 
            style={styles.avatar}
          />
          <View style={styles.info}>
            <Text style={styles.name}>{displayName}</Text>
            <View style={styles.badges}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{category.name}</Text>
              </View>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingText}>
                  {rating ? rating.toFixed(1) : "New"}
                </Text>
                <Text style={styles.jobsText}>
                  ({completedJobs})
                </Text>
              </View>
            </View>
            <Text style={styles.bio} numberOfLines={2}>
              {bio || `Professional ${category.name.toLowerCase()} service provider.`}
            </Text>
          </View>
        </View>
        
        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Starting at</Text>
            <Text style={styles.price}>${hourlyRate}/hr</Text>
          </View>
          <View style={styles.button}>
            <Text style={styles.buttonText}>View Profile</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginVertical: 4,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  categoryText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 4,
  },
  jobsText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  bio: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  price: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ServiceProviderCard;