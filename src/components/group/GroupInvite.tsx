import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Share,
  Alert,
  Clipboard
} from 'react-native';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useTheme } from '../../context/ThemeContext';
import { formatGroupCode } from '../../utils/groupUtils';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface GroupInviteProps {
  groupId: string;
  groupName: string;
  onClose?: () => void;
}

export function GroupInvite({ groupId, groupName, onClose }: GroupInviteProps) {
  const { colors, theme } = useTheme();
  const [copied, setCopied] = useState(false);

  const formattedCode = formatGroupCode(groupId);
  const inviteMessage = `Rejoins-moi sur Festival Tracker!\n\nGroupe: ${groupName}\nCode: ${formattedCode}\n\nInstalle l'app et utilise ce code pour rejoindre notre groupe!`;

  const handleCopyCode = async () => {
    try {
      await Clipboard.setString(formattedCode);
      setCopied(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de copier le code');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: inviteMessage,
        title: `Rejoins ${groupName} sur Festival Tracker`
      });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de partager le lien');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Inviter des amis
        </Text>
        <Text style={[styles.subtitle, { color: colors.textLight }]}>
          Partagez le code du groupe pour inviter vos amis
        </Text>
      </View>

      <Card style={styles.codeCard}>
        <View style={styles.codeContent}>
          <Text style={[styles.codeLabel, { color: colors.textLight }]}>
            Code du groupe
          </Text>
          <Text style={[styles.code, { color: colors.primary }]}>
            {formattedCode}
          </Text>
          <Text style={[styles.codeDescription, { color: colors.textLight }]}>
            Vos amis peuvent utiliser ce code pour rejoindre le groupe
          </Text>
        </View>
      </Card>

      <View style={styles.actions}>
        <Button
          title={copied ? 'Copié!' : 'Copier le code'}
          onPress={handleCopyCode}
          variant={copied ? 'success' : 'ghost'}
          icon={
            <Ionicons
              name={copied ? 'checkmark' : 'copy'}
              size={18}
              color={copied ? '#ffffff' : colors.primary}
            />
          }
          style={styles.actionButton}
        />

        <Button
          title="Partager"
          onPress={handleShare}
          variant="primary"
          icon={<Ionicons name="share" size={18} color="#ffffff" />}
          style={styles.actionButton}
        />
      </View>

      <View style={styles.instructions}>
        <Text style={[styles.instructionsTitle, { color: colors.text }]}>
          Comment inviter des amis:
        </Text>
        <View style={styles.instructionsList}>
          <View style={styles.instructionItem}>
            <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepText}>1</Text>
            </View>
            <Text style={[styles.instructionText, { color: colors.textLight }]}>
              Partagez le code du groupe avec vos amis
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepText}>2</Text>
            </View>
            <Text style={[styles.instructionText, { color: colors.textLight }]}>
              Ils ouvrent l'app et choisissent "Rejoindre un groupe"
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepText}>3</Text>
            </View>
            <Text style={[styles.instructionText, { color: colors.textLight }]}>
              Ils saisissent le code et rejoignent le groupe!
            </Text>
          </View>
        </View>
      </View>

      {onClose && (
        <Button
          title="Fermer"
          onPress={onClose}
          variant="ghost"
          style={styles.closeButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16
  },
  header: {
    alignItems: 'center',
    marginBottom: 24
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center'
  },
  codeCard: {
    marginBottom: 24
  },
  codeContent: {
    alignItems: 'center',
    paddingVertical: 16
  },
  codeLabel: {
    fontSize: 14,
    marginBottom: 8
  },
  code: {
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: 4,
    marginBottom: 8
  },
  codeDescription: {
    fontSize: 12,
    textAlign: 'center'
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24
  },
  actionButton: {
    flex: 1
  },
  instructions: {
    marginBottom: 24
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16
  },
  instructionsList: {
    gap: 12
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  stepText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },
  instructionText: {
    flex: 1,
    fontSize: 14
  },
  closeButton: {
    marginTop: 16
  }
});