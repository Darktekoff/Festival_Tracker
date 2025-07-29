import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DrinkRecord } from '../../types';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { useTheme } from '../../context/ThemeContext';
import { formatDateTime, getTimeAgo } from '../../utils/dateUtils';
import { formatUnits } from '../../utils/calculations';
import { Ionicons } from '@expo/vector-icons';
import { getDrinkCategoryIcon, IconName, parseAvatarString } from '../../utils/iconMappings';

interface DrinkItemProps {
  drink: DrinkRecord;
  showUser?: boolean;
  compact?: boolean;
  userTodayDrinks?: number; // Nombre de boissons du jour pour ce user
}

export function DrinkItem({ drink, showUser = true, compact = false, userTodayDrinks }: DrinkItemProps) {
  const { colors, theme } = useTheme();

  const categoryIcon = getDrinkCategoryIcon(drink.category);

  const getPersonalizedMessage = useMemo(() => {
    const drinkName = drink.customName || drink.drinkType || 'Boisson';
    const userName = drink.userName || 'Utilisateur';
    const count = userTodayDrinks || 1;
    
    // Vérifier si les données essentielles existent
    if (!drinkName || !userName) {
      return `Boisson ajoutée récemment 🍸`;
    }
    
    // Messages variés selon le type de boisson
    const messages = {
      beer: [
        `${userName} se tape une ${drinkName}! Il est à son ${count}${count === 1 ? 'er' : 'ème'} verre 🍺`,
        `${userName} descend une ${drinkName}! C'est son ${count}${count === 1 ? 'er' : 'ème'} aujourd'hui 🍻`,
        `${userName} se fait plaisir avec une ${drinkName}! Verre n°${count} ✨`,
        `${userName} sirote une ${drinkName}! En voilà ${count} pour lui 🎉`
      ],
      wine: [
        `${userName} déguste un ${drinkName}! ${count}${count === 1 ? 'er' : 'ème'} verre au compteur 🍷`,
        `${userName} se régale d'un ${drinkName}! Il en est à ${count} 🍇`,
        `${userName} savoure un ${drinkName}! Verre n°${count} de la journée ✨`,
        `${userName} s'offre un ${drinkName}! C'est parti pour le ${count}${count === 1 ? 'er' : 'ème'} 🎊`
      ],
      cocktail: [
        `${userName} se fait un ${drinkName}! Son ${count}${count === 1 ? 'er' : 'ème'} cocktail 🍹`,
        `${userName} mixe un ${drinkName}! Cocktail n°${count} ✨`,
        `${userName} se concocte un ${drinkName}! Il en est à ${count} 🎉`,
        `${userName} shake un ${drinkName}! C'est son ${count}${count === 1 ? 'er' : 'ème'} 🍸`
      ],
      shot: [
        `${userName} descend un ${drinkName}! Shot n°${count} 🥃`,
        `${userName} se tape un ${drinkName}! ${count}${count === 1 ? 'er' : 'ème'} shot au compteur 🔥`,
        `${userName} cul sec un ${drinkName}! Il en est à ${count} 💥`,
        `${userName} claque un ${drinkName}! C'est son ${count}${count === 1 ? 'er' : 'ème'} 🎯`
      ],
      champagne: [
        `${userName} sabr... non, boit un ${drinkName}! ${count}${count === 1 ? 'er' : 'ème'} verre 🥂`,
        `${userName} fait péter le ${drinkName}! Il en est à ${count} 🍾`,
        `${userName} se la joue chic avec un ${drinkName}! Verre n°${count} ✨`,
        `${userName} bulles avec un ${drinkName}! Son ${count}${count === 1 ? 'er' : 'ème'} 🎊`
      ],
      soft: [
        `${userName} s'hydrate avec ${drinkName}! C'est sa ${count}${count === 1 ? 'ère' : 'ème'} 💧`,
        `${userName} fait une pause fraîcheur avec ${drinkName}! ${count}${count === 1 ? 'ère' : 'ème'} boisson sans alcool 🥤`,
        `${userName} se rafraîchit avec ${drinkName}! Verre n°${count} ✨`,
        `${userName} reste sobre avec ${drinkName}! Boisson n°${count} 🌿`
      ],
      other: [
        `${userName} se tape un ${drinkName}! Il est à son ${count}${count === 1 ? 'er' : 'ème'} verre 🍸`,
        `${userName} descend un ${drinkName}! C'est son ${count}${count === 1 ? 'er' : 'ème'} aujourd'hui 🎉`,
        `${userName} se fait plaisir avec un ${drinkName}! Verre n°${count} ✨`,
        `${userName} sirote un ${drinkName}! En voilà ${count} pour lui 🎊`
      ]
    };

    const categoryMessages = messages[drink.category] || [
      `${userName} se tape un ${drinkName}! Il est à son ${count}${count === 1 ? 'er' : 'ème'} verre 🍸`,
      `${userName} descend un ${drinkName}! C'est son ${count}${count === 1 ? 'er' : 'ème'} aujourd'hui 🎉`,
      `${userName} se fait plaisir avec un ${drinkName}! Verre n°${count} ✨`,
      `${userName} sirote un ${drinkName}! En voilà ${count} pour lui 🎊`
    ];

    // Choisir un message basé sur l'ID du drink pour avoir de la consistance
    let messageIndex = 0;
    if (drink.id) {
      // Prendre le dernier caractère alphanumérique et le convertir en nombre
      const lastChar = drink.id.slice(-1);
      const charCode = lastChar.charCodeAt(0);
      messageIndex = charCode % categoryMessages.length;
    }
    
    const finalMessage = categoryMessages[messageIndex];
    
    return finalMessage || `${userName} a ajouté ${drinkName} 🍸`;
  }, [drink.customName, drink.drinkType, drink.userName, drink.category, drink.id, userTodayDrinks]);

  if (compact) {
    return (
      <View style={[styles.compactContainer, { borderBottomColor: colors.border }]}>
        {showUser && (
          <Avatar avatarData={parseAvatarString(drink.userAvatar)} name={drink.userName} size="small" style={styles.compactAvatar} />
        )}
        <View style={[styles.compactCategoryIcon, { backgroundColor: categoryIcon.color }]}>
          <Ionicons name={categoryIcon.name as IconName} size={16} color="#ffffff" />
        </View>
        <View style={styles.compactContent}>
          {showUser ? (
            <Text style={[styles.personalizedMessage, { color: colors.text }]}>
              {getPersonalizedMessage}
            </Text>
          ) : (
            <View style={styles.compactHeader}>
              <Text style={[styles.drinkName, { color: colors.text }]}>
                {drink.customName || drink.drinkType}
              </Text>
            </View>
          )}
          <Text style={[styles.compactDetails, { color: colors.textLight }]}>
            {drink.volume}cl · {drink.alcoholDegree}% · {formatUnits(drink.alcoholUnits)} unités
          </Text>
        </View>
        <Text style={[styles.timeAgo, { color: colors.textLight }]}>
          {getTimeAgo(drink.timestamp)}
        </Text>
      </View>
    );
  }

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        {showUser && (
          <>
            <Avatar avatarData={parseAvatarString(drink.userAvatar)} name={drink.userName} size="small" />
            <Text style={[styles.userName, { color: colors.text, marginLeft: theme.spacing.sm }]}>
              {drink.userName}
            </Text>
          </>
        )}
        <View style={{ flex: 1 }} />
        <Text style={[styles.time, { color: colors.textLight }]}>
          {formatDateTime(drink.timestamp)}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={[styles.categoryIconContainer, { backgroundColor: categoryIcon.color }]}>
          <Ionicons name={categoryIcon.name as IconName} size={24} color="#ffffff" />
        </View>
        <View style={styles.drinkInfo}>
          <Text style={[styles.drinkName, { color: colors.text }]}>
            {drink.customName || drink.drinkType}
          </Text>
          {drink.brand && (
            <Text style={[styles.brand, { color: colors.textLight }]}>
              {drink.brand}
            </Text>
          )}
          <View style={styles.details}>
            <View style={styles.detailItem}>
              <Ionicons name="water" size={16} color={colors.textLight} />
              <Text style={[styles.detailText, { color: colors.textLight }]}>
                {drink.volume}cl
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="analytics" size={16} color={colors.textLight} />
              <Text style={[styles.detailText, { color: colors.textLight }]}>
                {drink.alcoholDegree}%
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="flash" size={16} color={colors.primary} />
              <Text style={[styles.detailText, { color: colors.primary }]}>
                {formatUnits(drink.alcoholUnits)} unités
              </Text>
            </View>
          </View>
        </View>
      </View>

      {drink.syncStatus === 'pending' && (
        <View style={[styles.syncIndicator, { backgroundColor: colors.warning }]}>
          <Ionicons name="cloud-offline" size={14} color="#ffffff" />
          <Text style={styles.syncText}>En attente de synchronisation</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  userName: {
    fontWeight: '500'
  },
  time: {
    fontSize: 12
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  categoryIcon: {
    fontSize: 32,
    marginRight: 12
  },
  categoryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  compactCategoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  drinkInfo: {
    flex: 1
  },
  drinkName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  brand: {
    fontSize: 14,
    marginBottom: 8
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  detailText: {
    fontSize: 14
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start'
  },
  syncText: {
    color: '#ffffff',
    fontSize: 12
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1
  },
  compactAvatar: {
    marginRight: 8
  },
  compactContent: {
    flex: 1,
    marginLeft: 12
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  compactUserName: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4
  },
  personalizedMessage: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: 2
  },
  compactDetails: {
    fontSize: 12,
    marginTop: 2
  },
  timeAgo: {
    fontSize: 12
  }
});