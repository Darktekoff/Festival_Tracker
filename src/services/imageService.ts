import { storage, auth } from '../config/firebase';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert } from 'react-native';

class ImageService {
  private readonly MAX_SIZE = 500; // Taille max en pixels
  private readonly QUALITY = 0.8; // Qualité de compression
  
  // Méthode de retry pour contourner le bug de première tentative
  private async retryOperation<T>(
    operation: () => Promise<T>, 
    maxRetries: number = 2, 
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`ImageService - Attempt ${attempt}/${maxRetries}`);
        const result = await operation();
        return result;
      } catch (error) {
        console.log(`ImageService - Attempt ${attempt} failed:`, error);
        lastError = error;
        
        if (attempt < maxRetries) {
          console.log(`ImageService - Waiting ${delayMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    
    throw lastError;
  }

  async pickImageFromGallery(): Promise<string | null> {
    console.log('ImageService - pickImageFromGallery called');
    
    try {
      // Vérifier les permissions d'abord
      console.log('ImageService - Checking media library permissions...');
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      console.log('ImageService - Current permission status:', status);
      
      if (status !== 'granted') {
        console.log('ImageService - Requesting media library permissions...');
        const { status: newStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        console.log('ImageService - New permission status:', newStatus);
        
        if (newStatus !== 'granted') {
          Alert.alert(
            'Permission refusée',
            'Nous avons besoin de votre permission pour accéder à vos photos.'
          );
          return null;
        }
      }

      // Vérifier s'il y a un résultat en attente (Android)
      console.log('ImageService - Checking for pending results...');
      const pendingResult = await ImagePicker.getPendingResultAsync();
      if (pendingResult && !pendingResult.canceled && (pendingResult as any).assets && (pendingResult as any).assets.length > 0) {
        console.log('ImageService - Found pending result:', pendingResult);
        const assets = (pendingResult as any).assets;
        if (assets[0]) {
          return assets[0].uri;
        }
      }

      // Ouvrir le sélecteur d'images avec timeout
      console.log('ImageService - Launching image library...');
      
      // Créer une Promise avec timeout
      const launchLibraryWithTimeout = () => {
        return Promise.race([
          ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Gallery timeout after 10 seconds')), 10000)
          )
        ]);
      };
      
      const result = await launchLibraryWithTimeout() as ImagePicker.ImagePickerResult;

      console.log('ImageService - Image picker result:', result);
      
      if (!result.canceled && result.assets && result.assets[0]) {
        console.log('ImageService - Image selected:', result.assets[0].uri);
        return result.assets[0].uri;
      }

      console.log('ImageService - No image selected');
      return null;
    } catch (error) {
      console.error('Error picking image:', error);
      
      // Fallback vers l'image de test
      console.log('ImageService - Falling back to test image');
      const testImageUrl = 'https://picsum.photos/500/500?random=' + (Date.now() + 1000);
      
      Alert.alert(
        'Mode Développement', 
        'Galerie non disponible dans Expo Go. Image de test utilisée pour la démo.',
        [{ text: 'Compris' }]
      );
      
      return testImageUrl;
    }
  }

  async takePhoto(): Promise<string | null> {
    console.log('ImageService - takePhoto called');
    
    try {
      // Vérifier les permissions caméra d'abord
      console.log('ImageService - Checking camera permissions...');
      const { status } = await ImagePicker.getCameraPermissionsAsync();
      console.log('ImageService - Current camera permission status:', status);
      
      if (status !== 'granted') {
        console.log('ImageService - Requesting camera permissions...');
        const { status: newStatus } = await ImagePicker.requestCameraPermissionsAsync();
        console.log('ImageService - New camera permission status:', newStatus);
        
        if (newStatus !== 'granted') {
          Alert.alert(
            'Permission refusée',
            'Nous avons besoin de votre permission pour utiliser la caméra.'
          );
          return null;
        }
      }

      // Vérifier s'il y a un résultat en attente (Android)
      console.log('ImageService - Checking for pending camera results...');
      const pendingResult = await ImagePicker.getPendingResultAsync();
      if (pendingResult && !pendingResult.canceled && (pendingResult as any).assets && (pendingResult as any).assets.length > 0) {
        console.log('ImageService - Found pending camera result:', pendingResult);
        const assets = (pendingResult as any).assets;
        if (assets[0]) {
          return assets[0].uri;
        }
      }

      // Ouvrir la caméra avec timeout réduit pour Expo Go
      console.log('ImageService - Launching camera...');
      
      // TEST: Essayer la caméra directement sans timeout pour voir si Firebase Storage fonctionne
      console.log('ImageService - Testing camera without timeout...');
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      console.log('ImageService - Camera result received!');

      console.log('ImageService - Camera result:', result);
      
      if (!result.canceled && result.assets && result.assets[0]) {
        console.log('ImageService - Photo taken:', result.assets[0].uri);
        return result.assets[0].uri;
      }

      console.log('ImageService - No photo taken');
      return null;
    } catch (error) {
      console.error('Error taking photo:', error);
      
      // Fallback vers l'image de test
      console.log('ImageService - Falling back to test image');
      const testImageUrl = 'https://picsum.photos/500/500?random=' + Date.now();
      
      Alert.alert(
        'Mode Développement',
        'Caméra non disponible dans Expo Go. Image de test utilisée pour la démo.',
        [{ text: 'Compris' }]
      );
      
      return testImageUrl;
    }
  }

  async compressImage(uri: string): Promise<string> {
    try {
      console.log('ImageService - compressImage called with:', uri);
      
      // Redimensionner et compresser l'image
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: this.MAX_SIZE, height: this.MAX_SIZE } }],
        { compress: this.QUALITY, format: ImageManipulator.SaveFormat.JPEG }
      );

      console.log('ImageService - Image compressed successfully:', manipResult.uri);
      return manipResult.uri;
    } catch (error) {
      console.error('Error compressing image:', error);
      console.log('ImageService - Returning original URI due to compression error');
      return uri; // Retourner l'image originale en cas d'erreur
    }
  }

  async uploadAvatar(userId: string, imageUri: string): Promise<string | null> {
    try {
      console.log('ImageService - uploadAvatar called with URI:', imageUri);
      
      // Vérifier si c'est une image de test (Picsum) - pas besoin d'upload
      if (imageUri.includes('picsum.photos')) {
        console.log('ImageService - Test image detected, returning URL directly');
        return imageUri;
      }
      
      // Compresser l'image
      console.log('ImageService - Compressing image...');
      const compressedUri = await this.compressImage(imageUri);
      console.log('ImageService - Image compressed:', compressedUri);

      // Convertir l'URI en blob
      console.log('ImageService - Converting to blob...');
      const response = await fetch(compressedUri);
      console.log('ImageService - Fetch response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Fetch failed with status: ${response.status}`);
      }
      
      const blob = await response.blob();
      console.log('ImageService - Blob created, size:', blob.size);

      // Créer une référence unique pour l'avatar
      const timestamp = Date.now();
      const avatarRef = ref(storage, `avatars/${userId}_${timestamp}.jpg`);
      console.log('ImageService - Firebase reference created:', `avatars/${userId}_${timestamp}.jpg`);

      // Vérifier l'authentification
      const currentUser = auth.currentUser;
      console.log('ImageService - Current user:', currentUser?.uid);
      console.log('ImageService - User ID parameter:', userId);
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      // Upload l'image
      console.log('ImageService - Starting upload to Firebase...');
      console.log('ImageService - Storage bucket:', storage.app.options.storageBucket);
      
      await uploadBytes(avatarRef, blob);
      console.log('ImageService - Upload completed');

      // Obtenir l'URL de téléchargement
      console.log('ImageService - Getting download URL...');
      const downloadURL = await getDownloadURL(avatarRef);
      console.log('ImageService - Download URL obtained:', downloadURL);

      return downloadURL;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        serverResponse: error.serverResponse,
        customData: error.customData
      });
      Alert.alert('Erreur', `Impossible de télécharger l'image: ${error.message || error}`);
      return null;
    }
  }

  async deleteAvatar(photoUrl: string): Promise<void> {
    try {
      // Extraire le chemin du fichier de l'URL
      const decodedUrl = decodeURIComponent(photoUrl);
      const matches = decodedUrl.match(/avatars%2F(.+?)\?/);
      
      if (matches && matches[1]) {
        const fileName = matches[1];
        const fileRef = ref(storage, `avatars/${fileName}`);
        await deleteObject(fileRef);
      }
    } catch (error) {
      console.error('Error deleting avatar:', error);
      // Ne pas afficher d'erreur à l'utilisateur car ce n'est pas critique
    }
  }

  extractPhotoUrl(avatarString: string): string | null {
    if (avatarString.startsWith('photo:')) {
      return avatarString.substring(6); // Enlever 'photo:' du début
    }
    return null;
  }

  createPhotoAvatarString(url: string): string {
    return `photo:${url}`;
  }
}

export default new ImageService();