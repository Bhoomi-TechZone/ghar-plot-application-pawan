# Version Update Summary

## Version Changed
- **From:** Version Code 13, Version 1.0.8
- **To:** Version Code 14, Version 1.0.9

## Files Updated

### 1. Android (`android/app/build.gradle`)
```gradle
versionCode 14          // Changed from 10 → 14
versionName "1.0.9"     // Changed from 1.0.8 → 1.0.9
```

### 2. iOS (`ios/GharPlot.xcodeproj/project.pbxproj`)
```
CURRENT_PROJECT_VERSION = 14;     // Changed from 13 → 14
MARKETING_VERSION = 1.0.9;        // Changed from 1.0.8 → 1.0.9
```
Updated in both Debug and Release configurations.

### 3. Package.json
```json
"version": "1.0.9"                // Changed from 1.0.8 → 1.0.9
```

## Next Steps

### For Android Build:
```bash
cd android
./gradlew clean
cd ..
npx react-native run-android --variant=release
```

### For iOS Build:
```bash
cd ios
rm -rf build
pod install
cd ..
npx react-native run-ios --configuration Release
```

### For Production Release:

#### Android (Play Store):
```bash
cd android
./gradlew bundleRelease
# AAB file will be at: android/app/build/outputs/bundle/release/app-release.aab
```

#### iOS (App Store):
1. Open Xcode: `open ios/GharPlot.xcworkspace`
2. Select "Any iOS Device (arm64)" as target
3. Product → Archive
4. Distribute App → App Store Connect

## Verification Checklist
- [✅] Android versionCode: 14
- [✅] Android versionName: 1.0.9
- [✅] iOS CURRENT_PROJECT_VERSION: 14
- [✅] iOS MARKETING_VERSION: 1.0.9
- [✅] package.json version: 1.0.9

## Changes Included in This Version
- iOS notification popup fixes (shows dialog instead of navigating to EditAlert)
- iOS local fallback notification handling
- Platform import fixes in NotificationHandler
- Enhanced iOS foreground/background notification detection

---
**Date:** $(date)
**Updated By:** Automated version bump script
