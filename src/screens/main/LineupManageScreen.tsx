import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal
} from 'react-native';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useTheme } from '../../context/ThemeContext';
import { useAuthContext } from '../../context/AuthContext';
import { useGroupContext } from '../../context/GroupContext';
import { useLineup } from '../../hooks/useLineup';
import { LineupEvent, LineupEventInput } from '../../types';
import { format, parseISO, addDays, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import lineupService from '../../services/lineupService';

interface LineupManageScreenProps {
  navigation: any;
}

export function LineupManageScreen({ navigation }: LineupManageScreenProps) {
  const { colors, theme } = useTheme();
  const { user } = useAuthContext();
  const { group } = useGroupContext();
  const { 
    lineup, 
    isLoading, 
    error, 
    refresh,
    addEvent,
    deleteEvent,
    updateStages,
    initializeLineup,
    getDayEvents,
    getAvailableDates
  } = useLineup(group?.id || null);

  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showAddStageModal, setShowAddStageModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [newStage, setNewStage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulaire ajout événement
  const [eventForm, setEventForm] = useState<LineupEventInput>({
    artistName: '',
    stageName: '',
    startTime: '',
    endTime: '',
    description: '',
    genre: ''
  });

  useEffect(() => {
    if (lineup && !selectedDate) {
      const today = format(new Date(), 'yyyy-MM-dd');
      const availableDates = getAvailableDates();
      
      if (availableDates.includes(today)) {
        setSelectedDate(today);
      } else if (availableDates.length > 0) {
        setSelectedDate(availableDates[0]);
      } else {
        // Créer une date par défaut (aujourd'hui)
        setSelectedDate(today);
      }
    }
  }, [lineup, selectedDate, getAvailableDates]);

  const handleAddEvent = async () => {
    if (!eventForm.artistName || !eventForm.stageName || !eventForm.startTime || !eventForm.endTime) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Créer les dates complètes
      const eventDate = parseISO(selectedDate);
      const [startHour, startMinute] = eventForm.startTime.split(':').map(Number);
      const [endHour, endMinute] = eventForm.endTime.split(':').map(Number);
      
      const startDateTime = new Date(eventDate);
      startDateTime.setHours(startHour, startMinute, 0, 0);
      
      const endDateTime = new Date(eventDate);
      endDateTime.setHours(endHour, endMinute, 0, 0);

      // Si l'heure de fin est inférieure à l'heure de début, ajouter un jour
      if (endDateTime <= startDateTime) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }

      const newEvent: Omit<LineupEvent, 'id'> = {
        artistName: eventForm.artistName,
        stageName: eventForm.stageName,
        startTime: startDateTime,
        endTime: endDateTime,
        description: eventForm.description || undefined,
        genre: eventForm.genre || undefined
      };

      await addEvent(selectedDate, newEvent);
      
      // Reset du formulaire
      setEventForm({
        artistName: '',
        stageName: lineup?.stages[0] || '',
        startTime: '',
        endTime: '',
        description: '',
        genre: ''
      });
      
      setShowAddEventModal(false);
      Alert.alert('Succès', 'Événement ajouté avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter l\'événement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = (event: LineupEvent) => {
    Alert.alert(
      'Supprimer l\'événement',
      `Êtes-vous sûr de vouloir supprimer "${event.artistName}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvent(event.id);
              Alert.alert('Succès', 'Événement supprimé');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer l\'événement');
            }
          }
        }
      ]
    );
  };

  const handleAddStage = async () => {
    if (!newStage.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom de scène');
      return;
    }

    if (lineup?.stages.includes(newStage.trim())) {
      Alert.alert('Erreur', 'Cette scène existe déjà');
      return;
    }

    try {
      setIsSubmitting(true);
      const updatedStages = [...(lineup?.stages || []), newStage.trim()];
      await updateStages(updatedStages, user?.id || '');
      setNewStage('');
      setShowAddStageModal(false);
      Alert.alert('Succès', 'Scène ajoutée avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter la scène');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveStage = (stageToRemove: string) => {
    Alert.alert(
      'Supprimer la scène',
      `Êtes-vous sûr de vouloir supprimer la scène "${stageToRemove}" ?\n\nTous les événements de cette scène seront également supprimés.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedStages = lineup?.stages.filter(stage => stage !== stageToRemove) || [];
              await updateStages(updatedStages, user?.id || '');
              Alert.alert('Succès', 'Scène supprimée');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer la scène');
            }
          }
        }
      ]
    );
  };

  const handleImportCSV = async () => {
    Alert.alert(
      'Import CSV',
      'Choisissez une option :',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Télécharger modèle', onPress: handleDownloadTemplate },
        { text: 'Importer fichier', onPress: selectCSVFile }
      ]
    );
  };

  const selectCSVFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        await processCSVFile(file.uri);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de lire le fichier CSV');
    }
  };

  const handleDownloadTemplate = () => {
    const template = lineupService.generateCSVTemplate();
    Alert.alert(
      'Modèle CSV',
      'Voici le format attendu pour votre fichier CSV :\n\n' + template,
      [{ text: 'OK' }]
    );
  };

  const processCSVFile = async (uri: string) => {
    try {
      setIsSubmitting(true);
      
      // Lire le contenu du fichier CSV
      const csvContent = await FileSystem.readAsStringAsync(uri);
      
      if (!csvContent.trim()) {
        Alert.alert('Erreur', 'Le fichier CSV est vide');
        return;
      }

      // Importer via le service
      await lineupService.importFromCSV(group?.id || '', csvContent, user?.id || '');
      
      // Rafraîchir les données
      await refresh();
      
      Alert.alert('Succès', 'Programmation importée avec succès depuis le fichier CSV');
      
    } catch (error: any) {
      console.error('Error processing CSV:', error);
      Alert.alert(
        'Erreur d\'importation', 
        error.message || 'Impossible de traiter le fichier CSV. Vérifiez le format du fichier.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateNewDate = () => {
    const dates = getAvailableDates();
    if (dates.length === 0) {
      return format(new Date(), 'yyyy-MM-dd');
    }
    
    const lastDate = dates[dates.length - 1];
    const nextDay = addDays(parseISO(lastDate), 1);
    return format(nextDay, 'yyyy-MM-dd');
  };

  const renderDayTabs = () => {
    const availableDates = getAvailableDates();
    const allDates = [...availableDates];
    
    // Ajouter une option pour créer une nouvelle journée
    const newDateOption = generateNewDate();
    if (!allDates.includes(newDateOption)) {
      allDates.push(newDateOption);
    }

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.dayTabs}
        contentContainerStyle={styles.dayTabsContent}
      >
        {allDates.map(date => {
          const dateObj = parseISO(date);
          const isSelected = selectedDate === date;
          const hasEvents = getDayEvents(date).length > 0;
          const isNewDate = !availableDates.includes(date);
          
          return (
            <TouchableOpacity
              key={date}
              onPress={() => setSelectedDate(date)}
              style={[
                styles.dayTab,
                isSelected && { backgroundColor: colors.primary },
                { borderColor: colors.border },
                isNewDate && { borderStyle: 'dashed' }
              ]}
            >
              <Text style={[
                styles.dayTabText,
                { color: isSelected ? '#ffffff' : colors.text }
              ]}>
                {format(dateObj, 'EEE', { locale: fr })}
              </Text>
              <Text style={[
                styles.dayTabDate,
                { color: isSelected ? '#ffffff' : colors.textLight }
              ]}>
                {format(dateObj, 'dd/MM')}
              </Text>
              {hasEvents && !isNewDate && (
                <View style={[styles.eventsDot, { backgroundColor: isSelected ? '#ffffff' : colors.primary }]} />
              )}
              {isNewDate && (
                <Ionicons 
                  name="add" 
                  size={12} 
                  color={isSelected ? '#ffffff' : colors.textLight}
                  style={styles.addIcon}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  const renderEventsList = () => {
    const dayEvents = getDayEvents(selectedDate);
    
    if (dayEvents.length === 0) {
      return (
        <View style={styles.noEventsContainer}>
          <Ionicons name="calendar" size={48} color={colors.textLight} />
          <Text style={[styles.noEventsText, { color: colors.textLight }]}>
            Aucun événement programmé pour cette journée
          </Text>
          <Button
            title="Ajouter un événement"
            onPress={() => setShowAddEventModal(true)}
            icon={<Ionicons name="add" size={20} color="#ffffff" />}
          />
        </View>
      );
    }

    return (
      <View style={styles.eventsList}>
        {dayEvents.map(event => (
          <Card key={event.id} style={styles.eventCard}>
            <View style={styles.eventHeader}>
              <View style={styles.eventTime}>
                <Text style={[styles.timeText, { color: colors.text }]}>
                  {format(event.startTime, 'HH:mm')} - {format(event.endTime, 'HH:mm')}
                </Text>
                <View style={[styles.stageTag, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.stageText, { color: colors.textLight }]}>
                    {event.stageName}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteEvent(event)}
                style={[styles.deleteButton, { backgroundColor: colors.danger }]}
              >
                <Ionicons name="trash" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.artistName, { color: colors.text }]}>
              {event.artistName}
            </Text>
            
            {event.genre && (
              <Text style={[styles.eventGenre, { color: colors.textLight }]}>
                {event.genre}
              </Text>
            )}
            
            {event.description && (
              <Text style={[styles.eventDescription, { color: colors.textLight }]}>
                {event.description}
              </Text>
            )}
          </Card>
        ))}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner text="Chargement de la programmation..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          Gérer la programmation
        </Text>
        <TouchableOpacity onPress={handleImportCSV}>
          <Ionicons name="cloud-upload" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Actions rapides */}
      <View style={styles.quickActions}>
        <Button
          title="Ajouter événement"
          onPress={() => setShowAddEventModal(true)}
          variant="ghost"
          icon={<Ionicons name="add" size={18} color={colors.primary} />}
          style={styles.actionButton}
        />
        <Button
          title="Gérer scènes"
          onPress={() => setShowAddStageModal(true)}
          variant="ghost"
          icon={<Ionicons name="location" size={18} color={colors.primary} />}
          style={styles.actionButton}
        />
      </View>

      {/* Onglets des jours */}
      {renderDayTabs()}

      {/* Liste des événements */}
      <ScrollView style={styles.content}>
        {renderEventsList()}
      </ScrollView>

      {/* Modal Ajouter Événement */}
      <Modal
        visible={showAddEventModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddEventModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.primary }]}>Annuler</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Nouvel événement
            </Text>
            <TouchableOpacity onPress={handleAddEvent} disabled={isSubmitting}>
              <Text style={[styles.modalSave, { color: colors.primary }]}>
                {isSubmitting ? 'Ajout...' : 'Ajouter'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Input
              label="Nom de l'artiste *"
              value={eventForm.artistName}
              onChangeText={(text) => setEventForm(prev => ({ ...prev, artistName: text }))}
              placeholder="Nom de l'artiste"
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Scène *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stageSelector}>
              {lineup?.stages.map(stage => (
                <TouchableOpacity
                  key={stage}
                  onPress={() => setEventForm(prev => ({ ...prev, stageName: stage }))}
                  style={[
                    styles.stageOption,
                    eventForm.stageName === stage && { backgroundColor: colors.primary },
                    { borderColor: colors.border }
                  ]}
                >
                  <Text style={[
                    styles.stageOptionText,
                    { color: eventForm.stageName === stage ? '#ffffff' : colors.text }
                  ]}>
                    {stage}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.timeRow}>
              <View style={styles.timeInput}>
                <Input
                  label="Heure début *"
                  value={eventForm.startTime}
                  onChangeText={(text) => setEventForm(prev => ({ ...prev, startTime: text }))}
                  placeholder="14:30"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.timeInput}>
                <Input
                  label="Heure fin *"
                  value={eventForm.endTime}
                  onChangeText={(text) => setEventForm(prev => ({ ...prev, endTime: text }))}
                  placeholder="15:30"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Input
              label="Genre"
              value={eventForm.genre}
              onChangeText={(text) => setEventForm(prev => ({ ...prev, genre: text }))}
              placeholder="Rock, Électro, Hip-Hop..."
            />

            <Input
              label="Description"
              value={eventForm.description}
              onChangeText={(text) => setEventForm(prev => ({ ...prev, description: text }))}
              placeholder="Description de l'événement"
              multiline
              numberOfLines={3}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Modal Gérer Scènes */}
      <Modal
        visible={showAddStageModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddStageModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.primary }]}>Fermer</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Gérer les scènes
            </Text>
            <View style={styles.modalSpacer} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Card style={styles.addStageCard}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Ajouter une scène
              </Text>
              <View style={styles.addStageRow}>
                <Input
                  value={newStage}
                  onChangeText={setNewStage}
                  placeholder="Nom de la scène"
                  style={styles.stageInput}
                />
                <Button
                  title="Ajouter"
                  onPress={handleAddStage}
                  isLoading={isSubmitting}
                  style={styles.addStageButton}
                />
              </View>
            </Card>

            <Card style={styles.stagesListCard}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Scènes existantes
              </Text>
              {lineup?.stages.map(stage => (
                <View key={stage} style={styles.stageItem}>
                  <Text style={[styles.stageName, { color: colors.text }]}>
                    {stage}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveStage(stage)}
                    style={[styles.removeStageButton, { backgroundColor: colors.danger }]}
                  >
                    <Ionicons name="trash" size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ))}
            </Card>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  title: {
    fontSize: 18,
    fontWeight: '600'
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8
  },
  actionButton: {
    flex: 1
  },
  dayTabs: {
    flexGrow: 0,
    marginHorizontal: 16,
    marginVertical: 8
  },
  dayTabsContent: {
    paddingRight: 16
  },
  dayTab: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    position: 'relative'
  },
  dayTabText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize'
  },
  dayTabDate: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2
  },
  eventsDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3
  },
  addIcon: {
    position: 'absolute',
    top: 6,
    right: 6
  },
  content: {
    flex: 1,
    padding: 16
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: 48
  },
  noEventsText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24
  },
  eventsList: {
    gap: 12
  },
  eventCard: {
    padding: 16
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  eventTime: {
    flex: 1
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4
  },
  stageTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  stageText: {
    fontSize: 12,
    fontWeight: '500'
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8
  },
  artistName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4
  },
  eventGenre: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4
  },
  eventDescription: {
    fontSize: 14,
    lineHeight: 20
  },
  modalContainer: {
    flex: 1
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  modalCancel: {
    fontSize: 16
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600'
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600'
  },
  modalSpacer: {
    width: 60
  },
  modalContent: {
    flex: 1,
    padding: 16
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16
  },
  stageSelector: {
    marginBottom: 16
  },
  stageOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8
  },
  stageOptionText: {
    fontSize: 14,
    fontWeight: '500'
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12
  },
  timeInput: {
    flex: 1
  },
  addStageCard: {
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16
  },
  addStageRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end'
  },
  stageInput: {
    flex: 1
  },
  addStageButton: {
    marginBottom: 8
  },
  stagesListCard: {
    marginBottom: 16
  },
  stageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  stageName: {
    fontSize: 16,
    flex: 1
  },
  removeStageButton: {
    padding: 8,
    borderRadius: 8
  }
});