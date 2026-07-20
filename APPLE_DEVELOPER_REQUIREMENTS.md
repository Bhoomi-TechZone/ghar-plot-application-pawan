# 🍎 Apple Developer Portal Requirements for iOS Push Notifications

## 📋 Overview

This document outlines the Apple Developer Portal configuration required to enable push notifications for the **Gharplot** iOS app.

---

## ✅ Prerequisites

Before you begin, ensure you have:

- [ ] **Apple Developer Account** (Individual or Organization)
- [ ] **Enrolled in Apple Developer Program** ($99/year)
- [ ] **Admin or Account Holder role** (required to manage certificates and keys)
- [ ] **Mac with Xcode installed**
- [ ] **iPhone for testing** (Push notifications don't work on Simulator)

---

## 🔑 Step 1: Create APNs Authentication Key

Apple Push Notification service (APNs) requires an authentication key to send push notifications.

### Instructions:

1. **Login to Apple Developer Portal**
   - Go to: [https://developer.apple.com/account](https://developer.apple.com/account)
   - Sign in with your Apple ID

2. **Navigate to Keys**
   - Click **Certificates, Identifiers & Profiles**
   - Select **Keys** from the left sidebar

3. **Create New Key**
   - Click the **+** button (or "Create a key")
   - Enter **Key Name:** `Gharplot Push Notifications` (or any descriptive name)
   - Check the box: ☑️ **Apple Push Notifications service (APNs)**
   - Click **Continue**

4. **Register and Download**
   - Review the key details
   - Click **Register**
   - Click **Download** to download the `.p8` file

   ⚠️ **CRITICAL:** You can only download this file **ONCE**. Save it securely!

5. **Note Important Information**
   - **Key ID:** (e.g., `ABC123DEFG`) - shown on the download page
   - **Team ID:** (e.g., `XYZ987WQR`) - found in top-right corner or Membership page
   - **File Name:** `AuthKey_ABC123DEFG.p8`

   💾 **Save these details - you'll need them for Firebase configuration**

---

## 📱 Step 2: Register App Identifier (Bundle ID)

Your app needs a unique Bundle Identifier registered with Apple.

### Instructions:

1. **Navigate to Identifiers**
   - In **Certificates, Identifiers & Profiles**
   - Select **Identifiers** from sidebar
   - Click **App IDs**

2. **Check Existing or Create New**
   
   **If your Bundle ID already exists:**
   - Search for: `com.bhoomitechzone.gharplot` or `com.bhoomitechzone.gharplot.app`
   - Click on it to edit

   **If it doesn't exist:**
   - Click **+** to create new identifier
   - Select **App IDs** → **App**
   - Click **Continue**

3. **Configure App ID**
   - **Description:** `Gharplot`
   - **Bundle ID:** Select **Explicit**
   - **Enter Bundle ID:** `com.bhoomitechzone.gharplot.app`
   
   ⚠️ **Must match GoogleService-Info.plist BUNDLE_ID**

4. **Enable Capabilities**
   - Scroll down to **Capabilities**
   - Check: ☑️ **Push Notifications**
   - (Optional) Check other capabilities your app needs (e.g., App Groups, Associated Domains)

5. **Save**
   - Click **Continue** → **Register**

---

## 🔐 Step 3: Create or Update Provisioning Profile

Provisioning profiles link your app, signing certificate, and devices for testing/distribution.

### Instructions:

1. **Navigate to Profiles**
   - In **Certificates, Identifiers & Profiles**
   - Select **Profiles** from sidebar

2. **Create New Profile**
   - Click **+** to create new profile
   - Select type:
     - **iOS App Development** (for testing on your device)
     - **App Store** (for production release)
   - Click **Continue**

3. **Select App ID**
   - Choose: `com.bhoomitechzone.gharplot.app` (the one you created/updated in Step 2)
   - Click **Continue**

4. **Select Certificate**
   - Select your development or distribution certificate
   - If you don't have one, create it following Apple's instructions
   - Click **Continue**

5. **Select Devices** (For Development Profile Only)
   - Check the devices you want to test on
   - Click **Continue**

6. **Name Profile**
   - **Profile Name:** `Gharplot Development` or `Gharplot Distribution`
   - Click **Generate**

7. **Download Profile**
   - Click **Download** to download the `.mobileprovision` file
   - Double-click the downloaded file to install it in Xcode

---

## 🔥 Step 4: Upload APNs Key to Firebase Console

Firebase needs your APNs key to send push notifications to iOS devices.

### Instructions:

1. **Login to Firebase Console**
   - Go to: [https://console.firebase.google.com](https://console.firebase.google.com)
   - Sign in with Google account linked to Firebase project

2. **Select Your Project**
   - Click on project: **gharplot-a1e5b**

3. **Navigate to Project Settings**
   - Click the **⚙️ gear icon** (top-left, next to "Project Overview")
   - Select **Project settings**

4. **Go to Cloud Messaging**
   - In the settings page, click the **Cloud Messaging** tab

5. **Scroll to iOS Configuration**
   - Find section: **Apple app configuration**
   - Locate: **APNs Authentication Key**

6. **Upload APNs Key**
   - Click **Upload**
   - Browse and select your `.p8` file (downloaded in Step 1)
   - Enter **Key ID** (from Step 1)
   - Enter **Team ID** (from Step 1)
   - Click **Upload**

7. **Verify Upload**
   - You should see: ✅ **APNs Authentication Key uploaded successfully**
   - Key ID and Team ID should be displayed

✅ **iOS app is now configured to receive push notifications from Firebase!**

---

## 🧪 Step 5: Test Configuration

### A. Verify in Xcode

1. Open Xcode project: `ios/GharPlot.xcworkspace`
2. Select **GharPlot** target
3. Go to **Signing & Capabilities** tab
4. Verify:
   - ✅ **Push Notifications** capability is enabled
   - ✅ **Background Modes** → **Remote notifications** is checked
   - ✅ **Team** is selected
   - ✅ **Bundle Identifier** matches: `com.bhoomitechzone.gharplot.app`
   - ✅ **Provisioning Profile** shows your profile name

### B. Test on Real Device

1. Connect iPhone via USB
2. Select iPhone from Xcode device dropdown
3. Build and run (Cmd + R)
4. Grant notification permissions when prompted
5. Check Xcode console for:
   ```
   ✅ APNs device token received
   ✅ FCM Token received: [long token]
   ```

### C. Send Test Notification

1. Go to Firebase Console → **Cloud Messaging**
2. Click **Send your first message**
3. Enter title and body
4. Select **iOS app** as target
5. Click **Review** → **Publish**
6. Check iPhone for notification

---

## 📊 Verification Checklist

Before marking this as complete, verify:

- [ ] APNs key (.p8 file) downloaded and saved securely
- [ ] Key ID and Team ID noted down
- [ ] App Identifier registered with Bundle ID: `com.bhoomitechzone.gharplot.app`
- [ ] Push Notifications capability enabled for App ID
- [ ] Provisioning profile created/updated with correct App ID
- [ ] Provisioning profile installed in Xcode
- [ ] APNs key uploaded to Firebase Console
- [ ] Firebase shows "APNs Authentication Key uploaded successfully"
- [ ] Xcode shows Push Notifications capability enabled
- [ ] Test notification received on real iPhone device

---

## ⚠️ Important Security Notes

1. **Never commit `.p8` file to Git**
   - Store it securely (password manager, encrypted storage)
   - Only upload to Firebase Console

2. **Key ID and Team ID are NOT secrets**
   - These can be stored in documentation
   - They're needed for Firebase configuration

3. **Provisioning profiles expire**
   - Development profiles: 1 year
   - Distribution profiles: Check expiration regularly
   - Renew before expiration to avoid interruptions

4. **APNs key never expires**
   - Once created, it works indefinitely
   - Can be revoked and recreated if compromised

---

## 🔄 Maintenance

### When to Update:

- **Provisioning Profile Expires:** Download and install new profile
- **Add New Test Devices:** Update development provisioning profile
- **Change Bundle ID:** Update App ID, provisioning profile, and Firebase config
- **APNs Key Compromised:** Revoke old key, create new one, upload to Firebase
- **Certificate Expires:** Renew distribution certificate and update profiles

---

## 🐛 Common Issues

### Issue: "Failed to register for remote notifications"

**Cause:** APNs key not uploaded or Bundle ID mismatch

**Solution:**
1. Verify APNs key is uploaded to Firebase Console
2. Check Bundle ID matches in:
   - Xcode project
   - GoogleService-Info.plist
   - Apple Developer Portal App ID
3. Regenerate provisioning profile if needed

---

### Issue: "Provisioning profile doesn't include Push Notifications"

**Cause:** App ID doesn't have Push Notifications enabled

**Solution:**
1. Go to Apple Developer Portal → Identifiers
2. Edit your App ID
3. Enable Push Notifications capability
4. Regenerate and download provisioning profile
5. Install new profile in Xcode

---

### Issue: "No valid code signing identity found"

**Cause:** Missing or expired certificates

**Solution:**
1. Go to Xcode → Preferences → Accounts
2. Select your Apple ID
3. Click "Download Manual Profiles"
4. Or create new certificate in Apple Developer Portal

---

## 📞 Support Resources

- **Apple Developer Support:** [https://developer.apple.com/support/](https://developer.apple.com/support/)
- **Firebase Support:** [https://firebase.google.com/support](https://firebase.google.com/support)
- **React Native Firebase Docs:** [https://rnfirebase.io/](https://rnfirebase.io/)

---

## 📝 Summary

### Required Files:
1. ✅ **APNs Authentication Key (.p8)** - Downloaded from Apple Developer Portal
2. ✅ **Key ID** - From APNs key download page
3. ✅ **Team ID** - From Apple Developer account
4. ✅ **Provisioning Profile** - Installed in Xcode

### Required Configurations:
1. ✅ **App ID** - Registered with Push Notifications capability
2. ✅ **APNs Key** - Uploaded to Firebase Console
3. ✅ **Xcode Project** - Push Notifications capability enabled
4. ✅ **Bundle ID** - Consistent across all platforms

### Next Steps:
1. Install CocoaPods dependencies: `cd ios && pod install`
2. Build app on real iPhone device
3. Test notifications (see IOS_TESTING_GUIDE.md)
4. Deploy to TestFlight/App Store

---

**Last Updated:** January 2025  
**Account Type:** Apple Developer Program  
**Cost:** $99/year  
**Configuration Time:** ~30 minutes
