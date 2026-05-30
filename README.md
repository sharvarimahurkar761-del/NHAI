This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
## FaceAuth Attendance App

This project includes an offline-first face recognition attendance flow with an Android-first React Native implementation.

### Key features

- Live camera preview with `react-native-vision-camera`
- Placeholder face detection / frame processor events
- Liveness prompts: blink, turn head left, turn head right
- Local SQLite storage for attendance records
- Connectivity detection using `@react-native-netinfo/netinfo`
- Sync pending attendance records to a mock AWS S3 service
- Purge synced records after successful upload
- Clean UI with offline status and loading states

### Setup instructions

1. Install dependencies:
   ```sh
   npm install
   ```
2. Install native pods for iOS (optional):
   ```sh
   cd ios && pod install
   ```
3. Start Metro:
   ```sh
   npm start
   ```
4. Run on Android:
   ```sh
   npm run android
   ```

### Android notes

- Camera permission is added in `android/app/src/main/AndroidManifest.xml`
- `react-native-vision-camera` is configured in `babel.config.js`
- Android 8+ support is the target platform

### Architecture overview

- `src/screens` contains the app screens for home and camera flow
- `src/components` holds reusable UI pieces like sync status and liveness prompts
- `src/services` implements storage, mock upload, and attendance logic
- `src/database` initializes and manages the SQLite database
- `src/hooks` contains connectivity detection logic
- `src/utils` holds shared helpers and TypeScript types

### Sync / purge flow

1. Attendance is saved locally in SQLite as unsynced records
2. NetInfo detects internet restoration
3. The app uploads pending records to a mock S3 service
4. Records are marked as synced and then purged from local storage

### Common issues

- If the camera preview does not appear, rebuild the app after installing dependencies.
- If SQLite initialization fails, verify the `react-native-sqlite-storage` autolinking and Android build settings.
- If Vision Camera frame processor does not start, make sure `babel.config.js` includes the Vision Camera plugin.
