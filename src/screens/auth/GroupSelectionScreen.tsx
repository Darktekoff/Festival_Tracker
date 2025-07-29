import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { useTheme } from '../../context/ThemeContext';
import { useAuthContext } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { parseAvatarString } from '../../utils/iconMappings';

interface GroupSelectionScreenProps {
  navigation: any;
  onCreateGroup: () => void;
  onJoinGroup: () => void;
}

export function GroupSelectionScreen({ navigation, onCreateGroup, onJoinGroup }: GroupSelectionScreenProps) {
  const { colors, theme } = useTheme();
  const { user, signOut } = useAuthContext();

  const handleSignOut = async () => {
    try {
      await signOut();
      // La navigation sera gérée automatiquement par AppNavigator
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) return null;

  const avatarData = parseAvatarString(user.avatar);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header avec profil utilisateur */}
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <Avatar
              avatarData={avatarData}
              name={user.name}
              size="large"
            />
            <View style={styles.profileInfo}>
              <Text style={[styles.greeting, { color: colors.text }]}>
                Salut {user.name} ! 👋
              </Text>
              <Text style={[styles.subtitle, { color: colors.textLight }]}>
                Il est temps de créer un groupe ou d'en rejoindre un pour commencer à tracker avec tes amis !
              </Text>
            </View>
          </View>

          {/* Bouton déconnexion */}
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* Options de groupe */}
        <View style={styles.options}>
          <Card style={[styles.optionCard, { borderColor: colors.primary }]}>
            <View style={styles.optionHeader}>
              <View style={[styles.optionIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name="add" size={24} color="#ffffff" />
              </View>
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                Créer un nouveau groupe
              </Text>
            </View>
            <Text style={[styles.optionDescription, { color: colors.textLight }]}>
              Lance un nouveau groupe de festival et invite tes amis à te rejoindre
            </Text>
            <Button
              title="Créer un groupe"
              onPress={onCreateGroup}
              variant="primary"
              size="large"
              fullWidth
              icon={<Ionicons name="add" size={20} color="#ffffff" />}
              style={styles.optionButton}
            />
          </Card>

          <Card style={styles.optionCard}>
            <View style={styles.optionHeader}>
              <View style={[styles.optionIcon, { backgroundColor: colors.success }]}>
                <Ionicons name="enter" size={24} color="#ffffff" />
              </View>
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                Rejoindre un groupe
              </Text>
            </View>
            <Text style={[styles.optionDescription, { color: colors.textLight }]}>
              Utilise un code d'invitation pour rejoindre le groupe de tes amis
            </Text>
            <Button
              title="Rejoindre un groupe"
              onPress={onJoinGroup}
              variant="secondary"
              size="large"
              fullWidth
              icon={<Ionicons name="enter" size={20} color={colors.primary} />}
              style={styles.optionButton}
            />
          </Card>
        </View>

        {/* Informations supplémentaires */}
        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <Ionicons name="shield-checkmark" size={20} color={colors.success} />
            <Text style={[styles.infoText, { color: colors.textLight }]}>
              Tes données sont sécurisées et privées
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="people" size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textLight }]}>
              Partage en temps réel avec ton groupe
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="analytics" size={20} color={colors.warning} />
            <Text style={[styles.infoText, { color: colors.textLight }]}>
              Statistiques détaillées et conseils de sécurité
            </Text>
          </View>
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
    padding: 24
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 32
  },
  profileSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  profileInfo: {
    flex: 1
  },
  greeting: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24
  },
  signOutButton: {
    padding: 8,
    marginLeft: 16
  },
  options: {
    gap: 24,
    marginBottom: 32
  },
  optionCard: {
    padding: 24
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 16
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20
  },
  optionButton: {
    marginTop: 8
  },
  infoSection: {
    gap: 16,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  infoText: {
    fontSize: 14,
    flex: 1
  }
});