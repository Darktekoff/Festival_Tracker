import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DrinkRecord } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { formatUnits } from '../../utils/calculations';
import { Ionicons } from '@expo/vector-icons';

interface RecentDrinkButtonsProps {
  recentDrinks: DrinkRecord[];
  onRecentDrinkPress: (drink: DrinkRecord) => void;
  isLoading?: boolean;
  maxItems?: number;
}

export function RecentDrinkButtons({ 
  recentDrinks, 
  onRecentDrinkPress, 
  isLoading,
  maxItems = 3
}: RecentDrinkButtonsProps) {
  const { colors } = useTheme();

  if (recentDrinks.length === 0) {
    return null;
  }

  // Grouper les boissons récentes par type/nom pour éviter les doublons
  const uniqueDrinks = recentDrinks.reduce((unique: DrinkRecord[], drink) => {
    const drinkKey = drink.customName || `${drink.category}-${drink.drinkType}`;
    const existingIndex = unique.findIndex(d => 
      (d.customName || `${d.category}-${d.drinkType}`) === drinkKey
    );
    
    if (existingIndex === -1) {
      unique.push(drink);
    }
    
    return unique;
  }, []).slice(0, maxItems);

  const getCategoryGradient = (category: string) => {
    switch (category) {
      case 'beer':
        return ['#FFC107', '#FF8F00'];
      case 'wine':
        return ['#E91E63', '#AD1457'];
      case 'cocktail':
        return ['#2196F3', '#1565C0'];
      case 'shot':
        return ['#FF5722', '#D84315'];
      case 'champagne':
        return ['#FFD700', '#FFA000'];
      default:
        return [colors.primary, colors.secondary];
    }
  };

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case 'beer': return '🍺';
      case 'wine': return '🍷';
      case 'cocktail': return '🍹';
      case 'shot': return '🥃';
      case 'champagne': return '🥂';
      default: return '🍸';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleSection}>
        <Ionicons name="time" size={20} color={colors.primary} />
        <Text style={[styles.modernTitle, { color: colors.text }]}>
          Mes dernières boissons
        </Text>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {uniqueDrinks.map((drink, index) => (
          <TouchableOpacity
            key={`recent-${drink.id}-${index}`}
            onPress={() => onRecentDrinkPress(drink)}
            disabled={isLoading}
            activeOpacity={0.8}
            style={styles.modernRecentButton}
          >
            <LinearGradient
              colors={getCategoryGradient(drink.category)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientContainer}
            >
              <View style={styles.modernDrinkInfo}>
                <Text style={styles.categoryEmoji}>
                  {getCategoryEmoji(drink.category)}
                </Text>
                <Text style={styles.modernDrinkName}>
                  {drink.customName || drink.drinkType}
                </Text>
                <View style={styles.modernDrinkDetails}>
                  <Text style={styles.modernDetailText}>
                    {drink.volume}cl • {drink.alcoholDegree}%
                  </Text>
                </View>
                <View style={styles.unitsContainer}>
                  <Text style={styles.modernUnitsText}>
                    {formatUnits(drink.alcoholUnits)} unités
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4
  },
  modernTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3
  },
  scrollContainer: {
    gap: 16,
    paddingHorizontal: 4
  },
  modernRecentButton: {
    width: 140,
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4
  },
  gradientContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12
  },
  modernDrinkInfo: {
    alignItems: 'center',
    gap: 6
  },
  categoryEmoji: {
    fontSize: 24,
    marginBottom: 2
  },
  modernDrinkName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    maxWidth: 110
  },
  modernDrinkDetails: {
    marginTop: 2
  },
  modernDetailText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.9,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  unitsContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4
  },
  modernUnitsText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  }
});