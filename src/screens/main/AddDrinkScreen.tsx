import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert
} from 'react-native';
import { DrinkForm } from '../../components/forms/DrinkForm';
import { DrinkFormContent } from '../../components/forms/DrinkFormContent';
import { useTheme } from '../../context/ThemeContext';
import { useGroupContext } from '../../context/GroupContext';
import { useDrinks } from '../../hooks/useDrinks';
import { DrinkFormData } from '../../types';
import { Toast } from '../../components/ui/Toast';
import { eventBus, EVENTS } from '../../utils/eventBus';

interface AddDrinkScreenProps {
  navigation: any;
}

export function AddDrinkScreen({ navigation }: AddDrinkScreenProps) {
  const { colors } = useTheme();
  const { group } = useGroupContext();
  const { addDrink, isAddingDrink, refresh } = useDrinks(group?.id || null);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    visible: false,
    message: '',
    type: 'success'
  });

  const handleSubmit = async (data: DrinkFormData, shouldConsume: boolean = true) => {
    if (!group) {
      Alert.alert('Erreur', 'Aucun groupe sélectionné');
      return;
    }

    try {
      // Ajouter le flag isTemplate si ce n'est pas pour consommer
      const drinkData = { ...data, isTemplate: !shouldConsume };
      const drink = await addDrink(drinkData);
      
      if (drink) {
        const message = shouldConsume 
          ? 'Boisson ajoutée avec succès!'
          : 'Boisson créée et ajoutée aux favoris!';
          
        setToast({
          visible: true,
          message,
          type: 'success'
        });
        
        // Émettre un événement pour forcer le refresh seulement si c'est consommé
        if (shouldConsume) {
          eventBus.emit(EVENTS.DRINK_ADDED, drink);
          // Fermer l'écran après un court délai seulement si consommé
          setTimeout(() => {
            navigation.goBack();
          }, 300);
        } else {
          // Pour les templates, forcer un refresh immédiatement
          refresh();
        }
        // Si c'est un template, on reste sur l'écran et on retourne aux favoris
        // Le DrinkFormContent gèrera le retour au step 'quick'
      } else {
        setToast({
          visible: true,
          message: 'Erreur lors de l\'ajout de la boisson',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error adding drink:', error);
      setToast({
        visible: true,
        message: 'Une erreur est survenue',
        type: 'error'
      });
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DrinkFormContent
        onClose={handleClose}
        onSubmit={handleSubmit}
        isLoading={isAddingDrink}
      />
      
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});