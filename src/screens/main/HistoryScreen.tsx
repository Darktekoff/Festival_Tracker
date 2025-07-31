import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { DrinkItem } from '../../components/drink/DrinkItem';
import { TimeSeparator } from '../../components/drink/TimeSeparator';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useTheme } from '../../context/ThemeContext';
import { useAuthContext } from '../../context/AuthContext';
import { useGroupContext } from '../../context/GroupContext';
import { useDrinks } from '../../hooks/useDrinks';
import { DrinkRecord } from '../../types';
import { formatDate, groupByDay } from '../../utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';

interface HistoryScreenProps {
  navigation: any;
}

export function HistoryScreen({ navigation }: HistoryScreenProps) {
  const { colors, theme } = useTheme();
  const { user } = useAuthContext();
  const { group } = useGroupContext();
  const { drinks, isLoading, refresh, loadMore, hasMore } = useDrinks(group?.id || null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'me'>('all');

  const filteredDrinks = filter === 'me' 
    ? drinks.filter(d => d.userId === user?.id)
    : drinks;

  const groupedDrinks = groupByDay(filteredDrinks);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (hasMore && !isLoading) {
      await loadMore();
    }
  };

  // Auto-refresh quand on navigue vers cet onglet (avec délai pour éviter la boucle)
  useFocusEffect(
    useCallback(() => {
      console.log('HistoryScreen - Focus gained, refreshing data...');
      const timeoutId = setTimeout(() => {
        refresh();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }, [])
  );

  const renderDrinkItem = ({ item }: { item: DrinkRecord }) => (
    <DrinkItem
      drink={item}
      showUser={filter === 'all' && group ? Object.keys(group.members).length > 1 : false}
    />
  );

  const renderDaySection = ({ item }: { item: [string, DrinkRecord[]] }) => {
    const [dateStr, dayDrinks] = item;
    const date = new Date(dateStr);
    
    // Séparer les boissons normales et les triches (exclure les templates)
    const normalDrinks = dayDrinks.filter(d => d.drinkType !== 'Triche' && !d.isTemplate);
    const triches = dayDrinks.filter(d => d.drinkType === 'Triche' && !d.isTemplate);
    
    return (
      <View style={styles.daySection}>
        <Text style={[styles.dayHeader, { color: colors.text }]}>
          {formatDate(date, 'EEEE dd/MM/yyyy')}
        </Text>
        <View style={styles.dayCountContainer}>
          <Text style={[styles.dayCount, { color: colors.textLight }]}>
            {normalDrinks.length} boisson{normalDrinks.length > 1 ? 's' : ''}
          </Text>
          {triches.length > 0 && (
            <Text style={[styles.dayCount, { color: '#FF9800' }]}>
              {triches.length} triche{triches.length > 1 ? 's' : ''} ⚡
            </Text>
          )}
        </View>
        <View style={styles.dayDrinks}>
          {dayDrinks.map((drink, index) => {
            const elements = [];
            
            // Ajouter le séparateur de temps uniquement en mode "Mes boissons"
            if (filter === 'me' && index > 0) {
              const previousDrink = dayDrinks[index - 1];
              const timeDiff = Math.round(
                (previousDrink.timestamp.getTime() - drink.timestamp.getTime()) / (1000 * 60)
              );
              
              if (timeDiff > 0) {
                elements.push(
                  <TimeSeparator key={`sep-${drink.id}`} minutes={timeDiff} />
                );
              }
            }
            
            // Ajouter la boisson
            elements.push(
              <DrinkItem
                key={drink.id}
                drink={drink}
                showUser={filter === 'all'}
              />
            );
            
            return elements;
          })}
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="wine" size={64} color={colors.textLight} />
      <Text style={[styles.emptyText, { color: colors.textLight }]}>
        Aucune boisson trouvée
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.textLight }]}>
        {filter === 'me' 
          ? 'Vous n\'avez pas encore ajouté de boisson'
          : 'Aucune boisson n\'a été ajoutée dans ce groupe'
        }
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={styles.footer}>
        <LoadingSpinner text="Chargement..." />
      </View>
    );
  };

  const sectionsData = Array.from(groupedDrinks.entries())
    .sort(([a], [b]) => b.localeCompare(a)); // Trier par date décroissante

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Historique
        </Text>
        
        <View style={styles.filterContainer}>
          <TouchableOpacity
            onPress={() => setFilter('all')}
            style={[
              styles.filterButton,
              filter === 'all' && { backgroundColor: colors.primary }
            ]}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color: filter === 'all' ? '#ffffff' : colors.textLight
                }
              ]}
            >
              Tous
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setFilter('me')}
            style={[
              styles.filterButton,
              filter === 'me' && { backgroundColor: colors.primary }
            ]}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color: filter === 'me' ? '#ffffff' : colors.textLight
                }
              ]}
            >
              Mes boissons
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={sectionsData}
        renderItem={renderDaySection}
        keyExtractor={([dateStr]) => dateStr}
        contentContainerStyle={[
          styles.content,
          sectionsData.length === 0 && styles.emptyContent
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  title: {
    fontSize: 20,
    fontWeight: '600'
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f8f9fa'
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500'
  },
  content: {
    padding: 16
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center'
  },
  daySection: {
    marginBottom: 24
  },
  dayHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4
  },
  dayCountContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12
  },
  dayCount: {
    fontSize: 14
  },
  dayDrinks: {
    gap: 8
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center'
  },
  footer: {
    paddingVertical: 16
  }
});