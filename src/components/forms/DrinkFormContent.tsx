import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrinkTemplate, DrinkFormData, DrinkRecord } from '../../types';
import { DrinkTypeSelector } from '../drink/DrinkTypeSelector';
import { DrinkDetailsForm } from '../drink/DrinkDetailsForm';
import { QuickAddButtons } from '../drink/QuickAddButtons';
import { useTheme } from '../../context/ThemeContext';
import { useAuthContext } from '../../context/AuthContext';
import { useDrinks } from '../../hooks/useDrinks';
import { useGroupContext } from '../../context/GroupContext';
import { Ionicons } from '@expo/vector-icons';

interface DrinkFormContentProps {
  onClose: () => void;
  onSubmit: (data: DrinkFormData, shouldConsume?: boolean) => Promise<void>;
  onConsumeTemplate: (template: DrinkRecord) => Promise<DrinkRecord | null>;
  isLoading?: boolean;
}

export function DrinkFormContent({ onClose, onSubmit, onConsumeTemplate, isLoading }: DrinkFormContentProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthContext();
  const { group } = useGroupContext();
  const { drinks, refresh } = useDrinks(group?.id || null);
  const [selectedTemplate, setSelectedTemplate] = useState<DrinkTemplate | null>(null);
  const [step, setStep] = useState<'quick' | 'select' | 'details'>('quick');
  const [refreshKey, setRefreshKey] = useState(0);

  // Surveiller les changements dans drinks pour forcer la mise à jour
  useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, [drinks.length]); // Se déclenche quand une nouvelle boisson est ajoutée

  // Forcer un refresh quand on revient à l'étape 'quick'
  useEffect(() => {
    if (step === 'quick') {
      setRefreshKey(prev => prev + 1);
    }
  }, [step]);

  // Mémoriser toutes les boissons de l'utilisateur (y compris templates pour les favoris, mais exclure les triches)
  const userAllDrinks = useMemo(() => {
    return drinks.filter(drink => drink.userId === user?.id && drink.drinkType !== 'Triche');
  }, [drinks, user?.id, refreshKey]);

  const handleQuickAdd = async (drink: DrinkRecord) => {
    if (drink.isTemplate) {
      // Si c'est un template, utiliser la fonction dédiée
      await onConsumeTemplate(drink);
      onClose(); // Fermer l'écran après consommation
    } else {
      // Si c'est une boisson prédéfinie, utiliser l'ancienne méthode
      const formData: DrinkFormData = {
        category: drink.category,
        drinkType: drink.drinkType,
        volume: drink.volume,
        alcoholDegree: drink.alcoholDegree,
        customName: drink.customName,
        brand: drink.brand
      };
      onSubmit(formData, true); // Les boutons prédéfinis ajoutent toujours la consommation
    }
  };

  const handleTemplateSelect = (template: DrinkTemplate) => {
    setSelectedTemplate(template);
    setStep('details');
  };

  const handleFormSubmit = async (data: DrinkFormData) => {
    try {
      // Les boissons créées depuis le formulaire détaillé sont toujours des templates
      await onSubmit(data, false);
      
      // Attendre un petit moment pour que la boisson soit sauvegardée
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Faire le refresh avant de revenir à quick
      await refresh();
      
      // Forcer le re-calcul et retour à quick
      setRefreshKey(prev => prev + 1);
      setStep('quick');
      
      // Double sécurité : un autre refresh après 500ms
      setTimeout(async () => {
        await refresh();
        setRefreshKey(prev => prev + 1);
      }, 500);
    } catch (error) {
      console.error('Error in handleFormSubmit:', error);
    }
  };

  const handleBack = () => {
    if (step === 'details') {
      setStep('select');
    } else if (step === 'select') {
      setStep('quick');
    } else {
      onClose();
    }
  };

  const getTitle = () => {
    switch (step) {
      case 'quick':
        return 'Ajouter une boisson';
      case 'select':
        return 'Choisir le type';
      case 'details':
        return 'Détails de la boisson';
      default:
        return 'Ajouter une boisson';
    }
  };

  const getGradientColors = () => {
    switch (step) {
      case 'quick':
        return [colors.primary + '15', colors.secondary + '10'];
      case 'select':
        return [colors.success + '15', colors.primary + '10'];
      case 'details':
        return [colors.warning + '15', colors.success + '10'];
      default:
        return [colors.primary + '15', colors.secondary + '10'];
    }
  };

  const getHeaderIcon = () => {
    switch (step) {
      case 'quick':
        return 'flash';
      case 'select':
        return 'grid';
      case 'details':
        return 'create';
      default:
        return 'wine';
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'quick':
        return (
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <QuickAddButtons
              userDrinks={userAllDrinks}
              onQuickAdd={handleQuickAdd}
              isLoading={isLoading}
            />
            
            <TouchableOpacity
              style={[styles.customButton, { borderColor: colors.border }]}
              onPress={() => setStep('select')}
            >
              <Ionicons name="settings-outline" size={24} color={colors.primary} />
              <Text style={[styles.customButtonText, { color: colors.primary }]}>
                Personnaliser
              </Text>
            </TouchableOpacity>
          </ScrollView>
        );
      
      case 'select':
        return (
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <DrinkTypeSelector
              onSelect={handleTemplateSelect}
            />
          </ScrollView>
        );
      
      case 'details':
        return selectedTemplate ? (
          <View style={styles.content}>
            <DrinkDetailsForm
              template={selectedTemplate}
              onSubmit={handleFormSubmit}
              onCancel={() => setStep('select')}
              isLoading={isLoading}
            />
          </View>
        ) : null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Modern Header with Gradient */}
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.modernHeader, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleBack} style={styles.modernBackButton}>
            <View style={[styles.backButtonCircle, { backgroundColor: colors.surface }]}>
              <Ionicons 
                name={step === 'quick' ? 'close' : 'arrow-back'} 
                size={20} 
                color={colors.text} 
              />
            </View>
          </TouchableOpacity>
          
          <View style={styles.titleSection}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
              <Ionicons name={getHeaderIcon() as any} size={24} color="#ffffff" />
            </View>
            <Text style={[styles.modernTitle, { color: colors.text }]}>
              {getTitle()}
            </Text>
            <View style={styles.stepIndicator}>
              <Text style={[styles.stepText, { color: colors.textLight }]}>
                Étape {step === 'quick' ? '1' : step === 'select' ? '2' : '3'}/3
              </Text>
            </View>
          </View>
          
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      {/* Content */}
      <View style={{ flex: 1, paddingBottom: insets.bottom }}>
        {renderContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  modernHeader: {
    paddingHorizontal: 20,
    paddingVertical: 24
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  modernBackButton: {
    padding: 4
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  titleSection: {
    flex: 1,
    alignItems: 'center',
    gap: 8
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4
  },
  modernTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5
  },
  stepIndicator: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  stepText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  placeholder: {
    width: 48
  },
  content: {
    flex: 1,
    padding: 16
  },
  scrollContent: {
    flex: 1,
    padding: 16
  },
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 16
  },
  customButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8
  }
});