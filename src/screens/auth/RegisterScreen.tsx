import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useTheme } from '../../context/ThemeContext';
import { useAuthContext } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import authService from '../../services/authService';

interface RegisterScreenProps {
  navigation: any;
  onLogin: () => void;
}

export function RegisterScreen({ navigation, onLogin }: RegisterScreenProps) {
  const { colors, theme } = useTheme();
  const { register, isLoading } = useAuthContext();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'checking' | 'available' | 'taken' | 'unknown' | ''>('');
  const emailCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    // Au moins 8 caractères, une majuscule, une minuscule, un chiffre
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  };

  // Vérifier la disponibilité de l'email avec debounce
  useEffect(() => {
    if (emailCheckTimeout.current) {
      clearTimeout(emailCheckTimeout.current);
    }

    if (formData.email && validateEmail(formData.email)) {
      setEmailStatus('checking');
      
      emailCheckTimeout.current = setTimeout(async () => {
        try {
          const exists = await authService.checkEmailExists(formData.email);
          setEmailStatus(exists ? 'taken' : 'available');
        } catch (error) {
          setEmailStatus('');
        }
      }, 500); // Attendre 500ms après la dernière frappe
    } else {
      setEmailStatus('');
    }

    return () => {
      if (emailCheckTimeout.current) {
        clearTimeout(emailCheckTimeout.current);
      }
    };
  }, [formData.email]);

  const handleRegister = async () => {
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

    if (!validatePassword(formData.password)) {
      setError('Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (!acceptedTerms) {
      setError('Vous devez accepter les conditions d\'utilisation');
      return;
    }

    try {
      const user = await register(formData.email.trim(), formData.password);
      // Après inscription réussie, l'AuthNavigator devrait automatiquement
      // rediriger vers ProfileSetup grâce à la condition initialRouteName
      // Pas besoin de navigation manuelle
    } catch (error: any) {
      console.error('Register error:', error);
      
      // Gestion des erreurs Firebase
      if (error.code === 'auth/email-already-in-use') {
        setError('Cette adresse email est déjà utilisée');
        setEmailStatus('taken'); // Mettre à jour le statut si l'email est prise
      } else if (error.code === 'auth/invalid-email') {
        setError('Format d\'email invalide');
      } else if (error.code === 'auth/weak-password') {
        setError('Le mot de passe est trop faible');
      } else if (error.code === 'auth/operation-not-allowed') {
        setError('L\'inscription par email n\'est pas activée');
      } else {
        setError('Erreur lors de l\'inscription. Réessayez plus tard');
      }
    }
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { text: '', color: colors.textLight };
    if (password.length < 6) return { text: 'Trop court', color: colors.danger };
    if (password.length < 8) return { text: 'Faible', color: colors.warning };
    if (!validatePassword(password)) return { text: 'Moyen', color: colors.warning };
    return { text: 'Fort', color: colors.success };
  };

  const passwordStrength = getPasswordStrength(formData.password);

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
          
          <Text style={styles.emoji}>🚀</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            Créer un compte
          </Text>
          <Text style={[styles.subtitle, { color: colors.textLight }]}>
            Rejoignez Festival Tracker
          </Text>
        </View>

        <Card style={styles.formCard}>
          <View style={styles.form}>
            <View style={styles.emailInputWrapper}>
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
                error={emailStatus === 'taken' ? 'Cette adresse email est déjà utilisée' : 
                       error && error.includes('email') ? error : ''}
              />
              {emailStatus && formData.email && (
                <View style={[styles.emailStatus, { position: 'absolute', right: 16, top: 35 }]}>
                  {emailStatus === 'checking' && (
                    <ActivityIndicator size="small" color={colors.primary} />
                  )}
                  {emailStatus === 'available' && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  )}
                  {emailStatus === 'taken' && (
                    <Ionicons name="close-circle" size={20} color={colors.danger} />
                  )}
                </View>
              )}
            </View>

            <View>
              <Input
                label="Mot de passe"
                value={formData.password}
                onChangeText={(text) => {
                  setFormData(prev => ({ ...prev, password: text }));
                  setError('');
                }}
                placeholder="Choisissez un mot de passe"
                secureTextEntry
                icon="lock-closed"
                error={error && error.includes('mot de passe') && !error.includes('correspondent') ? error : ''}
              />
              {formData.password.length > 0 && (
                <View style={styles.passwordStrength}>
                  <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                    Force: {passwordStrength.text}
                  </Text>
                </View>
              )}
            </View>

            <Input
              label="Confirmer le mot de passe"
              value={formData.confirmPassword}
              onChangeText={(text) => {
                setFormData(prev => ({ ...prev, confirmPassword: text }));
                setError('');
              }}
              placeholder="Confirmez votre mot de passe"
              secureTextEntry
              icon="lock-closed"
              error={error && error.includes('correspondent') ? error : ''}
            />

            {/* Conditions d'utilisation */}
            <TouchableOpacity
              style={styles.termsContainer}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
            >
              <View style={[
                styles.checkbox,
                { borderColor: colors.border },
                acceptedTerms && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}>
                {acceptedTerms && (
                  <Ionicons name="checkmark" size={16} color="#ffffff" />
                )}
              </View>
              <Text style={[styles.termsText, { color: colors.text }]}>
                J'accepte les{' '}
                <Text style={[styles.termsLink, { color: colors.primary }]}>
                  conditions d'utilisation
                </Text>
                {' '}et la{' '}
                <Text style={[styles.termsLink, { color: colors.primary }]}>
                  politique de confidentialité
                </Text>
              </Text>
            </TouchableOpacity>

            {error && !error.includes('email') && !error.includes('mot de passe') && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.danger }]}>
                  {error}
                </Text>
              </View>
            )}
          </View>

          <Button
            title="Créer mon compte"
            onPress={handleRegister}
            isLoading={isLoading}
            disabled={emailStatus === 'taken' || emailStatus === 'checking'}
            fullWidth
            size="large"
            icon={<Ionicons name="person-add" size={20} color="#ffffff" />}
          />
        </Card>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textLight }]}>
            Vous avez déjà un compte ?
          </Text>
          <TouchableOpacity onPress={onLogin}>
            <Text style={[styles.footerLink, { color: colors.primary }]}>
              Se connecter
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
  emailInputWrapper: {
    position: 'relative'
  },
  emailStatus: {
    position: 'absolute'
  },
  passwordStrength: {
    marginTop: 4,
    marginLeft: 16
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500'
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    gap: 12
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20
  },
  termsLink: {
    fontWeight: '500'
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
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