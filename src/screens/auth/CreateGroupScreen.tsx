import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Alert
} from 'react-native';
import { GroupForm } from '../../components/forms/GroupForm';
import { useTheme } from '../../context/ThemeContext';
import { useGroupContext } from '../../context/GroupContext';

interface CreateGroupScreenProps {
  navigation: any;
}

export function CreateGroupScreen({ navigation }: CreateGroupScreenProps) {
  const { colors } = useTheme();
  const { createGroup, isLoading } = useGroupContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: {
    name: string;
    description: string;
    festivalDates: { start: Date; end: Date };
    maxMembers: number;
  }) => {
    try {
      setIsSubmitting(true);
      console.log('Creating group with data:', data);
      
      const group = await createGroup(
        data.name,
        data.description,
        data.festivalDates,
        data.maxMembers
      );

      console.log('Group creation result:', group);

      if (group) {
        Alert.alert(
          'Groupe créé!',
          `Votre groupe "${group.name}" a été créé avec succès. Code: ${group.id}`,
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Main')
            }
          ]
        );
      } else {
        console.log('Group creation failed - no group returned');
        Alert.alert(
          'Erreur',
          'Impossible de créer le groupe. Veuillez réessayer.'
        );
      }
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert(
        'Erreur',
        'Une erreur est survenue lors de la création du groupe.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <GroupForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading || isSubmitting}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});