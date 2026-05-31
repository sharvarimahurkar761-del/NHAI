iOS Preparation Notes for FaceAuthApp

This document explains minimal steps to improve iOS compatibility for the Vision Camera + native modules used.

1) CocoaPods / Podfile
- Ensure you run `pod install` inside `ios/` after installing native dependencies.
- If adding `@aws-sdk/client-s3` or other JS-only libs, they do not require pods. Native Vision Camera plugins and face detector require pods.

2) Permissions
- Add camera usage reason to `ios/FaceAuthApp/Info.plist`:

  <key>NSCameraUsageDescription</key>
  <string>Required for face detection and liveness verification.</string>

- Add microphone usage if audio is needed for other features.

3) Pod compatibility checks
- From project root run:

```bash
cd ios
pod install --repo-update
```

- If `pod install` fails, inspect `Podfile` for platform target (recommend minimum `platform :ios, '12.0'` or higher).

4) Vision Camera notes
- Ensure `react-native-vision-camera` is properly linked and you followed the iOS setup in their docs.
- For face detector plugin, confirm it's compatible with iOS versions and your Xcode toolchain.

5) Testing on device / simulator
- Face detection and camera preview work best on a real device. Use a physical iPhone for verification.

6) Quick checklist
- [ ] Run `pod install`
- [ ] Add `NSCameraUsageDescription`
- [ ] Build with Xcode and resolve warnings

If you want, I can add a small script to verify pods and produce a short report; tell me and I'll add it.
