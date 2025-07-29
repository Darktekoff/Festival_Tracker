# 🎪 Festival Tracker

> Track your drinks, stay safe, party smart!

Festival Tracker is a React Native app designed for festival-goers to monitor their alcohol consumption with smart session detection and group statistics.

## ✨ Features

### 🍺 Smart Drink Tracking
- Track alcoholic and non-alcoholic beverages
- Automatic alcohol unit calculation
- Quick-add buttons for favorite drinks
- Custom drink creation

### 🎯 Festival-Optimized Sessions
- **Smart session detection**: New session after 4+ hours pause
- **Sleep detection**: Integrates pedometer data to detect physical inactivity
- Session-based statistics instead of daily limits
- Perfect for multi-day festivals

### 👥 Group Features
- Real-time group statistics
- Compare your consumption with group average
- Member location sharing
- Group chat functionality

### 🎨 User Experience
- Dark/Light theme support
- Offline mode with sync
- Festival lineup integration
- Activity feed with fun messages

### 🔒 Safety First
- Blood alcohol estimation
- Consumption speed analysis
- Alert system for dangerous levels
- Hydration reminders

## 📱 Screenshots

*Coming soon*

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI
- Android Studio (for Android) or Xcode (for iOS)

### Installation

```bash
# Clone the repository
git clone https://github.com/Darktekoff/Festival_Tracker.git
cd Festival_Tracker

# Install dependencies
npm install

# Start the development server
npx expo start
```

### Building for Production

```bash
# Build APK for Android
npx eas build --platform android --profile preview

# Build for iOS
npx eas build --platform ios --profile preview
```

## 🧪 Testing

The app includes a comprehensive test suite with 59 tests covering:
- Performance (10K drinks, 1K users)
- Festival weekend simulations
- Edge cases and error handling
- 80%+ code coverage

```bash
# Run all tests
npm test

# Run with coverage
npm run test:full

# Run specific test suites
npm run test:calculations
npm run test:performance
npm run test:festival
```

## 🛠️ Tech Stack

- **Frontend**: React Native + Expo
- **State Management**: React Context + Hooks
- **Backend**: Firebase (Firestore, Auth, Storage)
- **Testing**: Vitest + Happy DOM
- **Styling**: React Native StyleSheet
- **Navigation**: React Navigation

## 📂 Project Structure

```
src/
├── components/     # Reusable UI components
├── screens/        # App screens
├── hooks/          # Custom React hooks
├── services/       # Business logic & Firebase
├── utils/          # Helper functions
├── types/          # TypeScript definitions
└── __tests__/      # Test suites
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with React Native and Expo
- Firebase for backend services
- Icons from Ionicons
- Created for festival lovers, by festival lovers

---

**⚠️ Drink Responsibly**: This app is a tool to help monitor consumption. Always prioritize your safety and follow local laws regarding alcohol consumption.

