import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  ScrollView
} from 'react-native';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { useAuthContext } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export function WelcomeScreen({ onGetStarted, onSignIn }: WelcomeScreenProps) {
  const { colors, theme } = useTheme();
  const { user } = useAuthContext();

  const features = [
    {
      icon: 'people',
      title: 'Suivi en groupe',
      description: 'Suivez votre consommation avec vos amis en temps réel'
    },
    {
      icon: 'analytics',
      title: 'Statistiques détaillées',
      description: 'Analysez vos habitudes et restez dans les limites'
    },
    {
      icon: 'shield-checkmark',
      title: 'Alertes de sécurité',
      description: 'Recevez des alertes pour boire de façon responsable'
    },
    {
      icon: 'flash',
      title: 'Temps réel',
      description: 'Synchronisation instantanée avec votre groupe'
    }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.emoji}>🍻</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            Festival Tracker
          </Text>
          <Text style={[styles.subtitle, { color: colors.textLight }]}>
            Suivez votre consommation d'alcool en toute sécurité avec vos amis
          </Text>
        </View>

        <View style={styles.features}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name={feature.icon as any} size={24} color="#ffffff" />
              </View>
              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>
                  {feature.title}
                </Text>
                <Text style={[styles.featureDescription, { color: colors.textLight }]}>
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Button
            title={user ? "Créer un groupe" : "Commencer"}
            onPress={onGetStarted}
            variant="primary"
            size="large"
            fullWidth
            icon={user ? 
              <Ionicons name="add" size={20} color="#ffffff" /> : 
              <Ionicons name="rocket" size={20} color="#ffffff" />
            }
          />
          
          <Button
            title={user ? "Rejoindre un groupe" : "Se connecter"}
            onPress={onSignIn}
            variant="ghost"
            size="large"
            fullWidth
            icon={user ? 
              <Ionicons name="enter" size={20} color={colors.primary} /> :
              <Ionicons name="log-in" size={20} color={colors.primary} />
            }
            style={{ marginTop: theme.spacing.md }}
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textLight }]}>
            L'abus d'alcool est dangereux pour la santé.
          </Text>
          <Text style={[styles.footerText, { color: colors.textLight }]}>
            À consommer avec modération.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center'
  },
  header: {
    alignItems: 'center',
    marginBottom: 48
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24
  },
  features: {
    marginBottom: 48
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  featureContent: {
    flex: 1
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20
  },
  actions: {
    marginBottom: 32
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