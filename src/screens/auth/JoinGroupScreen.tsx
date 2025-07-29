import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert
} from 'react-native';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useTheme } from '../../context/ThemeContext';
import { useGroupContext } from '../../context/GroupContext';
import { validateGroupCode } from '../../utils/groupUtils';

interface JoinGroupScreenProps {
  navigation: any;
}

export function JoinGroupScreen({ navigation }: JoinGroupScreenProps) {
  const { colors, theme } = useTheme();
  const { joinGroup, isLoading } = useGroupContext();
  const [groupCode, setGroupCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJoinGroup = async () => {
    if (!groupCode.trim()) {
      setError('Veuillez saisir un code de groupe');
      return;
    }

    if (!validateGroupCode(groupCode)) {
      setError('Code de groupe invalide');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const group = await joinGroup(groupCode);

      if (group) {
        Alert.alert(
          'Groupe rejoint!',
          `Vous avez rejoint le groupe "${group.name}" avec succès!`,
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Main')
            }
          ]
        );
      } else {
        setError('Impossible de rejoindre le groupe');
      }
    } catch (error: any) {
      console.error('Error joining group:', error);
      
      if (error.message === 'GROUP_NOT_FOUND') {
        setError('Groupe introuvable. Vérifiez le code.');
      } else if (error.message === 'GROUP_FULL') {
        setError('Ce groupe est déjà complet.');
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Card style={styles.formCard}>
          <View style={styles.header}>
            <Text style={styles.emoji}>🎯</Text>
            <Text style={[styles.title, { color: colors.text }]}>
              Rejoindre un groupe
            </Text>
            <Text style={[styles.subtitle, { color: colors.textLight }]}>
              Saisissez le code du groupe pour le rejoindre
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Code du groupe"
              value={groupCode}
              onChangeText={(text) => {
                setGroupCode(text.toUpperCase());
                setError('');
              }}
              placeholder="ABC-DEF"
              error={error}
              icon="key"
              autoCapitalize="characters"
              maxLength={7}
            />

            <View style={styles.hint}>
              <Text style={[styles.hintText, { color: colors.textLight }]}>
                Le code du groupe est fourni par la personne qui l'a créé.
                Il est composé de 6 caractères au format ABC-DEF.
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              title="Annuler"
              onPress={handleCancel}
              variant="ghost"
              style={styles.actionButton}
            />
            <Button
              title="Rejoindre"
              onPress={handleJoinGroup}
              isLoading={isLoading || isSubmitting}
              style={styles.actionButton}
            />
          </View>
        </Card>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textLight }]}>
            Besoin d'aide ?
          </Text>
          <Text style={[styles.footerText, { color: colors.textLight }]}>
            Demandez le code du groupe à votre ami qui l'a créé
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center'
  },
  formCard: {
    marginBottom: 32
  },
  header: {
    alignItems: 'center',
    marginBottom: 32
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24
  },
  form: {
    marginBottom: 32
  },
  hint: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8
  },
  hintText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center'
  },
  actions: {
    flexDirection: 'row',
    gap: 12
  },
  actionButton: {
    flex: 1
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center'
  }
});