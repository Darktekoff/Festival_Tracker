# 🚨 Plan de correction - Crashes et bugs de synchronisation

## 📋 **Problèmes identifiés**

### 1. **🔥 CRASHES** - Onglets Groupe et Stats
- **Symptôme** : App se ferme lors de l'accès aux onglets
- **Cause** : Race conditions dans la synchronisation Firebase
- **Impact** : Application inutilisable pour ces fonctionnalités

### 2. **📷 PHOTOS CHAT** - Images non visibles
- **Symptôme** : Photos envoyées visibles pour l'expéditeur, cadre vide pour le destinataire
- **Cause** : Problème d'URL Firebase Storage ou permissions
- **Impact** : Communication visuelle impossible

### 3. **🗺️ LOCALISATION CHAT** - Liens cassés
- **Symptôme** : "Erreur: impossible d'ouvrir la carte" au lieu de Google Maps
- **Cause** : Mauvaise génération des liens géographiques ou gestion des URLs
- **Impact** : Partage de position non fonctionnel

---

## 🎯 **Plan de correction détaillé**

### **PHASE 1 : Crashes de synchronisation (CRITIQUE)**

#### 1.1 GroupScreen & StatsScreen - Protection des données
```typescript
// Problèmes détectés :
- useMembers() appelé avec group.members undefined
- useDrinks() appelé pendant les transitions
- Accès direct aux propriétés sans vérification
- useFocusEffect sans guards
```

**Fichiers à modifier :**
- `src/screens/main/GroupScreen.tsx`
- `src/screens/main/StatsScreen.tsx`
- `src/hooks/useMembers.ts`
- `src/hooks/useDrinks.ts`

#### 1.2 Hook useMembers - Sécurisation
```typescript
// Corrections nécessaires :
- Vérifier groupMembers !== undefined
- Guards sur tous les accès aux propriétés
- Gestion des états de chargement
- Try-catch sur les calculs de stats
```

**Actions :**
1. Ajouter early returns si `groupMembers` est undefined
2. Protéger tous les accès aux propriétés avec optional chaining
3. Ajouter des try-catch dans les calculs de statistiques
4. Implémenter un état de chargement spécifique

#### 1.3 Synchronisation Firebase - Robustesse
```typescript
// Améliorations :
- subscribeToGroup() avec validation des données
- Retry automatique en cas d'échec
- Cache local pour éviter les re-fetches
- Debounce sur les refresh automatiques
```

**Fichiers concernés :**
- `src/services/groupService.ts`
- `src/hooks/useGroup.ts`
- `src/context/GroupContext.tsx`

### **PHASE 2 : Photos dans le chat**

#### 2.1 Diagnostic upload/stockage
```typescript
// Points à vérifier :
- URLs Firebase Storage générées
- Permissions de lecture cross-user
- Format des messages photo
- Synchronisation Firestore des URLs
```

**Fichiers à analyser :**
- `src/services/imageService.ts`
- `src/services/chatService.ts`
- `src/components/chat/` (tous les composants)

#### 2.2 Composant d'affichage des images
```typescript
// Corrections probables :
- Validation des URLs reçues
- Fallback en cas d'erreur de chargement
- Cache local des images
- Gestion des timeouts
```

**Actions :**
1. Vérifier les règles de sécurité Firebase Storage
2. S'assurer que les URLs sont publiques ou ont les bonnes permissions
3. Ajouter des fallbacks pour les images qui ne se chargent pas
4. Implémenter un cache local pour les images

### **PHASE 3 : Localisation dans le chat**

#### 3.1 Génération des liens géographiques
```typescript
// Problèmes potentiels :
- Format URL Google Maps incorrect
- Coordonnées mal formatées
- Gestion des permissions de géolocalisation
- Linking vers apps externes
```

#### 3.2 Ouverture des cartes
```typescript
// Solutions :
- URLs Google Maps correctes
- Fallback vers Apple Maps (iOS)
- Deep links natifs
- Gestion d'erreurs explicite
```

**Format URL correct :**
```javascript
// Google Maps
const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

// Apple Maps (iOS)
const appleMapsUrl = `http://maps.apple.com/?q=${latitude},${longitude}`;

// Waze
const wazeUrl = `https://waze.com/ul?ll=${latitude},${longitude}`;
```

---

## 🔧 **Ordre d'implémentation**

### **🚨 URGENT (Résout l'inutilisabilité)**
1. **GroupScreen** - Early returns et protections de base
2. **useMembers** - Guards sur groupMembers et drinks
3. **StatsScreen** - Mêmes protections que GroupScreen

### **⚡ IMPORTANT (Améliore l'expérience)**
4. **Photos chat** - Diagnostic URLs et permissions Firebase
5. **Localisation** - Correction liens Google Maps

### **✨ OPTIMISATION (Performance)**
6. Cache local et debouncing
7. Retry automatique et error handling avancé

---

## 📊 **Impact attendu**

✅ **Plus de crashes** lors de la navigation entre onglets  
✅ **Photos visibles** pour tous les utilisateurs du chat  
✅ **Géolocalisation fonctionnelle** avec ouverture de Google Maps  
✅ **Synchronisation stable** entre plusieurs appareils  
✅ **Navigation fluide** dans toute l'application  

---

## 🧪 **Tests à effectuer**

- [ ] Navigation rapide entre tous les onglets
- [ ] Envoi/réception de photos entre 2 téléphones
- [ ] Partage de localisation et ouverture des liens
- [ ] Connexion instable/réseau lent
- [ ] Multiples utilisateurs simultanés dans un groupe

---

## 📝 **Notes techniques**

### Détails des erreurs observées

1. **Crash GroupScreen** : `Cannot read property 'age' of undefined`
   - Résolu partiellement par l'ajout de try-catch dans les fonctions de calcul
   - Nécessite encore des protections au niveau des hooks

2. **Photos chat** : 
   - L'expéditeur voit sa photo (cache local)
   - Le destinataire reçoit l'URL mais l'image ne se charge pas
   - Probablement un problème de permissions Firebase Storage

3. **Localisation chat** :
   - Erreur "impossible d'ouvrir la carte"
   - Besoin de vérifier le format des URLs générées
   - Implémenter une gestion d'erreur plus gracieuse

### Configuration Firebase à vérifier

```javascript
// Règles Firebase Storage (storage.rules)
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /chat-images/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}

// Règles Firestore pour les messages
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /groups/{groupId}/messages/{messageId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in resource.data.members;
    }
  }
}
```

---

## 🔗 **Liens utiles**

- [Firebase Storage Security Rules](https://firebase.google.com/docs/storage/security)
- [React Native Linking](https://reactnative.dev/docs/linking)
- [Google Maps URLs](https://developers.google.com/maps/documentation/urls/guide)
- [Expo Location](https://docs.expo.dev/versions/latest/sdk/location/)

---

**Dernière mise à jour :** 28 juillet 2025  
**Version app :** 1.0.0  
**Statut :** En attente de correction