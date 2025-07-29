import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useTheme } from '../../context/ThemeContext';
import { useAuthContext } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface LoginScreenProps {
  navigation: any;
  onRegister: () => void;
  onForgotPassword: () => void;
}

export function LoginScreen({ navigation, onRegister, onForgotPassword }: LoginScreenProps) {
  const { colors, theme } = useTheme();
  const { signIn, isLoading } = useAuthContext();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignIn = async () => {
    setError('');

    if (!formData.email.trim()) {
      setError('L\'adresse email est requise');
      return;
    }

    if (!validateEmail(formData.email.trim())) {
      setError('Format d\'email invalide');
      return;
    }

    if (!formData.password) {
      setError('Le mot de passe est requis');
      return;
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      console.log('🔐 LoginScreen: Tentative de connexion...');
      const user = await signIn(formData.email.trim(), formData.password);
      console.log('🔐 LoginScreen: Résultat connexion:', user ? { id: user.id, name: user.name, hasProfile: !!user.profile } : null);
      if (user) {
        // L'utilisateur est connecté, la navigation sera gérée par AppNavigator
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Gestion des erreurs Firebase
      if (error.code === 'auth/user-not-found') {
        setError('Aucun compte trouvé avec cette adresse email');
      } else if (error.code === 'auth/wrong-password') {
        setError('Mot de passe incorrect');
      } else if (error.code === 'auth/invalid-email') {
        setError('Format d\'email invalide');
      } else if (error.code === 'auth/user-disabled') {
        setError('Ce compte a été désactivé');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Trop de tentatives. Réessayez plus tard');
      } else {
        setError('Erreur de connexion. Vérifiez vos identifiants');
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header avec retour */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.emoji}>🔐</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            Connexion
          </Text>
          <Text style={[styles.subtitle, { color: colors.textLight }]}>
            Connectez-vous à votre compte
          </Text>
        </View>

        <Card style={styles.formCard}>
          <View style={styles.form}>
            <Input
              label="Adresse email"
              value={formData.email}
              onChangeText={(text) => {
                setFormData(prev => ({ ...prev, email: text }));
                setError('');
              }}
              placeholder="votre@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              icon="mail"
              error={error && error.includes('email') ? error : ''}
            />

            <Input
              label="Mot de passe"
              value={formData.password}
              onChangeText={(text) => {
                setFormData(prev => ({ ...prev, password: text }));
                setError('');
              }}
              placeholder="Votre mot de passe"
              secureTextEntry
              icon="lock-closed"
              error={error && error.includes('mot de passe') ? error : ''}
            />

            {error && !error.includes('email') && !error.includes('mot de passe') && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.danger }]}>
                  {error}
                </Text>
              </View>
            )}

            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={onForgotPassword}
            >
              <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
                Mot de passe oublié ?
              </Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Se connecter"
            onPress={handleSignIn}
            isLoading={isLoading}
            fullWidth
            size="large"
            icon={<Ionicons name="log-in" size={20} color="#ffffff" />}
          />
        </Card>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textLight }]}>
            Vous n'avez pas de compte ?
          </Text>
          <TouchableOpacity onPress={onRegister}>
            <Text style={[styles.footerLink, { color: colors.primary }]}>
              Créer un compte
            </Text>
          </TouchableOpacity>
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
    marginBottom: 32,
    position: 'relative'
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24
  },
  formCard: {
    marginBottom: 32
  },
  form: {
    marginBottom: 32
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    gap: 8
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500'
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 8
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500'
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8
  },
  footerText: {
    fontSize: 14
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600'
  }
});