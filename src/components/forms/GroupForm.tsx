import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useTheme } from '../../context/ThemeContext';
import { validateGroupSettings } from '../../utils/validation';
import { validateGroupName } from '../../utils/groupUtils';
import { GROUP_LIMITS } from '../../utils/constants';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface GroupFormProps {
  onSubmit: (data: {
    name: string;
    description: string;
    festivalDates: { start: Date; end: Date };
    maxMembers: number;
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function GroupForm({ onSubmit, onCancel, isLoading }: GroupFormProps) {
  const { colors, theme } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: new Date(),
    endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 jours plus tard
    maxMembers: 8
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const handleSubmit = () => {
    console.log('GroupForm handleSubmit called');
    const newErrors: { [key: string]: string } = {};

    // Validation du nom
    const nameValidation = validateGroupName(formData.name);
    if (!nameValidation.isValid) {
      newErrors.name = nameValidation.error!;
    }

    // Validation des paramètres
    const settingsValidation = validateGroupSettings({
      festivalDates: {
        start: formData.startDate,
        end: formData.endDate
      },
      maxMembers: formData.maxMembers
    });

    if (!settingsValidation.isValid) {
      Object.assign(newErrors, settingsValidation.errors);
    }

    console.log('Validation errors:', newErrors);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    console.log('Form data valid, calling onSubmit');
    onSubmit({
      name: formData.name.trim(),
      description: formData.description.trim(),
      festivalDates: {
        start: formData.startDate,
        end: formData.endDate
      },
      maxMembers: formData.maxMembers
    });
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(false);
    if (selectedDate) {
      setFormData(prev => {
        const updatedData = { ...prev, startDate: selectedDate };
        // Ajuster la date de fin si nécessaire
        if (selectedDate >= prev.endDate) {
          const newEndDate = new Date(selectedDate);
          newEndDate.setDate(newEndDate.getDate() + 1);
          updatedData.endDate = newEndDate;
        }
        return updatedData;
      });
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(false);
    if (selectedDate) {
      setFormData(prev => ({ ...prev, endDate: selectedDate }));
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Card style={styles.formCard}>
        <Text style={[styles.title, { color: colors.text }]}>
          Créer un groupe
        </Text>
        
        <Text style={[styles.subtitle, { color: colors.textLight }]}>
          Créez un groupe pour suivre votre consommation avec vos amis
        </Text>

        <View style={styles.form}>
          <Input
            label="Nom du groupe"
            value={formData.name}
            onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
            placeholder="Mon groupe festival"
            error={errors.name}
            icon="people"
            maxLength={GROUP_LIMITS.MAX_NAME_LENGTH}
          />

          <Input
            label="Description (optionnel)"
            value={formData.description}
            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            placeholder="Description du groupe..."
            multiline
            numberOfLines={3}
            icon="document-text"
            maxLength={200}
          />

          <View style={styles.dateSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Dates du festival
            </Text>
            
            <View style={styles.dateRow}>
              <View style={styles.dateInput}>
                <Text style={[styles.dateLabel, { color: colors.textLight }]}>
                  Date de début
                </Text>
                <Button
                  title={format(formData.startDate, 'dd/MM/yyyy', { locale: fr })}
                  onPress={() => setShowStartPicker(true)}
                  variant="ghost"
                  style={styles.dateButton}
                />
                {errors.startDate && (
                  <Text style={[styles.errorText, { color: colors.danger }]}>
                    {errors.startDate}
                  </Text>
                )}
              </View>

              <View style={styles.dateInput}>
                <Text style={[styles.dateLabel, { color: colors.textLight }]}>
                  Date de fin
                </Text>
                <Button
                  title={format(formData.endDate, 'dd/MM/yyyy', { locale: fr })}
                  onPress={() => setShowEndPicker(true)}
                  variant="ghost"
                  style={styles.dateButton}
                />
                {errors.endDate && (
                  <Text style={[styles.errorText, { color: colors.danger }]}>
                    {errors.endDate}
                  </Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.membersSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Nombre maximum de membres
            </Text>
            <Input
              value={formData.maxMembers.toString()}
              onChangeText={(text) => setFormData(prev => ({ 
                ...prev, 
                maxMembers: parseInt(text) || 2 
              }))}
              keyboardType="numeric"
              error={errors.maxMembers}
              icon="people"
            />
            <Text style={[styles.hint, { color: colors.textLight }]}>
              Entre 2 et {GROUP_LIMITS.MAX_MEMBERS} membres
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title="Annuler"
            onPress={onCancel}
            variant="ghost"
            style={styles.actionButton}
          />
          <Button
            title="Créer le groupe"
            onPress={handleSubmit}
            isLoading={isLoading}
            style={styles.actionButton}
          />
        </View>
      </Card>

      {showStartPicker && (
        <DateTimePicker
          value={formData.startDate}
          mode="date"
          display="default"
          onChange={handleStartDateChange}
          minimumDate={new Date()}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={formData.endDate}
          mode="date"
          display="default"
          onChange={handleEndDateChange}
          minimumDate={formData.startDate}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  formCard: {
    marginBottom: 16
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24
  },
  form: {
    gap: 16
  },
  dateSection: {
    marginVertical: 8
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12
  },
  dateInput: {
    flex: 1
  },
  dateLabel: {
    fontSize: 14,
    marginBottom: 4
  },
  dateButton: {
    justifyContent: 'flex-start'
  },
  membersSection: {
    marginVertical: 8
  },
  hint: {
    fontSize: 12,
    marginTop: 4
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24
  },
  actionButton: {
    flex: 1
  },
  errorText: {
    fontSize: 12,
    marginTop: 4
  }
});