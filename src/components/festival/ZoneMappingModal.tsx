import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { ZoneType, ZONE_CONFIGS } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

interface ZoneMappingModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (name: string, type: ZoneType, radius: number) => Promise<void>;
  currentPosition?: { latitude: number; longitude: number };
}

export function ZoneMappingModal({ 
  visible, 
  onClose, 
  onConfirm,
  currentPosition 
}: ZoneMappingModalProps) {
  const { colors, theme } = useTheme();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<ZoneType | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [radius, setRadius] = useState(50);
  const [isLoading, setIsLoading] = useState(false);

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  const handleConfirm = async () => {
    if (!selectedType || !zoneName.trim()) return;

    setIsLoading(true);
    try {
      await onConfirm(zoneName.trim(), selectedType, radius);
      resetModal();
      onClose();
    } catch (error) {
      console.error('Error creating zone:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setStep(1);
    setSelectedType(null);
    setZoneName('');
    setRadius(50);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const getPlaceholderName = () => {
    if (!selectedType) return '';
    
    switch (selectedType) {
      case 'stage': return 'ex: Scène principale, Scène électro...';
      case 'bar': return 'ex: Bar principal, Bar VIP...';
      case 'toilets': return 'ex: Toilettes Nord, Toilettes Sud...';
      case 'camping': return 'ex: Camping A, Zone tentes...';
      case 'hq': return 'ex: Le QG, Notre campement, Base du groupe...';
      case 'food': return 'ex: Food trucks, Restaurant...';
      case 'entrance': return 'ex: Entrée principale, Sortie Est...';
      case 'medical': return 'ex: Poste de secours principal...';
      case 'info': return 'ex: Point info, Accueil...';
      case 'charging': return 'ex: Station de recharge...';
      case 'custom': return 'ex: Spot chill, Point de RDV...';
      default: return '';
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title={step === 1 ? "Où êtes-vous ?" : `Détails - ${ZONE_CONFIGS[selectedType!].label}`}
      scrollable={true}
      size="large"
    >
      {step === 1 ? (
        <View style={styles.container}>
          <Text style={[styles.subtitle, { color: colors.textLight }]}>
            Sélectionnez le type de lieu
          </Text>

          <View style={styles.typeList}>
            {Object.entries(ZONE_CONFIGS).map(([type, config]) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeListItem,
                    {
                      backgroundColor: selectedType === type ? config.color + '20' : colors.surface,
                      borderColor: selectedType === type ? config.color : colors.border,
                      borderWidth: selectedType === type ? 2 : 1
                    }
                  ]}
                  onPress={() => {
                    setSelectedType(type as ZoneType);
                    setStep(2);
                  }}
                >
                  <View style={styles.typeItemLeft}>
                    <Text style={styles.typeItemEmoji}>{config.emoji}</Text>
                    <Text style={[
                      styles.typeItemLabel, 
                      { 
                        color: selectedType === type ? config.color : colors.text,
                        fontWeight: selectedType === type ? '600' : '400'
                      }
                    ]}>
                      {config.label}
                    </Text>
                  </View>
                  {selectedType === type && (
                    <Ionicons name="checkmark-circle" size={20} color={config.color} />
                  )}
                </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.container}>
          <View style={styles.detailsForm}>
            <Text style={[styles.label, { color: colors.text }]}>
              Nom du lieu
            </Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: colors.border
              }]}
              value={zoneName}
              onChangeText={setZoneName}
              placeholder={getPlaceholderName()}
              placeholderTextColor={colors.textLight}
              autoFocus
            />

            <Text style={[styles.label, { color: colors.text }]}>
              Rayon de la zone : {radius}m
            </Text>
            <View style={styles.sliderContainer}>
              <Text style={[styles.sliderLabel, { color: colors.textLight }]}>20m</Text>
              <Slider
                style={styles.slider}
                minimumValue={20}
                maximumValue={200}
                value={radius}
                onValueChange={(value) => setRadius(Math.round(value))}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.primary}
              />
              <Text style={[styles.sliderLabel, { color: colors.textLight }]}>200m</Text>
            </View>

            <View style={[styles.infoBox, { backgroundColor: colors.info + '20' }]}>
              <Ionicons name="information-circle" size={20} color={colors.info} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Plus le rayon est grand, plus la zone sera facile à détecter
              </Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title="Retour"
              onPress={handleBack}
              variant="ghost"
              fullWidth
              disabled={isLoading}
            />
            <Button
              title={isLoading ? "Création..." : "Valider"}
              onPress={handleConfirm}
              variant="primary"
              fullWidth
              disabled={!zoneName.trim() || isLoading}
              style={{ marginTop: theme.spacing.sm }}
              icon={isLoading ? <ActivityIndicator size="small" color="#ffffff" /> : undefined}
            />
          </View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center'
  },
  typeList: {
    marginBottom: 24
  },
  typeListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8
  },
  typeItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  typeItemEmoji: {
    fontSize: 24,
    marginRight: 12,
    width: 32,
    textAlign: 'center'
  },
  typeItemLabel: {
    fontSize: 16,
    flex: 1
  },
  detailsForm: {
    flex: 1
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 8
  },
  sliderLabel: {
    fontSize: 12,
    minWidth: 35
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20
  },
  buttonContainer: {
    paddingTop: 24,
    paddingBottom: 8
  }
});