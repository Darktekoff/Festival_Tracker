import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { DrinkTemplate, DrinkFormData } from '../../types';
import { DrinkTypeSelector } from '../drink/DrinkTypeSelector';
import { DrinkDetailsForm } from '../drink/DrinkDetailsForm';
import { QuickAddButtons } from '../drink/QuickAddButtons';
import { Modal } from '../ui/Modal';

interface DrinkFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: DrinkFormData) => void;
  isLoading?: boolean;
}

export function DrinkForm({ visible, onClose, onSubmit, isLoading }: DrinkFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<DrinkTemplate | null>(null);
  const [step, setStep] = useState<'quick' | 'select' | 'details'>('quick');

  const handleQuickAdd = (template: DrinkTemplate) => {
    const formData: DrinkFormData = {
      category: template.category,
      drinkType: template.type,
      volume: template.volume,
      alcoholDegree: template.defaultAlcohol
    };
    onSubmit(formData);
  };

  const handleTemplateSelect = (template: DrinkTemplate) => {
    setSelectedTemplate(template);
    setStep('details');
  };

  const handleFormSubmit = (data: DrinkFormData) => {
    onSubmit(data);
  };

  const handleClose = () => {
    setStep('quick');
    setSelectedTemplate(null);
    onClose();
  };

  const renderContent = () => {
    switch (step) {
      case 'quick':
        return (
          <View style={styles.quickContent}>
            <QuickAddButtons
              onQuickAdd={handleQuickAdd}
              isLoading={isLoading}
            />
          </View>
        );
      
      case 'select':
        return (
          <DrinkTypeSelector
            onSelect={handleTemplateSelect}
          />
        );
      
      case 'details':
        return selectedTemplate ? (
          <DrinkDetailsForm
            template={selectedTemplate}
            onSubmit={handleFormSubmit}
            onCancel={() => setStep('select')}
            isLoading={isLoading}
          />
        ) : null;
    }
  };

  const getTitle = () => {
    switch (step) {
      case 'quick':
        return 'Ajouter une boisson';
      case 'select':
        return 'Choisir le type';
      case 'details':
        return 'Détails de la boisson';
      default:
        return 'Ajouter une boisson';
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title={getTitle()}
      size="large"
      scrollable={step === 'select'}
    >
      {renderContent()}
    </Modal>
  );
}

const styles = StyleSheet.create({
  quickContent: {
    minHeight: 200
  }
});