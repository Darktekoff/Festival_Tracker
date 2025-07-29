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

interface ForgotPasswordScreenProps {
  navigation: any;
}

export function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  const { colors } = useTheme();
  const { resetPassword, isLoading } = useAuthContext();
  
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleResetPassword = async () => {
    setError('');
    setSuccess(false);

    if (!email.trim()) {
      setError('L\'adresse email est requise');
      return;
    }

    if (!validateEmail(email.trim())) {
      setError('Format d\'email invalide');
      return;
    }

    try {
      await resetPassword(email.trim());
      setSuccess(true);
    } catch (error: any) {
      console.error('Reset password error:', error);
      
      if (error.code === 'auth/user-not-found') {
        setError('Aucun compte trouvé avec cette adresse email');
      } else if (error.code === 'auth/invalid-email') {
        setError('Format d\'email invalide');
      } else {
        setError('Erreur lors de l\'envoi de l\'email. Réessayez plus tard');
      }
    }
  };

  if (success) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <Card style={styles.successCard}>
            <View style={styles.successHeader}>
              <View style={[styles.successIcon, { backgroundColor: colors.success }]}>
                <Ionicons name="checkmark" size={32} color="#ffffff" />
              </View>
              <Text style={[styles.successTitle, { color: colors.text }]}>
                Email envoyé !
              </Text>
              <Text style={[styles.successMessage, { color: colors.textLight }]}>
                Un email de réinitialisation a été envoyé à{' '}
                <Text style={{ fontWeight: '600' }}>{email}</Text>
              </Text>
              <Text style={[styles.successInstructions, { color: colors.textLight }]}>
                Vérifiez votre boîte de réception et suivez les instructions pour réinitialiser votre mot de passe.
              </Text>
            </View>
            
            <View style={styles.successActions}>
              <Button
                title="Retour à la connexion"
                onPress={() => navigation.navigate('Login')}
                variant="primary"
                fullWidth
                icon={<Ionicons name="arrow-back" size={20} color="#ffffff" />}
              />
              
              <TouchableOpacity
                style={styles.resendButton}
                onPress={() => setSuccess(false)}
              >
                <Text style={[styles.resendText, { color: colors.primary }]}>
                  Renvoyer l'email
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

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
          
          <Text style={styles.emoji}>🔑</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            Mot de passe oublié
          </Text>
          <Text style={[styles.subtitle, { color: colors.textLight }]}>
            Entrez votre adresse email pour recevoir un lien de réinitialisation
          </Text>
        </View>

        <Card style={styles.formCard}>
          <View style={styles.form}>
            <Input
              label="Adresse email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError('');
              }}
              placeholder="votre@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              icon="mail"
              error={error}
            />

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.danger }]}>
                  {error}
                </Text>
              </View>
            )}
          </View>

          <Button
            title="Envoyer le lien"
            onPress={handleResetPassword}
            isLoading={isLoading}
            fullWidth
            size="large"
            icon={<Ionicons name="send" size={20} color="#ffffff" />}
          />
        </Card>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textLight }]}>
            Vous vous souvenez de votre mot de passe ?
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
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
  },
  successCard: {
    alignItems: 'center'
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 32
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center'
  },
  successMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16
  },
  successInstructions: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20
  },
  successActions: {
    width: '100%',
    gap: 16
  },
  resendButton: {
    alignSelf: 'center'
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600'
  }
});