import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { DrinkCategory, DrinkTemplate } from '../../types';
import { DRINK_TEMPLATES } from '../../utils/constants';
import { useTheme } from '../../context/ThemeContext';
import { Card } from '../ui/Card';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { getDrinkCategoryIcon, IconName } from '../../utils/iconMappings';

interface DrinkTypeSelectorProps {
  onSelect: (template: DrinkTemplate) => void;
  selectedCategory?: DrinkCategory;
  selectedType?: string;
}

export function DrinkTypeSelector({
  onSelect,
  selectedCategory,
  selectedType
}: DrinkTypeSelectorProps) {
  const { colors, theme } = useTheme();
  const [activeCategory, setActiveCategory] = useState<DrinkCategory>(
    selectedCategory || 'beer'
  );

  const categories: { key: DrinkCategory; label: string }[] = [
    { key: 'beer', label: 'Bières' },
    { key: 'wine', label: 'Vins' },
    { key: 'cocktail', label: 'Cocktails' },
    { key: 'shot', label: 'Shots' },
    { key: 'champagne', label: 'Champagne' },
    { key: 'soft', label: 'Sans alcool' },
    { key: 'other', label: 'Autres' }
  ];

  const filteredTemplates = DRINK_TEMPLATES.filter(
    template => template.category === activeCategory
  );

  const handleCategoryPress = async (category: DrinkCategory) => {
    await Haptics.selectionAsync();
    setActiveCategory(category);
  };

  const handleTemplatePress = async (template: DrinkTemplate) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(template);
  };

  return (
    <View style={styles.container}>
      <View style={styles.categoriesContainer}>
        <View style={styles.categoriesGrid}>
          {categories.map(category => (
            <TouchableOpacity
              key={category.key}
              onPress={() => handleCategoryPress(category.key)}
              style={[
                styles.categoryButton,
                {
                  backgroundColor: activeCategory === category.key ? colors.primary : colors.surface,
                  borderColor: activeCategory === category.key ? colors.primary : colors.border
                }
              ]}
            >
              <Ionicons 
                name={getDrinkCategoryIcon(category.key).name as IconName} 
                size={20} 
                color={activeCategory === category.key ? '#ffffff' : getDrinkCategoryIcon(category.key).color} 
              />
              <Text
                style={[
                  styles.categoryLabel,
                  {
                    color: activeCategory === category.key ? '#ffffff' : colors.text
                  }
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.templatesContainer}
        showsVerticalScrollIndicator={false}
      >
        {filteredTemplates.map((template, index) => (
          <TouchableOpacity
            key={`${template.category}-${template.type}-${index}`}
            onPress={() => handleTemplatePress(template)}
            activeOpacity={0.7}
          >
            <Card
              style={[
                styles.templateCard,
                selectedType === template.type && {
                  borderColor: colors.primary,
                  borderWidth: 2
                }
              ]}
              variant="outlined"
            >
              <View style={styles.templateContent}>
                <View style={[styles.templateIconContainer, { backgroundColor: getDrinkCategoryIcon(template.category).color }]}>
                  <Ionicons 
                    name={getDrinkCategoryIcon(template.category).name as IconName} 
                    size={24} 
                    color="#ffffff" 
                  />
                </View>
                <View style={styles.templateInfo}>
                  <Text style={[styles.templateName, { color: colors.text }]}>
                    {template.name}
                  </Text>
                  <Text style={[styles.templateDetails, { color: colors.textLight }]}>
                    {template.volume}cl · {template.defaultAlcohol}% alcool
                  </Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: '30%',
    maxWidth: '32%',
    justifyContent: 'center'
  },
  categoryEmoji: {
    fontSize: 16,
    marginRight: 4
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4
  },
  templatesContainer: {
    flex: 1,
    paddingHorizontal: 16
  },
  templateCard: {
    marginBottom: 8
  },
  templateContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  templateEmoji: {
    fontSize: 28,
    marginRight: 12
  },
  templateIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  templateInfo: {
    flex: 1
  },
  templateName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2
  },
  templateDetails: {
    fontSize: 14
  }
});