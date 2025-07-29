# 🍻 Festival Tracker

Une application React Native/Expo pour suivre la consommation d'alcool en temps réel avec vos amis pendant les festivals.

## 🎯 Fonctionnalités

### 🔐 Authentification
- Connexion anonyme automatique
- Configuration du profil utilisateur
- Gestion des avatars personnalisés

### 👥 Gestion des groupes
- Création et rejoindre des groupes
- Codes de groupe partageables
- Gestion des membres et des rôles
- Invitation d'amis
- Statistiques de groupe

### 🍺 Suivi des boissons
- Catalogue complet de boissons (bières, vins, cocktails, shots, champagne)
- Calcul automatique des unités d'alcool
- Ajout rapide ou détaillé
- Historique complet
- Synchronisation temps réel

### 📊 Statistiques et alertes
- Suivi quotidien et hebdomadaire
- Alertes de sécurité (modéré, élevé, critique)
- Statistiques de groupe
- Tendances et moyennes
- Système de notifications

### 🌐 Fonctionnalités avancées
- Mode hors ligne avec synchronisation
- Notifications push
- Retour haptique
- Thème sombre/clair
- Feed d'activité temps réel

## 🚀 Installation

### Prérequis
- Node.js 18+ 
- npm ou yarn
- Expo CLI (`npm install -g @expo/cli`)
- Compte Firebase (gratuit)

### 1. Cloner le projet
```bash
git clone <url-du-repo>
cd FestivalTracker
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configuration Firebase

1. Créez un projet Firebase sur [console.firebase.google.com](https://console.firebase.google.com)
2. Activez l'authentification anonyme
3. Créez une base de données Firestore
4. Copiez votre configuration Firebase
5. Remplacez les placeholders dans `src/config/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "VOTRE_AUTH_DOMAIN",
  projectId: "VOTRE_PROJECT_ID",
  storageBucket: "VOTRE_STORAGE_BUCKET",
  messagingSenderId: "VOTRE_MESSAGING_SENDER_ID",
  appId: "VOTRE_APP_ID"
};
```

### 4. Règles de sécurité Firestore

Ajoutez ces règles dans la console Firebase:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Règles pour les groupes
    match /groups/{groupId} {
      allow read, write: if request.auth != null && 
        resource.data.members[request.auth.uid] != null;
    }
    
    // Règles pour les boissons
    match /groups/{groupId}/drinks/{drinkId} {
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/groups/$(groupId)).data.members[request.auth.uid] != null;
      allow create: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // Règles pour les utilisateurs
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 5. Lancer l'application
```bash
npx expo start
```

Scannez le QR code avec l'app Expo Go sur votre téléphone.

## 📱 Utilisation

### Première utilisation
1. Lancez l'app
2. Configurez votre profil (nom et avatar)
3. Créez un groupe ou rejoignez un groupe existant avec un code
4. Commencez à ajouter vos boissons!

### Créer un groupe
1. Appuyez sur "Créer un groupe"
2. Donnez un nom à votre groupe
3. Définissez les dates du festival
4. Partagez le code généré avec vos amis

### Ajouter des boissons
1. Appuyez sur "Ajouter une boisson"
2. Choisissez parmi les options rapides ou personnalisez
3. Les unités d'alcool sont calculées automatiquement
4. Vos amis verront votre ajout en temps réel

### Suivre votre consommation
- Consultez vos statistiques quotidiennes
- Surveillez les alertes de sécurité
- Comparez avec vos amis
- Consultez l'historique complet

## 🏗️ Architecture

### Structure du projet
```
src/
├── components/          # Composants réutilisables
│   ├── ui/             # Composants UI de base
│   ├── forms/          # Formulaires
│   ├── drink/          # Composants liés aux boissons
│   └── group/          # Composants liés aux groupes
├── context/            # Contextes React
├── hooks/              # Hooks personnalisés
├── navigation/         # Navigation React Navigation
├── screens/            # Écrans de l'application
├── services/           # Services Firebase
├── types/              # Types TypeScript
└── utils/              # Utilitaires
```

### Technologies utilisées
- **React Native** avec **Expo** pour le développement mobile
- **TypeScript** pour la sécurité des types
- **Firebase** pour la base de données et l'authentification
- **React Navigation** pour la navigation
- **React Hook Form** pour les formulaires
- **Date-fns** pour la manipulation des dates
- **Expo Notifications** pour les notifications push
- **Expo Haptics** pour le retour haptique

## 🔒 Sécurité

### Fonctionnalités de sécurité
- Authentification Firebase sécurisée
- Règles de sécurité Firestore strictes
- Validation des données côté client et serveur
- Alertes de consommation excessive
- Protection contre les abus

### Calcul des unités d'alcool
L'application utilise la formule standard:
```
Unités = (Volume en cl × Degré d'alcool × 0.8) / 10
```

### Seuils d'alerte
- **Modéré**: 3 unités/jour
- **Élevé**: 6 unités/jour  
- **Critique**: 10 unités/jour

## 🧪 Tests

Pour lancer les tests:
```bash
npm test
```

## 📝 Contribuer

1. Fork le projet
2. Créez votre branche (`git checkout -b feature/amazing-feature`)
3. Commit vos changements (`git commit -m 'Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrez une Pull Request

## 🚨 Avertissement

**L'abus d'alcool est dangereux pour la santé. À consommer avec modération.**

Cette application est un outil de suivi et ne remplace pas le bon sens et la responsabilité personnelle. Respectez toujours les lois locales et buvez de façon responsable.

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🤝 Support

Si vous rencontrez des problèmes:
1. Vérifiez que Firebase est correctement configuré
2. Assurez-vous que toutes les dépendances sont installées
3. Consultez les logs d'erreur
4. Créez une issue sur GitHub

---

**Développé avec ❤️ pour la sécurité et le plaisir responsable**