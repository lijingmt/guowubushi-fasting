# React Native App Development Skill

A comprehensive guide for developing, building, and publishing React Native/Expo apps from scratch.

## Table of Contents

1. [Project Setup](#project-setup)
2. [Project Architecture](#project-architecture)
3. [Development Workflow](#development-workflow)
4. [Building for Production](#building-for-production)
5. [App Store Submission](#app-store-submission)
6. [Common Commands](#common-commands)
7. [Troubleshooting](#troubleshooting)

---

## Project Setup

### Initialize New Expo Project

```bash
# Create new Expo project
npx create-expo-app MyApp --template blank-typescript

# Navigate to project
cd MyApp

# Install dependencies
npm install

# Start development server
npx expo start
```

### Essential Dependencies

```bash
# Navigation
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack

# UI Components
npm install react-native-chart-kit
npm install react-native-svg

# Gestures & Animations
npm install react-native-gesture-handler react-native-reanimated

# Storage
npm install @react-native-async-storage/async-storage

# Expo Modules (for Expo SDK)
npx expo install expo-linear-gradient expo-haptics expo-notifications
```

### Configure TypeScript

Ensure `tsconfig.json` has proper paths and strict settings:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

---

## Project Architecture

### Recommended Folder Structure

```
src/
├── components/          # Reusable UI components
│   ├── Card.tsx
│   ├── CheckInCard.tsx
│   └── StatCard.tsx
├── screens/            # Screen components
│   ├── HomeScreen.tsx
│   ├── SettingsScreen.tsx
│   └── ...
├── navigation/         # Navigation configuration
│   └── Tabs.tsx
├── context/            # React Context for global state
│   └── AppContext.tsx
├── theme/              # Theme/styling
│   └── colors.ts
├── i18n/               # Internationalization
│   └── translations.ts
├── constants/          # App constants
│   └── achievements.ts
├── types/              # TypeScript types
│   └── index.ts
├── utils/              # Utility functions
│   └── storage.ts
└── App.tsx             # Main app component
```

### State Management Pattern

Use React Context for global state:

```typescript
// context/AppContext.tsx
interface AppContextType {
  // Settings
  settings: UserSettings;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;

  // Data
  stats: AppStats;
  checkInRecords: CheckInRecord[];

  // Theme
  colors: Colors;
  isDarkMode: boolean;
  toggleTheme: () => void;

  // i18n
  t: Translations;
  language: Language;

  // Actions
  dailyCheckIn: (completed: boolean, notes?: string) => Promise<void>;
  addMeal: (meal: Omit<MealRecord, 'id' | 'date'>) => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
export const useApp = () => useContext(AppContext)!;
```

### Navigation Pattern

Bottom Tab Navigator with Stack Navigator:

```typescript
// navigation/Tabs.tsx
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabNavigator = () => {
  const { t, colors } = useApp();

  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: t.tabHome }}
      />
      {/* More tabs... */}
    </Tab.Navigator>
  );
};
```

---

## Development Workflow

### Local Development

```bash
# Start development server
npx expo start

# Run on iOS Simulator
npx expo start --ios

# Run on Android Emulator
npx expo start --android

# Run in web browser
npx expo start --web
```

### Hot Reloading

- Press `r` in terminal to reload app
- Press `d` to open developer menu
- Enable Fast Refresh for automatic reloading

### Testing on Physical Device

1. Install **Expo Go** app on your phone
2. Scan QR code from terminal
3. App will load in Expo Go

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/new-feature

# Merge to main
git checkout main
git merge feature/new-feature
git push
```

---

## Building for Production

### Prerequisites

1. **EAS CLI**: `npm install -g eas-cli`
2. **Expo Account**: Create account at https://expo.dev
3. **Login**: `eas login`

### Configure EAS Build

Create `eas.json`:

```json
{
  "cli": {
    "version": ">= 5.2.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "ios": {
        "autoIncrement": true
      },
      "android": {
        "autoIncrement": true
      }
    }
  }
}
```

### Configure `app.json` / `app.config.js`

```javascript
export default {
  expo: {
    name: "My App",
    slug: "my-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      bundleIdentifier: "com.company.myapp",
      supportsTablet: true,
      config: {
        usesNonExemptEncryption: false
      }
    },
    android: {
      package: "com.company.myapp",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      permissions: []
    },
    extra: {
      eas: {
        projectId: "your-project-id"
      }
    }
  }
};
```

### Build Commands

```bash
# iOS Build
eas build --platform ios --profile production

# Android Build
eas build --platform android --profile production

# Build for testing (internal distribution)
eas build --platform ios --profile preview
eas build --platform android --profile preview

# Build locally (requires Xcode/Android Studio)
eas build --platform ios --local
eas build --platform android --local
```

### Monitor Build Status

```bash
# List all builds
eas build:list

# View specific build
eas build:view [BUILD_ID]

# View logs
eas build:logs [BUILD_ID]
```

---

## App Store Submission

### iOS App Store

1. **Apple Developer Account**
   - Enroll in Apple Developer Program ($99/year)
   - Create App ID in App Store Connect

2. **Prepare App Store Connect**
   - Create new app in App Store Connect
   - Fill in app information:
     - App name
     - Bundle ID (must match `ios.bundleIdentifier` in app.json)
     - SKU
     - User ID and Role

3. **Upload Build**
   - After EAS build completes, download `.ipa` file
   - Use Transporter or Xcode to upload:
     ```bash
     # Via Transporter (recommended)
     # Open Transporter, drag and drop .ipa file

     # Via Xcode
     xcrun altool --upload-app --type ios --file your-app.ipi --username "your-email" --password "app-specific-password"
     ```

4. **App Store Information**
   - Screenshots (required for all device sizes)
   - App preview videos (optional)
   - Description
   - Keywords
   - Support URL
   - Privacy Policy URL
   - Age rating

5. **Build Information**
   - Version number
   - Build number
   - SDK versions
   - Icons and launch images

6. **Review & Submit**
   - Submit for Review
   - Wait for Apple approval (usually 1-3 days)
   - Respond to any review questions

### Google Play Store

1. **Google Play Developer Account**
   - Create developer account ($25 one-time fee)
   - Pay registration fee

2. **Create App Listing**
   - Go to Google Play Console
   - Create new app
   - Fill in:
     - App name
     - Description (short and full)
     - Screenshots
     - Banner icon
     - Feature graphic
     - Privacy policy URL
     - Content rating questionnaire

3. **Upload Build**
   - After EAS build completes, download `.aab` or `.apk` file
   - Upload to Google Play Console
   - Complete content rating

4. **Release**
   - Choose release track:
     - Internal testing
     - Closed testing
     - Open testing
     - Production
   - Roll out to production

---

## Common Commands

```bash
# Development
npx expo start              # Start dev server
npx expo start --clear     # Clear cache and restart
npx expo start --web        # Run in web browser

# Building
eas build --platform ios    # Build iOS
eas build --platform android # Build Android
eas build:list             # List all builds
eas build:view [id]         # View build details

# Dependencies
npm install                 # Install dependencies
npm install --save          # Install production dependency
npm install --save-dev      # Install dev dependency
npm update                  # Update dependencies

# Git
git status                  # Check git status
git add .                   # Stage all changes
git commit -m "message"     # Commit changes
git push                    # Push to remote
git pull                    # Pull from remote

# Expo
eas login                   # Login to EAS
eas whoami                  # Show current user
expo whoami                 # Show Expo account info
```

---

## Troubleshooting

### Common Build Issues

1. **"Cannot find module"**
   ```bash
   npm install
   npx expo install --fix
   ```

2. **"Failed to build iOS"**
   - Ensure Xcode is installed
   - Update CocoaPods: `cd ios && pod install`
   - Clean build: `eas build --platform ios --local --clean`

3. **"Android build failed"**
   - Check Android SDK installation
   - Verify `android.bundleIdentifier` matches your project
   - Check keystore configuration

4. **Build stuck in queue**
   - Free tier has limited build slots
   - Upgrade to paid plan for priority builds
   - Wait for current builds to complete

### Development Issues

1. **Metro bundler issues**
   ```bash
   npx expo start --clear
   # Or kill all node processes
   pkill -9 node
   ```

2. **Expo Go not loading**
   - Ensure same Wi-Fi network
   - Check firewall settings
   - Try using tunnel connection: `npx expo start --tunnel`

3. **TypeScript errors**
   ```bash
   npm install --save-dev typescript @types/react @types/react-native
   ```

---

## Best Practices

1. **Use TypeScript** for type safety
2. **Implement proper error handling** with try-catch
3. **Add loading states** for async operations
4. **Use environment variables** for sensitive data
5. **Test on both iOS and Android** before release
6. **Keep dependencies updated** but test after updates
7. **Use Git branches** for features
8. **Document your code** with comments
9. **Follow React Native best practices** for performance
10. **Test on physical devices** before submitting

---

## Quick Start Checklist

For a new app from scratch:

- [ ] Initialize project with `npx create-expo-app`
- [ ] Install navigation and UI dependencies
- [ ] Set up folder structure
- [ ] Create AppContext for state management
- [ ] Set up navigation (tabs/stack)
- [ ] Create screen components
- [ ] Implement theme/light-dark mode
- [ ] Add i18n support
- [ ] Configure app.json with app info
- [ ] Prepare icons and splash screens
- [ ] Test on iOS Simulator
- [ ] Test on Android Emulator
- [ ] Test on physical devices
- [ ] Set up EAS Build configuration
- [ ] Create EAS project
- [ ] Build for iOS
- [ ] Build for Android
- [ ] Prepare App Store Connect listing
- [ ] Prepare Google Play Console listing
- [ ] Submit to both stores
