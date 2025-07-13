import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ServiceCategory } from '../types';

interface ServiceCategoryCardProps {
  category: ServiceCategory;
  onPress: () => void;
}

const ServiceCategoryCard: React.FC<ServiceCategoryCardProps> = ({ category, onPress }) => {
  const getIconColor = () => {
    switch (category.name) {
      case "Home Cleaning":
        return { color: '#3B82F6', backgroundColor: '#EFF6FF' };
      case "Handyman":
        return { color: '#F97316', backgroundColor: '#FFF7ED' };
      case "Lawn Care":
        return { color: '#059669', backgroundColor: '#ECFDF5' };
      case "Tutoring":
        return { color: '#2563EB', backgroundColor: '#EFF6FF' };
      case "Pet Care":
        return { color: '#7C3AED', backgroundColor: '#F3E8FF' };
      default:
        return { color: '#2563EB', backgroundColor: '#EFF6FF' };
    }
  };

  const getIconName = () => {
    switch (category.icon) {
      case "Trash2":
        return "trash-outline";
      case "Hammer":
        return "hammer-outline";
      case "Scissors":
        return "cut-outline";
      case "BookOpen":
        return "book-outline";
      case "Paw":
        return "paw-outline";
      default:
        return "help-circle-outline";
    }
  };

  const colors = getIconColor();
  const iconName = getIconName();

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: colors.backgroundColor }]}>
        <Ionicons 
          name={iconName as any} 
          size={28} 
          color={colors.color} 
        />
      </View>
      <Text style={styles.title}>{category.name}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    margin: 4,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 120,
    justifyContent: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
});

export default ServiceCategoryCard;