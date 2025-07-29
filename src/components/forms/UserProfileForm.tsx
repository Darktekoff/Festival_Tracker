import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { calculateAdvancedBMI } from '../../utils/calculations';
import { calculatePersonalizedLimits } from '../../utils/alcoholLimits';

interface UserProfileFormProps {
  initialProfile?: {
    gender?: 'male' | 'female';
    age?: number;
    height?: number;
    weight?: number;
    activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active';
  };
  onSubmit: (profile: {
    gender: 'male' | 'female';
    age: number;
    height: number;
    weight: number;
    activityLevel: 'sedentary' | 'light' | 'moderate' | 'active';
  }) => void;
  onCancel?: () => void;
  isEditing?: boolean;
}

interface ValidationErrors {
  gender?: string;
  age?: string;
  height?: string;
  weight?: string;
}

export function UserProfileForm({ 
  initialProfile, 
  onSubmit, 
  onCancel, 
  isEditing = false 
}: UserProfileFormProps) {
  const { colors } = useTheme();
  
  // États du formulaire
  const [gender, setGender] = useState<'male' | 'female' | undefined>(initialProfile?.gender);
  const [age, setAge] = useState(initialProfile?.age?.toString() || '');
  const [height, setHeight] = useState(initialProfile?.height?.toString() || '');
  const [weight, setWeight] = useState(initialProfile?.weight?.toString() || '');
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'light' | 'moderate' | 'active'>(
    initialProfile?.activityLevel || 'moderate'
  );
  
  // États calculés et validation
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [calculatedData, setCalculatedData] = useState<any>(null);
  const [personalizedLimits, setPersonalizedLimits] = useState<any>(null);
  
  // Options d'activité physique
  const activityOptions = [
    {
      value: 'sedentary' as const,
      label: 'Sédentaire',
      description: 'Peu ou pas d\'exercice, travail de bureau',
      icon: 'desktop' as const
    },
    {
      value: 'light' as const,
      label: 'Légère',
      description: 'Exercice léger 1-3 fois/semaine',
      icon: 'walk' as const
    },
    {
      value: 'moderate' as const,
      label: 'Modérée',
      description: 'Exercice modéré 3-5 fois/semaine',
      icon: 'bicycle' as const
    },
    {
      value: 'active' as const,
      label: 'Active',
      description: 'Exercice intense 6-7 fois/semaine',
      icon: 'fitness' as const
    }
  ];
  
  // Validation en temps réel
  useEffect(() => {
    if (gender && age && height && weight) {
      const ageNum = parseInt(age);
      const heightNum = parseInt(height);
      const weightNum = parseFloat(weight);
      
      if (ageNum >= 18 && ageNum <= 100 && heightNum >= 140 && heightNum <= 220 && weightNum >= 30 && weightNum <= 200) {
        // Calcul des données corporelles
        const bodyData = calculateAdvancedBMI(heightNum, weightNum, ageNum, gender);
        setCalculatedData(bodyData);
        
        // Calcul des limites personnalisées
        const limits = calculatePersonalizedLimits({
          age: ageNum,
          gender,
          height: heightNum,
          weight: weightNum,
          activityLevel
        });
        setPersonalizedLimits(limits);
      }
    }
  }, [gender, age, height, weight, activityLevel]);
  
  // Validation des champs
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    if (!gender) {
      newErrors.gender = 'Sexe requis pour les calculs d\'alcoolémie';
    }
    
    const ageNum = parseInt(age);
    if (!age || isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
      newErrors.age = 'Âge requis (18-100 ans)';
    }
    
    const heightNum = parseInt(height);
    if (!height || isNaN(heightNum) || heightNum < 140 || heightNum > 220) {
      newErrors.height = 'Taille requise (140-220 cm)';
    }
    
    const weightNum = parseFloat(weight);
    if (!weight || isNaN(weightNum) || weightNum < 30 || weightNum > 200) {
      newErrors.weight = 'Poids requis (30-200 kg)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Soumission du formulaire
  const handleSubmit = () => {
    if (!validateForm()) {
      Alert.alert('Erreur', 'Veuillez corriger les erreurs dans le formulaire');
      return;
    }
    
    onSubmit({
      gender: gender!,
      age: parseInt(age),
      height: parseInt(height),
      weight: parseFloat(weight),
      activityLevel
    });
  };
  
  // Formatage des données BMI
  const getBMICategory = (category: string) => {
    const categories = {
      underweight: { label: 'Insuffisance pondérale', color: colors.info, icon: 'trending-down' },
      normal: { label: 'Poids normal', color: colors.success, icon: 'checkmark-circle' },
      overweight: { label: 'Surpoids', color: colors.warning, icon: 'trending-up' },
      obese: { label: 'Obésité', color: colors.danger, icon: 'warning' }
    };
    return categories[category as keyof typeof categories] || categories.normal;
  };
  
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="person-circle" size={32} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>
            {isEditing ? 'Modifier le profil' : 'Compléter le profil'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textLight }]}>
            Ces informations permettent des calculs d'alcoolémie précis et personnalisés
          </Text>
        </View>
        
        {/* Sexe */}
        <Card style={styles.formCard}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>
            Sexe <Text style={{ color: colors.danger }}>*</Text>
          </Text>
          <Text style={[styles.fieldDescription, { color: colors.textLight }]}>
            Important pour le calcul du coefficient de diffusion (Widmark)
          </Text>
          <View style={styles.genderButtons}>
            <Button
              title="👨 Homme"
              onPress={() => setGender('male')}
              variant={gender === 'male' ? 'primary' : 'ghost'}
              style={[styles.genderButton, gender === 'male' && { backgroundColor: colors.primary }]}
            />
            <Button
              title="👩 Femme"
              onPress={() => setGender('female')}
              variant={gender === 'female' ? 'primary' : 'ghost'}
              style={[styles.genderButton, gender === 'female' && { backgroundColor: colors.primary }]}
            />
          </View>
          {errors.gender && (
            <Text style={[styles.errorText, { color: colors.danger }]}>{errors.gender}</Text>
          )}
        </Card>
        
        {/* Âge */}
        <Card style={styles.formCard}>
          <Input
            label="Âge *"
            value={age}
            onChangeText={setAge}
            placeholder="Ex: 25"
            keyboardType="numeric"
            maxLength={3}
            error={errors.age}
          />
          <Text style={[styles.fieldDescription, { color: colors.textLight }]}>
            Le métabolisme varie avec l'âge : plus rapide chez les jeunes, plus lent après 40 ans
          </Text>
        </Card>
        
        {/* Taille */}
        <Card style={styles.formCard}>
          <Input
            label="Taille (cm) *"
            value={height}
            onChangeText={setHeight}
            placeholder="Ex: 175"
            keyboardType="numeric"
            maxLength={3}
            error={errors.height}
          />
          <Text style={[styles.fieldDescription, { color: colors.textLight }]}>
            Utilisée pour calculer l'IMC et estimer la composition corporelle
          </Text>
        </Card>
        
        {/* Poids */}
        <Card style={styles.formCard}>
          <Input
            label="Poids (kg) *"
            value={weight}
            onChangeText={setWeight}
            placeholder="Ex: 70.5"
            keyboardType="numeric"
            maxLength={5}
            error={errors.weight}
          />
          <Text style={[styles.fieldDescription, { color: colors.textLight }]}>
            Le poids détermine le volume de distribution de l'alcool dans le corps
          </Text>
        </Card>
        
        {/* Niveau d'activité */}
        <Card style={styles.formCard}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>
            Niveau d'activité physique
          </Text>
          <Text style={[styles.fieldDescription, { color: colors.textLight }]}>
            L'activité physique influence le métabolisme et l'élimination de l'alcool
          </Text>
          <View style={styles.activityOptions}>
            {activityOptions.map(option => (
              <Button
                key={option.value}
                title={
                  <View style={styles.activityButtonContent}>
                    <Ionicons 
                      name={option.icon} 
                      size={20} 
                      color={activityLevel === option.value ? '#ffffff' : colors.text} 
                    />
                    <View style={styles.activityButtonText}>
                      <Text style={[
                        styles.activityLabel,
                        { color: activityLevel === option.value ? '#ffffff' : colors.text }
                      ]}>
                        {option.label}
                      </Text>
                      <Text style={[
                        styles.activityDescription,
                        { color: activityLevel === option.value ? '#ffffff' : colors.textLight }
                      ]}>
                        {option.description}
                      </Text>
                    </View>
                  </View>
                }
                onPress={() => setActivityLevel(option.value)}
                variant={activityLevel === option.value ? 'primary' : 'ghost'}
                style={[
                  styles.activityButton,
                  activityLevel === option.value && { backgroundColor: colors.primary }
                ]}
              />
            ))}
          </View>
        </Card>
        
        {/* Données calculées */}
        {calculatedData && (
          <Card style={[styles.calculatedCard, { backgroundColor: colors.success + '10' }]}>
            <View style={styles.calculatedHeader}>
              <Ionicons name="calculator" size={24} color={colors.success} />
              <Text style={[styles.calculatedTitle, { color: colors.success }]}>
                Données calculées
              </Text>
            </View>
            
            <View style={styles.calculatedGrid}>
              <View style={styles.calculatedItem}>
                <Text style={[styles.calculatedValue, { color: colors.text }]}>
                  {calculatedData.bmi}
                </Text>
                <Text style={[styles.calculatedLabel, { color: colors.textLight }]}>
                  IMC
                </Text>
                <View style={[styles.bmiCategory, { backgroundColor: getBMICategory(calculatedData.bmiCategory).color + '20' }]}>
                  <Ionicons 
                    name={getBMICategory(calculatedData.bmiCategory).icon as any}
                    size={16} 
                    color={getBMICategory(calculatedData.bmiCategory).color} 
                  />
                  <Text style={[styles.bmiCategoryText, { color: getBMICategory(calculatedData.bmiCategory).color }]}>
                    {getBMICategory(calculatedData.bmiCategory).label}
                  </Text>
                </View>
              </View>
              
              <View style={styles.calculatedItem}>
                <Text style={[styles.calculatedValue, { color: colors.text }]}>
                  {calculatedData.bodyFatPercentage}%
                </Text>
                <Text style={[styles.calculatedLabel, { color: colors.textLight }]}>
                  Masse grasse estimée
                </Text>
              </View>
              
              <View style={styles.calculatedItem}>
                <Text style={[styles.calculatedValue, { color: colors.text }]}>
                  {calculatedData.leanBodyMass}kg
                </Text>
                <Text style={[styles.calculatedLabel, { color: colors.textLight }]}>
                  Masse maigre
                </Text>
              </View>
            </View>
          </Card>
        )}
        
        {/* Limites personnalisées */}
        {personalizedLimits && (
          <Card style={[styles.limitsCard, { backgroundColor: colors.info + '10' }]}>
            <View style={styles.limitsHeader}>
              <Ionicons name="shield-checkmark" size={24} color={colors.info} />
              <Text style={[styles.limitsTitle, { color: colors.info }]}>
                Vos limites personnalisées
              </Text>
            </View>
            
            <View style={styles.limitsGrid}>
              <View style={styles.limitItem}>
                <Text style={[styles.limitValue, { color: colors.text }]}>
                  {personalizedLimits.daily.units}
                </Text>
                <Text style={[styles.limitLabel, { color: colors.textLight }]}>
                  unités/jour max
                </Text>
              </View>
              
              <View style={styles.limitItem}>
                <Text style={[styles.limitValue, { color: colors.text }]}>
                  {personalizedLimits.weekly.units}
                </Text>
                <Text style={[styles.limitLabel, { color: colors.textLight }]}>
                  unités/semaine max
                </Text>
              </View>
              
              <View style={styles.limitItem}>
                <Text style={[styles.limitValue, { color: colors.text }]}>
                  {personalizedLimits.singleSession.units}
                </Text>
                <Text style={[styles.limitLabel, { color: colors.textLight }]}>
                  unités/session max
                </Text>
              </View>
            </View>
            
            <Text style={[styles.limitsNote, { color: colors.textLight }]}>
              Basé sur les recommandations OMS adaptées à votre profil
            </Text>
          </Card>
        )}
        
        {/* Actions */}
        <View style={styles.actions}>
          {onCancel && (
            <Button
              title="Annuler"
              onPress={onCancel}
              variant="ghost"
              style={styles.cancelButton}
            />
          )}
          <Button
            title={isEditing ? 'Sauvegarder' : 'Terminer'}
            onPress={handleSubmit}
            variant="primary"
            style={styles.submitButton}
            disabled={!gender || !age || !height || !weight}
          />
        </View>
        
        {/* Note de confidentialité */}
        <View style={styles.privacyNote}>
          <Ionicons name="lock-closed" size={16} color={colors.textLight} />
          <Text style={[styles.privacyText, { color: colors.textLight }]}>
            Ces données restent privées et sont utilisées uniquement pour personnaliser vos calculs d'alcoolémie
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    padding: 16,
    paddingBottom: 32
  },
  header: {
    alignItems: 'center',
    marginBottom: 24
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20
  },
  formCard: {
    marginBottom: 16,
    padding: 16
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  fieldDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 12
  },
  genderButton: {
    flex: 1
  },
  activityOptions: {
    gap: 12
  },
  activityButton: {
    paddingVertical: 16
  },
  activityButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  activityButtonText: {
    flex: 1,
    alignItems: 'flex-start'
  },
  activityLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2
  },
  activityDescription: {
    fontSize: 12,
    lineHeight: 16
  },
  errorText: {
    fontSize: 12,
    marginTop: 4
  },
  calculatedCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12
  },
  calculatedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16
  },
  calculatedTitle: {
    fontSize: 16,
    fontWeight: '600'
  },
  calculatedGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  calculatedItem: {
    alignItems: 'center',
    flex: 1
  },
  calculatedValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4
  },
  calculatedLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8
  },
  bmiCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  bmiCategoryText: {
    fontSize: 10,
    fontWeight: '600'
  },
  limitsCard: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12
  },
  limitsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16
  },
  limitsTitle: {
    fontSize: 16,
    fontWeight: '600'
  },
  limitsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12
  },
  limitItem: {
    alignItems: 'center',
    flex: 1
  },
  limitValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4
  },
  limitLabel: {
    fontSize: 11,
    textAlign: 'center'
  },
  limitsNote: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic'
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
  },
  cancelButton: {
    flex: 1
  },
  submitButton: {
    flex: 2
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8
  },
  privacyText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16
  }
});