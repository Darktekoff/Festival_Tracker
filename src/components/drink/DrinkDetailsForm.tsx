import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { DrinkTemplate, DrinkFormData } from '../../types';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { validateDrinkForm } from '../../utils/validation';
import { calculateAlcoholUnits } from '../../utils/calculations';

interface DrinkDetailsFormProps {
  template: DrinkTemplate;
  onSubmit: (data: DrinkFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DrinkDetailsForm({
  template,
  onSubmit,
  onCancel,
  isLoading = false
}: DrinkDetailsFormProps) {
  const { colors, theme } = useTheme();
  const [formData, setFormData] = useState<DrinkFormData>({
    category: template.category,
    drinkType: template.type,
    volume: template.volume,
    alcoholDegree: template.defaultAlcohol,
    customName: '',
    brand: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    // Réinitialiser le formulaire quand le template change
    setFormData({
      category: template.category,
      drinkType: template.type,
      volume: template.volume,
      alcoholDegree: template.defaultAlcohol,
      customName: '',
      brand: ''
    });
    setErrors({});
  }, [template]);

  const alcoholUnits = calculateAlcoholUnits(formData.volume, formData.alcoholDegree);

  const handleSubmit = () => {
    const validation = validateDrinkForm(formData);
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    // Confirmation pour les boissons très fortes
    if (alcoholUnits > 5) {
      Alert.alert(
        'Attention',
        `Cette boisson contient ${alcoholUnits.toFixed(1)} unités d'alcool. Êtes-vous sûr(e) ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Confirmer', onPress: () => onSubmit(formData) }
        ]
      );
      return;
    }

    onSubmit(formData);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.templateEmoji}>{template.emoji}</Text>
        <Text style={[styles.templateName, { color: colors.text }]}>
          {template.name}
        </Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Volume (cl)"
          value={formData.volume.toString()}
          onChangeText={(text) => setFormData(prev => ({ 
            ...prev, 
            volume: parseInt(text) || 0 
          }))}
          keyboardType="numeric"
          error={errors.volume}
          icon="water"
        />

        <Input
          label="Degré d'alcool (%)"
          value={formData.alcoholDegree.toString()}
          onChangeText={(text) => setFormData(prev => ({ 
            ...prev, 
            alcoholDegree: parseFloat(text) || 0 
          }))}
          keyboardType="numeric"
          error={errors.alcoholDegree}
          icon="analytics"
        />

        <Input
          label="Nom personnalisé (optionnel)"
          value={formData.customName}
          onChangeText={(text) => setFormData(prev => ({ 
            ...prev, 
            customName: text 
          }))}
          placeholder="Ex: Pinte IPA"
          error={errors.customName}
          icon="create"
        />

        <Input
          label="Marque (optionnel)"
          value={formData.brand}
          onChangeText={(text) => setFormData(prev => ({ 
            ...prev, 
            brand: text 
          }))}
          placeholder="Ex: Heineken"
          error={errors.brand}
          icon="business"
        />

        <View style={[styles.unitsIndicator, { backgroundColor: colors.surface }]}>
          <Text style={[styles.unitsLabel, { color: colors.text }]}>
            Unités d'alcool:
          </Text>
          <Text style={[styles.unitsValue, { color: colors.primary }]}>
            {alcoholUnits.toFixed(1)}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            title="Annuler"
            variant="ghost"
            onPress={onCancel}
            style={{ flex: 1, marginRight: 8 }}
          />
          <Button
            title="Créer"
            onPress={handleSubmit}
            isLoading={isLoading}
            style={{ flex: 1, marginLeft: 8 }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  templateEmoji: {
    fontSize: 36,
    marginBottom: 6
  },
  templateName: {
    fontSize: 18,
    fontWeight: '600'
  },
  form: {
    flex: 1,
    paddingTop: 12
  },
  unitsIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 16
  },
  unitsLabel: {
    fontSize: 16,
    fontWeight: '500'
  },
  unitsValue: {
    fontSize: 18,
    fontWeight: '600'
  },
  actions: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  }
});