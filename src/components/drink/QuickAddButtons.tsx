import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DrinkRecord } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { formatUnits } from '../../utils/calculations';
import * as Haptics from 'expo-haptics';

interface QuickAddButtonsProps {
  userDrinks: DrinkRecord[];
  onQuickAdd: (drink: DrinkRecord) => void;
  isLoading?: boolean;
}

export function QuickAddButtons({ userDrinks, onQuickAdd, isLoading }: QuickAddButtonsProps) {
  const { colors, theme } = useTheme();
  const [hiddenDrinks, setHiddenDrinks] = useState<Set<string>>(new Set());
  const [recentlyClicked, setRecentlyClicked] = useState<Set<string>>(new Set());


  // Calculer les boissons favorites par fréquence d'utilisation (exclure les triches)
  const getFavoriteDrinks = () => {
    if (!userDrinks.length) return [];

    // Filtrer seulement les triches (inclure les templates car ils sont faits pour les favoris)
    const validDrinks = userDrinks.filter(drink => drink.drinkType !== 'Triche');
    
    if (!validDrinks.length) return [];

    // Grouper les boissons par signature unique
    const drinkGroups = validDrinks.reduce((groups: { [key: string]: { drink: DrinkRecord, count: number } }, drink) => {
      const signature = `${drink.customName || drink.drinkType}-${drink.volume}-${drink.alcoholDegree}-${drink.category}`;
      
      // Ignorer les boissons masquées
      if (hiddenDrinks.has(signature)) {
        return groups;
      }
      
      if (!groups[signature]) {
        groups[signature] = { drink, count: 0 };
      }
      // CORRECTION: Ne compter que les consommations réelles (pas les templates)
      if (!drink.isTemplate) {
        groups[signature].count++;
      }
      
      return groups;
    }, {});

    // Trier par fréquence et templates récents, puis prendre les 6 plus populaires
    const result = Object.values(drinkGroups)
      .sort((a, b) => {
        // Prioriser les templates récents (créés dans les dernières 5 minutes)
        const now = new Date().getTime();
        const aIsRecent = a.drink.isTemplate && (now - a.drink.createdAt.getTime()) < 5 * 60 * 1000;
        const bIsRecent = b.drink.isTemplate && (now - b.drink.createdAt.getTime()) < 5 * 60 * 1000;
        
        if (aIsRecent && !bIsRecent) return -1;
        if (!aIsRecent && bIsRecent) return 1;
        
        // Sinon, trier par fréquence
        return b.count - a.count;
      })
      .slice(0, 6)
      .map(group => ({ ...group.drink, usageCount: group.count }));
    
    return result;
  };

  const favoriteDrinks = getFavoriteDrinks();

  const getGradientColors = (category: string) => {
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
      case 'soft':
        return ['#00BCD4', '#0097A7'];
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
      case 'soft': return '💧';
      default: return '🍸';
    }
  };

  const handleLongPress = async (drink: DrinkRecord) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const drinkName = drink.customName || drink.drinkType;
    const signature = `${drink.customName || drink.drinkType}-${drink.volume}-${drink.alcoholDegree}-${drink.category}`;
    
    Alert.alert(
      'Retirer des favoris',
      `Voulez-vous retirer "${drinkName}" de vos boissons favorites ?`,
      [
        {
          text: 'Annuler',
          style: 'cancel'
        },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: () => {
            setHiddenDrinks(prev => new Set([...prev, signature]));
          }
        }
      ]
    );
  };

  const handleQuickAdd = (drink: DrinkRecord) => {
    const drinkId = drink.id;
    
    // Vérifier si ce bouton a été cliqué récemment
    if (recentlyClicked.has(drinkId) || isLoading) {
      return;
    }
    
    // Marquer comme récemment cliqué
    setRecentlyClicked(prev => new Set([...prev, drinkId]));
    
    // Appeler la fonction de callback
    onQuickAdd(drink);
    
    // Retirer de la liste après 2 secondes
    setTimeout(() => {
      setRecentlyClicked(prev => {
        const newSet = new Set(prev);
        newSet.delete(drinkId);
        return newSet;
      });
    }, 2000);
  };

  // État vide pour nouveaux utilisateurs
  if (favoriteDrinks.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="wine" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Vos boissons favorites
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.textLight }]}>
            Créez vos premières boissons personnalisées.{'\n'}
            Elles apparaîtront ici pour un ajout rapide !{'\n\n'}
            💡 Conseil : Appui long pour retirer des favoris
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleSection}>
        <Ionicons name="star" size={20} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Mes boissons favorites
        </Text>
      </View>
      
      <View style={styles.infoSection}>
        <Text style={[styles.infoText, { color: colors.textLight }]}>
          Appui long pour retirer des favoris
        </Text>
      </View>
      
      <View style={styles.modernGridContainer}>
        {favoriteDrinks.map((drink, index) => (
          <TouchableOpacity
            key={`favorite-${drink.id}-${index}`}
            onPress={() => handleQuickAdd(drink)}
            onLongPress={() => handleLongPress(drink)}
            disabled={isLoading || recentlyClicked.has(drink.id)}
            activeOpacity={0.8}
            style={styles.modernQuickButton}
          >
            <LinearGradient
              colors={getGradientColors(drink.category)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientCard}
            >
              <View style={styles.cardContent}>
                <Text style={styles.emojiLarge}>{getCategoryEmoji(drink.category)}</Text>
                <Text style={styles.drinkName}>
                  {drink.customName || drink.drinkType}
                </Text>
                <View style={styles.drinkDetails}>
                  <Text style={styles.drinkVolume}>{drink.volume}cl</Text>
                  <Text style={styles.drinkAlcohol}>{drink.alcoholDegree}%</Text>
                </View>
                {drink.usageCount && drink.usageCount > 1 && (
                  <View style={styles.usageBadge}>
                    <Text style={styles.usageText}>{drink.usageCount}×</Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3
  },
  infoSection: {
    alignItems: 'center',
    marginBottom: 8
  },
  infoText: {
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.8
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center'
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24
  },
  modernGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16
  },
  modernQuickButton: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6
  },
  gradientCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  cardContent: {
    alignItems: 'center',
    gap: 8
  },
  emojiLarge: {
    fontSize: 36,
    marginBottom: 4
  },
  drinkName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  drinkDetails: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4
  },
  drinkVolume: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.9,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  drinkAlcohol: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.9,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  usageBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4
  },
  usageText: {
    color: '#333333',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.3
  }
});