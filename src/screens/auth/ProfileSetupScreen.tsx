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
import { Avatar } from '../../components/ui/Avatar';
import { useTheme } from '../../context/ThemeContext';
import { useAuthContext } from '../../context/AuthContext';
import { validateUserName } from '../../utils/validation';
import { AVATAR_OPTIONS } from '../../utils/constants';
import { AvatarData } from '../../utils/iconMappings';
import { Ionicons } from '@expo/vector-icons';
import imageService from '../../services/imageService';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

interface ProfileSetupScreenProps {
  navigation: any;
}

export function ProfileSetupScreen({ navigation }: ProfileSetupScreenProps) {
  const { colors, theme } = useTheme();
  const { user, createUserProfile } = useAuthContext();
  const [formData, setFormData] = useState({
    name: '',
    avatarData: AVATAR_OPTIONS[0],
    gender: 'male' as 'male' | 'female',
    age: '25',
    height: '175',
    weight: '70',
    activityLevel: 'moderate' as 'sedentary' | 'light' | 'moderate' | 'active'
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [tempPhotoUri, setTempPhotoUri] = useState<string | null>(null);

  const handlePhotoSelection = async (source: 'camera' | 'gallery') => {
    console.log('ProfileSetup - Photo button clicked:', source);
    try {
      setIsUploadingPhoto(true);
      console.log('ProfileSetup - Starting photo selection...');
      
      const uri = source === 'camera' 
        ? await imageService.takePhoto()
        : await imageService.pickImageFromGallery();
      
      console.log('ProfileSetup - Photo selection result:', uri);
      
      if (uri) {
        console.log('ProfileSetup - Photo selected:', uri);
        setTempPhotoUri(uri);
        const newAvatarData = { type: 'photo' as const, value: uri };
        
        setFormData(prev => {
          const updated = { 
            ...prev, 
            avatarData: newAvatarData
          };
          console.log('ProfileSetup - FormData updated:', updated);
          return updated;
        });
        
        console.log('ProfileSetup - New avatarData set:', newAvatarData);
      } else {
        console.log('ProfileSetup - No photo URI received');
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner la photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    const nameValidation = validateUserName(formData.name);
    if (!nameValidation.isValid) {
      setError(nameValidation.error!);
      return;
    }

    const ageNum = parseInt(formData.age);
    const heightNum = parseInt(formData.height);
    const weightNum = parseInt(formData.weight);
    
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
      setError('L\'âge doit être entre 18 et 100 ans');
      return;
    }
    
    if (isNaN(heightNum) || heightNum < 140 || heightNum > 220) {
      setError('La taille doit être entre 140 et 220 cm');
      return;
    }
    
    if (isNaN(weightNum) || weightNum < 30 || weightNum > 200) {
      setError('Le poids doit être entre 30 et 200 kg');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      let avatarString = '';
      
      if (formData.avatarData.type === 'photo' && tempPhotoUri) {
        // Upload la photo vers Firebase Storage
        const photoUrl = await imageService.uploadAvatar(user?.id || '', tempPhotoUri);
        if (photoUrl) {
          avatarString = imageService.createPhotoAvatarString(photoUrl);
        } else {
          setError('Impossible de télécharger la photo');
          return;
        }
      } else if (formData.avatarData.type === 'icon') {
        avatarString = `icon:${formData.avatarData.value}:${formData.avatarData.color}`;
      } else {
        avatarString = formData.avatarData.value;
      }

      const newUser = await createUserProfile(
        formData.name.trim(),
        avatarString,
        formData.gender,
        weightNum,
        ageNum,
        heightNum,
        formData.activityLevel
      );

      if (newUser) {
        // Laisser AppNavigator gérer automatiquement la navigation
        // vers WelcomeScreen (choix de groupe) puisque user.profile existe maintenant
      } else {
        setError('Impossible de créer le profil');
      }
    } catch (error) {
      console.error('Error creating profile:', error);
      setError('Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderAvatarGrid = () => (
    <View style={styles.avatarGrid}>
      {AVATAR_OPTIONS.map((avatarOption, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => setFormData(prev => ({ ...prev, avatarData: avatarOption }))}
          style={[
            styles.avatarOption,
            {
              backgroundColor: avatarOption.type === 'icon' ? avatarOption.color : colors.surface,
              borderColor: colors.border
            },
            formData.avatarData === avatarOption && {
              borderColor: colors.primary,
              borderWidth: 2
            }
          ]}
        >
          {avatarOption.type === 'icon' ? (
            <Ionicons name={avatarOption.value as any} size={24} color="#ffffff" />
          ) : (
            <Text style={styles.avatarEmoji}>{avatarOption.value}</Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.formCard}>
          <View style={styles.header}>
            <Avatar
              avatarData={formData.avatarData}
              name={formData.name}
              size="xlarge"
            />
            <Text style={[styles.title, { color: colors.text }]}>
              Créer votre profil
            </Text>
            <Text style={[styles.subtitle, { color: colors.textLight }]}>
              Choisissez votre nom et avatar pour commencer
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Votre nom"
              value={formData.name}
              onChangeText={(text) => {
                setFormData(prev => ({ ...prev, name: text }));
                setError('');
              }}
              placeholder="Entrez votre nom"
              error={error}
              icon="person"
              maxLength={30}
            />

            <View style={styles.genderSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Sexe
              </Text>
              <View style={styles.genderButtons}>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    formData.gender === 'male' && { backgroundColor: colors.primary },
                    { borderColor: formData.gender === 'male' ? colors.primary : colors.border }
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, gender: 'male' }))}
                >
                  <Ionicons 
                    name="male" 
                    size={20} 
                    color={formData.gender === 'male' ? '#ffffff' : colors.text} 
                  />
                  <Text style={[
                    styles.genderText,
                    { color: formData.gender === 'male' ? '#ffffff' : colors.text }
                  ]}>
                    Homme
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    formData.gender === 'female' && { backgroundColor: colors.primary },
                    { borderColor: formData.gender === 'female' ? colors.primary : colors.border }
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, gender: 'female' }))}
                >
                  <Ionicons 
                    name="female" 
                    size={20} 
                    color={formData.gender === 'female' ? '#ffffff' : colors.text} 
                  />
                  <Text style={[
                    styles.genderText,
                    { color: formData.gender === 'female' ? '#ffffff' : colors.text }
                  ]}>
                    Femme
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Input
              label="Âge *"
              value={formData.age}
              onChangeText={(text) => {
                setFormData(prev => ({ ...prev, age: text }));
                setError('');
              }}
              placeholder="25"
              keyboardType="numeric"
              icon="person"
              maxLength={3}
            />

            <Input
              label="Taille (cm) *"
              value={formData.height}
              onChangeText={(text) => {
                setFormData(prev => ({ ...prev, height: text }));
                setError('');
              }}
              placeholder="175"
              keyboardType="numeric"
              icon="resize"
              maxLength={3}
            />

            <Input
              label="Poids (kg) *"
              value={formData.weight}
              onChangeText={(text) => {
                setFormData(prev => ({ ...prev, weight: text }));
                setError('');
              }}
              placeholder="70"
              keyboardType="numeric"
              icon="fitness"
              maxLength={3}
            />

            {/* Niveau d'activité */}
            <View style={styles.activitySection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Niveau d'activité physique
              </Text>
              <View style={styles.activityGrid}>
                {[
                  { value: 'sedentary', label: 'Sédentaire', icon: 'desktop', desc: 'Peu d\'exercice' },
                  { value: 'light', label: 'Légère', icon: 'walk', desc: '1-3x/semaine' },
                  { value: 'moderate', label: 'Modérée', icon: 'bicycle', desc: '3-5x/semaine' },
                  { value: 'active', label: 'Active', icon: 'fitness', desc: '6-7x/semaine' }
                ].map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.activityOption,
                      {
                        backgroundColor: formData.activityLevel === option.value ? colors.primary : colors.surface,
                        borderColor: formData.activityLevel === option.value ? colors.primary : colors.border
                      }
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, activityLevel: option.value as any }))}
                  >
                    <Ionicons 
                      name={option.icon as any} 
                      size={20} 
                      color={formData.activityLevel === option.value ? '#ffffff' : colors.text} 
                    />
                    <Text style={[
                      styles.activityOptionLabel,
                      { color: formData.activityLevel === option.value ? '#ffffff' : colors.text }
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={[
                      styles.activityOptionDesc,
                      { color: formData.activityLevel === option.value ? '#ffffff' : colors.textLight }
                    ]}>
                      {option.desc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sélecteur de photo */}
            <View style={styles.photoSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Photo de profil
              </Text>
              <View style={styles.photoButtons}>
                <TouchableOpacity
                  style={[styles.photoButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => handlePhotoSelection('camera')}
                  disabled={isUploadingPhoto}
                >
                  <Ionicons name="camera" size={24} color={colors.primary} />
                  <Text style={[styles.photoButtonText, { color: colors.text }]}>Selfie</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.photoButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => handlePhotoSelection('gallery')}
                  disabled={isUploadingPhoto}
                >
                  <Ionicons name="images" size={24} color={colors.primary} />
                  <Text style={[styles.photoButtonText, { color: colors.text }]}>Galerie</Text>
                </TouchableOpacity>
              </View>
              {isUploadingPhoto && <LoadingSpinner text="Chargement..." />}
            </View>

            <Text style={[styles.orText, { color: colors.textLight }]}>Ou choisissez une icône</Text>

            <View style={styles.avatarSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Icônes
              </Text>
              {renderAvatarGrid()}
            </View>
          </View>

          <Button
            title="Créer mon profil"
            onPress={handleSave}
            isLoading={isSubmitting}
            fullWidth
            size="large"
          />
        </Card>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textLight }]}>
            Vous pourrez modifier ces informations plus tard dans les paramètres
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
  formCard: {
    marginBottom: 32
  },
  header: {
    alignItems: 'center',
    marginBottom: 32
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 16,
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
  avatarSection: {
    marginTop: 24
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  avatarOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  avatarEmoji: {
    fontSize: 24
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
  },
  genderSection: {
    marginTop: 24,
    marginBottom: 16
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 12
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2
  },
  genderText: {
    fontSize: 16,
    fontWeight: '500'
  },
  photoSection: {
    marginTop: 24,
    marginBottom: 16
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '500'
  },
  orText: {
    textAlign: 'center',
    fontSize: 14,
    marginVertical: 16,
    fontStyle: 'italic'
  },
  activitySection: {
    marginTop: 24,
    marginBottom: 16
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  activityOption: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    marginBottom: 8
  },
  activityOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4
  },
  activityOptionDesc: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center'
  }
});