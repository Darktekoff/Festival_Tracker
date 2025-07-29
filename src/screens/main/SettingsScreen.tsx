import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  TouchableOpacity
} from 'react-native';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { MappingCard } from '../../components/cards/MappingCard';
import { useTheme } from '../../context/ThemeContext';
import { useAuthContext } from '../../context/AuthContext';
import { useGroupContext } from '../../context/GroupContext';
import drinkService from '../../services/drinkService';
import festivalMapService from '../../services/festivalMapService';
import { Ionicons } from '@expo/vector-icons';
import { AVATAR_OPTIONS } from '../../utils/constants';
import { Avatar } from '../../components/ui/Avatar';
import { AvatarData, convertEmojiToIcon, parseAvatarString } from '../../utils/iconMappings';
import imageService from '../../services/imageService';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { calculateAdvancedBMI } from '../../utils/calculations';
import { calculatePersonalizedLimits } from '../../utils/alcoholLimits';
import { FestivalZone } from '../../types';
import memberLocationService from '../../services/memberLocationService';

interface SettingsScreenProps {
  navigation: any;
}

export function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { colors, themeMode, setThemeMode, isDark } = useTheme();
  const { user, updateUserProfile } = useAuthContext();
  const { group, leaveGroup } = useGroupContext();
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [selectedAvatarData, setSelectedAvatarData] = useState<AvatarData>(() => {
    return user?.avatar ? parseAvatarString(user.avatar) : AVATAR_OPTIONS[0];
  });
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>(user?.profile?.gender || 'male');
  const [age, setAge] = useState(user?.profile?.age?.toString() || '');
  const [height, setHeight] = useState(user?.profile?.height?.toString() || '');
  const [weight, setWeight] = useState(user?.profile?.weight?.toString() || '');
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'light' | 'moderate' | 'active'>(
    user?.profile?.activityLevel || 'moderate'
  );
  const [notifications, setNotifications] = useState(user?.preferences?.notifications ?? true);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [zones, setZones] = useState<FestivalZone[]>([]);
  const [tempPhotoUri, setTempPhotoUri] = useState<string | null>(null);
  const [locationSharingEnabled, setLocationSharingEnabled] = useState(false);

  useEffect(() => {
    if (group?.id) {
      festivalMapService.setGroupId(group.id);
      const unsubscribe = festivalMapService.onZonesUpdate((updatedZones) => {
        setZones(updatedZones);
      });
      
      // Charger les zones initiales
      festivalMapService.getZones().then(setZones);

      // Initialiser le service de localisation et charger la préférence
      memberLocationService.initialize(group.id);
      memberLocationService.getSharingPreference().then(setLocationSharingEnabled);

      return unsubscribe;
    }
  }, [group?.id]);

  // Fonction utilitaire pour la couleur de l'IMC
  const getBMIColor = (category: string) => {
    switch (category) {
      case 'underweight': return colors.info;
      case 'normal': return colors.success;
      case 'overweight': return colors.warning;
      case 'obese': return colors.danger;
      default: return colors.success;
    }
  };

  const handleSaveProfile = async () => {
    // DEBUG: État des variables au début de la sauvegarde
    console.log('=== DEBUT SAUVEGARDE ===');
    console.log('SettingsScreen - selectedAvatarData:', JSON.stringify(selectedAvatarData, null, 2));
    console.log('SettingsScreen - tempPhotoUri:', tempPhotoUri);
    console.log('SettingsScreen - profileName:', profileName);
    console.log('SettingsScreen - selectedGender:', selectedGender);
    console.log('SettingsScreen - weight:', weight);
    
    if (!profileName.trim()) {
      Alert.alert('Erreur', 'Le nom ne peut pas être vide');
      return;
    }

    const ageNum = parseInt(age);
    const heightNum = parseInt(height);
    const weightNum = parseFloat(weight);
    
    if (!age || isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
      Alert.alert('Erreur', 'L\'âge doit être entre 18 et 100 ans');
      return;
    }
    
    if (!height || isNaN(heightNum) || heightNum < 140 || heightNum > 220) {
      Alert.alert('Erreur', 'La taille doit être entre 140 et 220 cm');
      return;
    }
    
    if (!weight || isNaN(weightNum) || weightNum < 30 || weightNum > 200) {
      Alert.alert('Erreur', 'Le poids doit être entre 30 et 200 kg');
      return;
    }

    try {
      setIsLoading(true);
      let avatarString = '';
      
      // DEBUG: Vérification de la condition photo
      console.log('SettingsScreen - Checking photo condition:');
      console.log('  selectedAvatarData.type:', selectedAvatarData?.type);
      console.log('  tempPhotoUri exists:', !!tempPhotoUri);
      console.log('  Condition result:', selectedAvatarData.type === 'photo' && tempPhotoUri);
      
      if (selectedAvatarData.type === 'photo' && tempPhotoUri) {
        // Upload la nouvelle photo
        console.log('SettingsScreen - Starting photo upload:', tempPhotoUri);
        const photoUrl = await imageService.uploadAvatar(user?.id || '', tempPhotoUri);
        console.log('SettingsScreen - Upload result:', photoUrl);
        
        if (photoUrl) {
          // Supprimer l'ancienne photo si elle existe
          if (user?.avatar && user.avatar.startsWith('photo:')) {
            const oldPhotoUrl = imageService.extractPhotoUrl(user.avatar);
            if (oldPhotoUrl) {
              await imageService.deleteAvatar(oldPhotoUrl);
            }
          }
          avatarString = imageService.createPhotoAvatarString(photoUrl);
          console.log('SettingsScreen - Avatar string created:', avatarString);
        } else {
          console.error('SettingsScreen - Photo upload failed');
          Alert.alert('Erreur', 'Impossible de télécharger la photo');
          return;
        }
      } else if (selectedAvatarData.type === 'icon') {
        // Supprimer l'ancienne photo si on passe à une icône
        if (user?.avatar && user.avatar.startsWith('photo:')) {
          const oldPhotoUrl = imageService.extractPhotoUrl(user.avatar);
          if (oldPhotoUrl) {
            await imageService.deleteAvatar(oldPhotoUrl);
          }
        }
        avatarString = `icon:${selectedAvatarData.value}:${selectedAvatarData.color}`;
      } else {
        avatarString = selectedAvatarData.value;
      }

      // Calcul des données corporelles avancées
      const bodyData = calculateAdvancedBMI(heightNum, weightNum, ageNum, selectedGender);
      
      await updateUserProfile({
        name: profileName.trim(),
        avatar: avatarString,
        profile: {
          gender: selectedGender,
          age: ageNum,
          height: heightNum,
          weight: weightNum,
          activityLevel,
          // Données calculées automatiquement
          bmi: bodyData.bmi,
          bmiCategory: bodyData.bmiCategory,
          bodyFatPercentage: bodyData.bodyFatPercentage,
          leanBodyMass: bodyData.leanBodyMass
        },
        preferences: {
          ...user?.preferences,
          notifications
        }
      });
      setIsEditingProfile(false);
      Alert.alert('Succès', 'Profil mis à jour avec succès');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le profil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveGroup = () => {
    if (!group) return;

    Alert.alert(
      'Quitter le groupe',
      `Êtes-vous sûr de vouloir quitter le groupe "${group.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Quitter',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveGroup();
              navigation.navigate('Auth');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de quitter le groupe');
            }
          }
        }
      ]
    );
  };

  const handlePhotoSelection = async (source: 'camera' | 'gallery') => {
    try {
      console.log('=== DEBUT SELECTION PHOTO ===');
      console.log('SettingsScreen - handlePhotoSelection called with source:', source);
      setIsUploadingPhoto(true);
      
      const uri = source === 'camera' 
        ? await imageService.takePhoto()
        : await imageService.pickImageFromGallery();
      
      console.log('SettingsScreen - Photo service returned URI:', uri);
      
      if (uri) {
        console.log('SettingsScreen - Setting tempPhotoUri to:', uri);
        setTempPhotoUri(uri);
        
        const newAvatarData = { type: 'photo' as const, value: uri };
        console.log('SettingsScreen - Setting selectedAvatarData to:', newAvatarData);
        setSelectedAvatarData(newAvatarData);
        
        console.log('SettingsScreen - State updated successfully');
      } else {
        console.log('SettingsScreen - No URI received from photo service');
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner la photo');
    } finally {
      setIsUploadingPhoto(false);
      console.log('=== FIN SELECTION PHOTO ===');
    }
  };

  const handleCancelEdit = () => {
    setProfileName(user?.name || '');
    setSelectedAvatarData(user?.avatar ? parseAvatarString(user.avatar) : AVATAR_OPTIONS[0]);
    setTempPhotoUri(null);
    setSelectedGender(user?.profile?.gender || 'male');
    setAge(user?.profile?.age?.toString() || '');
    setHeight(user?.profile?.height?.toString() || '');
    setWeight(user?.profile?.weight?.toString() || '');
    setActivityLevel(user?.profile?.activityLevel || 'moderate');
    setIsEditingProfile(false);
  };

  const handleResetMyData = () => {
    if (!user || !group) return;

    Alert.alert(
      'Réinitialiser mes données',
      'Êtes-vous sûr de vouloir supprimer toutes VOS boissons et remettre VOS compteurs à zéro ?\n\nCela n\'affectera pas les autres membres du groupe.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await drinkService.deleteUserDrinks(group.id, user.id);
              Alert.alert('Succès', 'Vos données ont été réinitialisées avec succès');
            } catch (error) {
              console.error('Error resetting user data:', error);
              Alert.alert('Erreur', 'Impossible de réinitialiser vos données');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleNavigateToMapping = () => {
    navigation.navigate('Mapping');
  };

  const handleLocationSharingToggle = async (enabled: boolean) => {
    try {
      await memberLocationService.setSharingPreference(enabled);
      setLocationSharingEnabled(enabled);
    } catch (error) {
      console.error('Error updating location sharing preference:', error);
      Alert.alert('Erreur', 'Impossible de modifier le partage de position');
    }
  };

  const handleThemePress = () => {
    const themeOptions = [
      { label: '☀️ Clair', value: 'light' as const },
      { label: '🌙 Sombre', value: 'dark' as const },
      { label: '⚙️ Automatique', value: 'auto' as const }
    ];

    Alert.alert(
      'Choisir le thème',
      'Sélectionnez votre préférence d\'affichage',
      [
        ...themeOptions.map(option => ({
          text: option.label + (themeMode === option.value ? ' ✓' : ''),
          onPress: () => setThemeMode(option.value)
        })),
        { text: 'Annuler', style: 'cancel' as const }
      ]
    );
  };

  const settingsItems = [
    {
      icon: 'color-palette-outline' as const,
      title: 'Thème',
      subtitle: `Mode ${themeMode === 'auto' ? 'automatique' : themeMode === 'dark' ? 'sombre' : 'clair'}`,
      type: 'theme' as const,
      value: themeMode,
      onPress: handleThemePress
    },
    {
      icon: 'notifications-outline' as const,
      title: 'Notifications',
      subtitle: 'Recevoir les notifications du groupe',
      type: 'switch' as const,
      value: notifications,
      onValueChange: setNotifications
    },
    {
      icon: 'location-outline' as const,
      title: 'Partage de position',
      subtitle: 'Partager votre position avec le groupe',
      type: 'switch' as const,
      value: locationSharingEnabled,
      onValueChange: handleLocationSharingToggle
    },
    {
      icon: 'information-circle-outline' as const,
      title: 'À propos',
      subtitle: 'Version et informations',
      type: 'nav' as const,
      onPress: () => Alert.alert('Festival Tracker', 'Version 1.0.0\nSuivi responsable de consommation')
    },
    {
      icon: 'help-circle-outline' as const,
      title: 'Aide',
      subtitle: 'Guide d\'utilisation',
      type: 'nav' as const,
      onPress: () => Alert.alert('Aide', 'Créez un groupe, ajoutez vos boissons et suivez votre consommation avec vos amis !')
    }
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* Profil */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Mon profil
            </Text>
            {!isEditingProfile && (
              <TouchableOpacity onPress={() => setIsEditingProfile(true)}>
                <Ionicons name="pencil" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {isEditingProfile ? (
            <View style={styles.editProfile}>
              {/* Prévisualisation de l'avatar sélectionné */}
              <View style={styles.avatarPreview}>
                <Avatar 
                  avatarData={selectedAvatarData}
                  name={profileName}
                  size="xlarge" 
                />
                <Text style={[styles.previewLabel, { color: colors.textLight }]}>
                  Aperçu de votre avatar
                </Text>
              </View>

              <Input
                label="Nom"
                value={profileName}
                onChangeText={setProfileName}
                placeholder="Votre nom"
                maxLength={30}
              />

              <View style={styles.genderSection}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Sexe
                </Text>
                <View style={styles.genderButtons}>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      selectedGender === 'male' && { backgroundColor: colors.primary },
                      { borderColor: selectedGender === 'male' ? colors.primary : colors.border }
                    ]}
                    onPress={() => setSelectedGender('male')}
                  >
                    <Ionicons 
                      name="male" 
                      size={20} 
                      color={selectedGender === 'male' ? '#ffffff' : colors.text} 
                    />
                    <Text style={[
                      styles.genderText,
                      { color: selectedGender === 'male' ? '#ffffff' : colors.text }
                    ]}>
                      Homme
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      selectedGender === 'female' && { backgroundColor: colors.primary },
                      { borderColor: selectedGender === 'female' ? colors.primary : colors.border }
                    ]}
                    onPress={() => setSelectedGender('female')}
                  >
                    <Ionicons 
                      name="female" 
                      size={20} 
                      color={selectedGender === 'female' ? '#ffffff' : colors.text} 
                    />
                    <Text style={[
                      styles.genderText,
                      { color: selectedGender === 'female' ? '#ffffff' : colors.text }
                    ]}>
                      Femme
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Input
                label="Âge *"
                value={age}
                onChangeText={setAge}
                placeholder="25"
                keyboardType="numeric"
                maxLength={3}
              />

              <Input
                label="Taille (cm) *"
                value={height}
                onChangeText={setHeight}
                placeholder="175"
                keyboardType="numeric"
                maxLength={3}
              />

              <Input
                label="Poids (kg) *"
                value={weight}
                onChangeText={setWeight}
                placeholder="70"
                keyboardType="numeric"
                maxLength={5}
              />

              {/* Niveau d'activité */}
              <View style={styles.activitySection}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
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
                          backgroundColor: activityLevel === option.value ? colors.primary : colors.surface,
                          borderColor: activityLevel === option.value ? colors.primary : colors.border
                        }
                      ]}
                      onPress={() => setActivityLevel(option.value as any)}
                    >
                      <Ionicons 
                        name={option.icon as any} 
                        size={20} 
                        color={activityLevel === option.value ? '#ffffff' : colors.text} 
                      />
                      <Text style={[
                        styles.activityOptionLabel,
                        { color: activityLevel === option.value ? '#ffffff' : colors.text }
                      ]}>
                        {option.label}
                      </Text>
                      <Text style={[
                        styles.activityOptionDesc,
                        { color: activityLevel === option.value ? '#ffffff' : colors.textLight }
                      ]}>
                        {option.desc}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Sélecteur de photo */}
              <View style={styles.photoSection}>
                <Text style={[styles.avatarLabel, { color: colors.text }]}>
                  Photo de profil
                </Text>
                <View style={styles.photoButtons}>
                  <TouchableOpacity
                    style={[styles.photoButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => handlePhotoSelection('camera')}
                    disabled={isUploadingPhoto}
                  >
                    <Ionicons name="camera" size={20} color={colors.primary} />
                    <Text style={[styles.photoButtonText, { color: colors.text }]}>Selfie</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.photoButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => handlePhotoSelection('gallery')}
                    disabled={isUploadingPhoto}
                  >
                    <Ionicons name="images" size={20} color={colors.primary} />
                    <Text style={[styles.photoButtonText, { color: colors.text }]}>Galerie</Text>
                  </TouchableOpacity>
                </View>
                {isUploadingPhoto && <LoadingSpinner text="Chargement..." />}
              </View>

              <Text style={[styles.orText, { color: colors.textLight }]}>Ou choisissez une icône</Text>
              
              <Text style={[styles.avatarLabel, { color: colors.text }]}>
                Icônes
              </Text>
              <View style={styles.avatarGrid}>
                {AVATAR_OPTIONS.map((avatarOption, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.avatarOption,
                      {
                        backgroundColor: avatarOption.type === 'icon' ? avatarOption.color : colors.surface,
                        borderColor: colors.border
                      },
                      selectedAvatarData === avatarOption && {
                        borderColor: colors.primary,
                        borderWidth: 2
                      }
                    ]}
                    onPress={() => setSelectedAvatarData(avatarOption)}
                  >
                    {avatarOption.type === 'icon' ? (
                      <Ionicons name={avatarOption.value as any} size={24} color="#ffffff" />
                    ) : (
                      <Text style={styles.avatarEmoji}>{avatarOption.value}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.profileActions}>
                <Button
                  title="Annuler"
                  onPress={handleCancelEdit}
                  variant="ghost"
                  style={styles.profileButton}
                />
                <Button
                  title="Sauvegarder"
                  onPress={handleSaveProfile}
                  isLoading={isLoading}
                  style={styles.profileButton}
                />
              </View>
            </View>
          ) : (
            <View style={styles.profileInfo}>
              {/* Photo de profil centrée */}
              <View style={styles.profileAvatarContainer}>
                <Avatar 
                  avatarData={user?.avatar ? parseAvatarString(user.avatar) : undefined}
                  name={user?.name}
                  size="xlarge" 
                />
              </View>
              
              {/* Nom d'utilisateur centré */}
              <Text style={[styles.profileName, { color: colors.text }]}>
                {user?.name}
              </Text>
              
              {/* Informations de base */}
              <Text style={[styles.profileSubtitle, { color: colors.textLight }]}>
                {user?.profile?.gender === 'female' ? 'Femme' : 'Homme'} • {user?.profile?.age || '?'} ans
              </Text>
              
              {/* Données physiques */}
              {user?.profile?.height && user?.profile?.weight && (
                <Text style={[styles.profileSubtitle, { color: colors.textLight }]}>
                  {user.profile.height}cm • {user.profile.weight}kg • {user?.profile?.activityLevel || 'modéré'}
                </Text>
              )}
              
              {/* IMC et données calculées */}
              {user?.profile?.bmi && (
                <View style={styles.profileMetrics}>
                  <View style={[styles.metricBadge, { backgroundColor: getBMIColor(user.profile.bmiCategory || 'normal') + '20' }]}>
                    <Text style={[styles.metricLabel, { color: getBMIColor(user.profile.bmiCategory || 'normal') }]}>
                      IMC: {user.profile.bmi}
                    </Text>
                  </View>
                  {user.profile.bodyFatPercentage && (
                    <View style={[styles.metricBadge, { backgroundColor: colors.info + '20' }]}>
                      <Text style={[styles.metricLabel, { color: colors.info }]}>
                        MG: {user.profile.bodyFatPercentage}%
                      </Text>
                    </View>
                  )}
                </View>
              )}
              
              {/* Date d'inscription */}
              <Text style={[styles.profileSubtitle, { color: colors.textLight, marginTop: 8 }]}>
                Membre depuis {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : 'aujourd\'hui'}
              </Text>
              
              {/* Limites personnalisées si profil complet */}
              {user?.profile?.age && user?.profile?.height && user?.profile?.weight && user.profile && (
                (() => {
                  const limits = calculatePersonalizedLimits({
                    age: user.profile.age,
                    gender: user.profile.gender || 'male',
                    height: user.profile.height,
                    weight: user.profile.weight,
                    activityLevel: user.profile.activityLevel
                  });
                  return (
                    <View style={styles.profileLimits}>
                      <Text style={[styles.limitsTitle, { color: colors.success }]}>
                        🛡️ Vos limites personnalisées
                      </Text>
                      <Text style={[styles.limitsText, { color: colors.textLight }]}>
                        {limits.daily.units} unités/jour • {limits.singleSession.units} unités/session
                      </Text>
                    </View>
                  );
                })()
              )}
              
              {/* Alerte si profil incomplet */}
              {(!user?.profile?.age || !user?.profile?.height) && (
                <View style={[styles.incompleteAlert, { backgroundColor: colors.warning + '20' }]}>
                  <Ionicons name="warning" size={16} color={colors.warning} />
                  <Text style={[styles.incompleteText, { color: colors.warning }]}>
                    Complétez votre profil pour des calculs d'alcoolémie précis
                  </Text>
                </View>
              )}
            </View>
          )}
        </Card>

        {/* Groupe actuel */}
        {group && (
          <Card style={styles.groupCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Groupe actuel
            </Text>
            <View style={styles.groupInfo}>
              <View style={styles.groupDetails}>
                <Text style={[styles.groupName, { color: colors.text }]}>
                  {group.name}
                </Text>
                <Text style={[styles.groupSubtitle, { color: colors.textLight }]}>
                  {Object.keys(group.members).length} membres • Code: {group.id}
                </Text>
              </View>
              <Button
                title="Quitter"
                onPress={handleLeaveGroup}
                variant="danger"
                size="small"
              />
            </View>
          </Card>
        )}

        {/* Cartographie du Festival - disponible pour tous les membres */}
        {group && (
          <MappingCard 
            onPress={handleNavigateToMapping}
            zonesCount={zones.length}
          />
        )}

        {/* Paramètres */}
        <Card style={styles.settingsCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Paramètres
          </Text>
          
          {settingsItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.settingItem,
                index < settingsItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
              ]}
              onPress={item.type === 'nav' || item.type === 'theme' ? item.onPress : undefined}
              disabled={item.type === 'switch'}
            >
              <View style={styles.settingLeft}>
                <Ionicons name={item.icon} size={24} color={colors.textLight} />
                <View style={styles.settingTexts}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textLight }]}>
                    {item.subtitle}
                  </Text>
                </View>
              </View>
              
              {item.type === 'switch' && (
                <Switch
                  value={item.value}
                  onValueChange={item.onValueChange}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.surface}
                />
              )}
              
              {item.type === 'nav' && (
                <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
              )}
              
              {item.type === 'theme' && (
                <View style={styles.themeIndicator}>
                  <Text style={[styles.themeCurrentText, { color: colors.primary }]}>
                    {themeMode === 'auto' ? '⚙️' : themeMode === 'dark' ? '🌙' : '☀️'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </Card>

        {/* Danger Zone */}
        <Card style={[styles.dangerCard, { borderColor: colors.danger }]}>
          <Text style={[styles.sectionTitle, { color: colors.danger }]}>
            Zone de danger
          </Text>
          <Text style={[styles.dangerText, { color: colors.textLight }]}>
            Ces actions sont irréversibles. Procédez avec précaution.
          </Text>
          
          <Button
            title="Réinitialiser mes données"
            onPress={handleResetMyData}
            variant="danger"
            style={styles.dangerButton}
            icon={<Ionicons name="refresh" size={20} color="#ffffff" />}
            isLoading={isLoading}
          />
          
          <Button
            title="Supprimer mon compte"
            onPress={() => Alert.alert('Fonctionnalité', 'Suppression de compte - À implémenter')}
            variant="danger"
            style={styles.dangerButton}
          />
        </Card>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollView: {
    flex: 1,
    padding: 16
  },
  profileCard: {
    marginBottom: 16
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600'
  },
  profileInfo: {
    alignItems: 'center',
    paddingVertical: 8
  },
  profileAvatarContainer: {
    alignItems: 'center',
    marginBottom: 16
  },
  profileName: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center'
  },
  profileSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4
  },
  editProfile: {
    marginTop: 8
  },
  avatarLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    marginTop: 16
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  avatarOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#f0f0f0'
  },
  avatarEmoji: {
    fontSize: 24
  },
  profileActions: {
    flexDirection: 'row',
    gap: 12
  },
  profileButton: {
    flex: 1
  },
  groupCard: {
    marginBottom: 16
  },
  groupInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12
  },
  groupDetails: {
    flex: 1
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  groupSubtitle: {
    fontSize: 14
  },
  settingsCard: {
    marginBottom: 16
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  settingTexts: {
    marginLeft: 12,
    flex: 1
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2
  },
  settingSubtitle: {
    fontSize: 14
  },
  dangerCard: {
    marginBottom: 32,
    borderWidth: 1
  },
  dangerText: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20
  },
  dangerButton: {
    marginTop: 8
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    marginTop: 16
  },
  genderSection: {
    marginTop: 16,
    marginBottom: 8
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
    marginTop: 16,
    marginBottom: 8
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
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '500'
  },
  orText: {
    textAlign: 'center',
    fontSize: 14,
    marginVertical: 12,
    fontStyle: 'italic'
  },
  avatarPreview: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8
  },
  previewLabel: {
    fontSize: 14,
    marginTop: 8,
    fontStyle: 'italic'
  },
  activitySection: {
    marginTop: 16,
    marginBottom: 8
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  activityOption: {
    flex: 1,
    minWidth: '48%',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2
  },
  activityOptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4
  },
  activityOptionDesc: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2
  },
  profileMetrics: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  metricBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600'
  },
  profileLimits: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
    alignItems: 'center'
  },
  limitsTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center'
  },
  limitsText: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center'
  },
  incompleteAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 8
  },
  incompleteText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16
  },
  themeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  themeCurrentText: {
    fontSize: 18,
    fontWeight: '600'
  }
});