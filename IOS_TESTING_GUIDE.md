# 🧪 iOS Push Notification Testing Guide

## ⚠️ Important: iOS Simulator Does NOT Support Push Notifications

**You MUST test on a real iPhone device. Simulator will NOT receive push notifications.**

---

## 🎯 Test Scenarios

### Test 1: Verify FCM Token Generation

**Objective:** Ensure iOS generates FCM token correctly

**Steps:**
1. Connect iPhone to Mac via USB
2. Open Xcode: `cd ios && open GharPlot.xcworkspace`
3. Select your iPhone from device dropdown
4. Press `Cmd + R` to run
5. Grant notification permissions when prompted
6. Check Xcode console logs

**Expected Result:**
```
✅ iOS Notification permission granted
✅ APNs device token received
✅ FCM Token received: [token starting with 'eyJh...']
✅ FCM Token retrieved: [same token]
💾 FCM Token saved to AsyncStorage
📤 Sending FCM token to backend...
✅ FCM token saved to User model
```

**Pass Criteria:**
- ✅ No errors in console
- ✅ FCM token is generated (long string starting with 'eyJh')
- ✅ Token sent to backend successfully

---

### Test 2: Firebase Console Test Notification

**Objective:** Verify Firebase can send notifications to iOS

**Steps:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: `gharplot-a1e5b`
3. Click **Cloud Messaging** in sidebar
4. Click **Send your first message** (or **New campaign**)
5. Enter:
   - **Notification title:** `Test iOS Notification`
   - **Notification text:** `This is a test from Firebase Console`
6. Click **Next**
7. Select **iOS app** as target
8. Click **Next** → **Review** → **Publish**

**Expected Result:**
- **App in Background/Closed:** Notification appears in notification center with sound
- **App in Foreground:** Notification banner appears at top

**Pass Criteria:**
- ✅ Notification received within 10 seconds
- ✅ Notification sound plays
- ✅ Notification appears in notification center
- ✅ Tapping notification opens the app

---

### Test 3: Backend API Test Notification

**Objective:** Verify backend integration works for iOS

**Steps:**
1. Get your user ID from app (login screen or AsyncStorage)
2. Use Postman or curl to send request:

```bash
curl -X POST https://gharplotbackend.gntechnology.de/api/send-notification \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "[YOUR_USER_ID]",
    "title": "Backend Test",
    "body": "Testing iOS push from backend",
    "data": {
      "type": "system",
      "testId": "123"
    }
  }'
```

3. Check iPhone for notification

**Expected Result:**
- Notification received on iPhone
- Console logs show:
  ```
  📩 FCM: FOREGROUND MESSAGE RECEIVED!
  (or)
  📩 FCM: BACKGROUND/KILLED MESSAGE RECEIVED!
  ```

**Pass Criteria:**
- ✅ Notification received from backend
- ✅ No errors in backend response
- ✅ Notification appears correctly

---

### Test 4: Reminder Notification (Production Scenario)

**Objective:** Test real-world reminder notification flow

**Steps:**
1. Login to app on iPhone
2. Create a reminder for 1 minute from now
3. Wait for reminder time
4. Check if notification appears

**Expected Result:**
- Notification appears at scheduled time
- Notification shows reminder details (client name, note, etc.)
- Tapping notification opens reminder details screen

**Console Logs:**
```
📩 FCM: BACKGROUND MESSAGE RECEIVED!
🎯 Processing admin_reminder in background...
✅ Background notification saved to local storage
📩 [BG] FCM received for alert: [reminderId]
✅ [BG] Notification reminder_[id]_[timestamp] displayed
```

**Pass Criteria:**
- ✅ Notification received at correct time
- ✅ Notification content is correct
- ✅ Tapping opens correct screen

---

### Test 5: Foreground Notification

**Objective:** Verify notifications show when app is open

**Steps:**
1. Open app on iPhone
2. Keep app in foreground (don't minimize)
3. Send test notification from Firebase Console or backend
4. Check if banner appears at top of screen

**Expected Result:**
- Notification banner slides down from top
- Banner shows for 3-5 seconds
- Sound plays (if not on silent mode)
- Banner auto-dismisses or can be swiped up

**Console Logs:**
```
📩 FCM: FOREGROUND MESSAGE RECEIVED!
📩 Foreground notification received: [notification data]
🚀 Triggering professional popup from FCM: [type]
✅ Professional popup triggered successfully
```

**Pass Criteria:**
- ✅ Banner appears while app is open
- ✅ Sound plays
- ✅ Professional popup appears (for reminders/alerts)

---

### Test 6: Background Notification

**Objective:** Verify notifications work when app is minimized

**Steps:**
1. Open app on iPhone
2. Press Home button to minimize app (do NOT force quit)
3. Send test notification
4. Check notification center

**Expected Result:**
- Notification appears in notification center
- Lock screen shows notification (if device is locked)
- Badge number increases

**Console Logs (when you reopen app):**
```
📩 FCM: BACKGROUND/KILLED MESSAGE RECEIVED!
📩 Remote notification received in background: [data]
✅ [BG] Notification [id] displayed
```

**Pass Criteria:**
- ✅ Notification received while app is in background
- ✅ Notification appears in notification center
- ✅ Tapping notification brings app to foreground

---

### Test 7: Killed State Notification

**Objective:** Verify notifications work when app is completely closed

**Steps:**
1. Open app on iPhone
2. Swipe up and force quit the app
3. Wait 10 seconds (ensure app is completely killed)
4. Send test notification from Firebase Console
5. Check notification center

**Expected Result:**
- Notification appears even though app is not running
- Tapping notification launches the app
- App opens to correct screen based on notification type

**Pass Criteria:**
- ✅ Notification received when app is killed
- ✅ Tapping notification launches app
- ✅ App navigates to correct screen

---

### Test 8: Notification Tap Navigation

**Objective:** Verify tapping notification navigates to correct screen

**Steps:**
1. Send a reminder notification with valid reminderId
2. Tap the notification
3. Check which screen opens

**Expected Result:**
- App opens (or comes to foreground)
- Navigates to reminder details screen
- Shows correct reminder information

**Console Logs:**
```
🔔 Notification tapped: [userInfo]
📤 Navigating to: EditAlert
(or)
🚀 Navigating to AdminReminderDetailsScreen
```

**Pass Criteria:**
- ✅ Correct screen opens
- ✅ Correct data is displayed
- ✅ No navigation errors

---

### Test 9: Token Refresh

**Objective:** Verify FCM token updates when it changes

**Steps:**
1. Open app
2. Note the FCM token in console
3. Reinstall the app (or delete and reinstall)
4. Open app again
5. Check if new token is generated

**Expected Result:**
- New FCM token is generated
- Token is sent to backend
- Old token is replaced in database

**Console Logs:**
```
🔄 FCM Token refreshed: [new token]
💾 New FCM Token saved to AsyncStorage
✅ FCM token saved to User model
```

**Pass Criteria:**
- ✅ New token generated after reinstall
- ✅ Backend receives updated token
- ✅ Push notifications still work with new token

---

### Test 10: Permission Denied Scenario

**Objective:** Verify app handles denied permissions gracefully

**Steps:**
1. Delete app from iPhone
2. Reinstall app
3. When permission popup appears, tap "Don't Allow"
4. Check console logs

**Expected Result:**
- App continues to work (doesn't crash)
- Console shows warning:
  ```
  ⚠️ iOS Notification permission denied by user
  ❌ Notification permissions not granted
  ```

**Pass Criteria:**
- ✅ App doesn't crash
- ✅ User is informed about notification settings
- ✅ App functionality continues (except notifications)

---

## 🔍 Debugging Tips

### Check FCM Token in AsyncStorage

Use React Native Debugger or Flipper:

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

AsyncStorage.getItem('@fcm_token').then(token => {
  console.log('Stored FCM Token:', token);
});
```

---

### Check Notification Permissions

```javascript
import messaging from '@react-native-firebase/messaging';

messaging().requestPermission().then(authStatus => {
  console.log('Permission status:', authStatus);
  // 1 = AUTHORIZED
  // 2 = DENIED
  // 0 = NOT_DETERMINED
});
```

---

### Force Token Refresh

```javascript
import messaging from '@react-native-firebase/messaging';

messaging().deleteToken().then(() => {
  return messaging().getToken();
}).then(newToken => {
  console.log('New Token:', newToken);
});
```

---

### Check Firebase Configuration

```javascript
import messaging from '@react-native-firebase/messaging';

const app = messaging().app;
console.log('Firebase App Name:', app.name);
console.log('Firebase Options:', app.options);
```

---

## 🐛 Common Issues and Solutions

### Issue: "No APNs token received"

**Symptoms:**
- Console shows: `❌ Failed to register for remote notifications`
- No FCM token generated

**Solution:**
1. Check Push Notifications capability is enabled in Xcode
2. Verify Bundle ID matches provisioning profile
3. Test on a different device
4. Regenerate provisioning profile in Apple Developer Portal

---

### Issue: "Firebase not initialized"

**Symptoms:**
- Console shows: `❌ Firebase initialization failed`
- App crashes on launch

**Solution:**
1. Verify `GoogleService-Info.plist` is in project
2. Clean build: `Product` → `Clean Build Folder` (Cmd + Shift + K)
3. Delete `DerivedData`: `rm -rf ~/Library/Developer/Xcode/DerivedData`
4. Rebuild: `cd ios && pod install && cd ..`

---

### Issue: "Token generated but notifications not received"

**Symptoms:**
- FCM token is generated
- Backend returns success
- But no notification appears on device

**Solution:**
1. Check APNs key is uploaded to Firebase Console
2. Verify Bundle ID matches in Xcode and Firebase
3. Check device is not in Do Not Disturb mode
4. Test with Firebase Console (bypasses backend)
5. Check backend payload format includes `apns` block

---

### Issue: "Notification received but app doesn't open on tap"

**Symptoms:**
- Notification appears
- Tapping does nothing or opens to wrong screen

**Solution:**
1. Check `NotificationHandler.js` has correct navigation logic
2. Verify notification payload includes correct `data` fields
3. Check console for navigation errors
4. Test with simpler notification first (no custom navigation)

---

## 📊 Success Metrics

Your iOS push notification implementation is successful if:

- ✅ **Token Generation:** FCM token generated within 5 seconds of app launch
- ✅ **Foreground:** Notifications show banner while app is open
- ✅ **Background:** Notifications appear in notification center when app is minimized
- ✅ **Killed State:** Notifications received when app is completely closed
- ✅ **Navigation:** Tapping notification navigates to correct screen
- ✅ **Backend Integration:** Backend API successfully sends notifications to iOS
- ✅ **Reliability:** 95%+ notification delivery rate
- ✅ **Speed:** Notifications received within 10 seconds of being sent

---

## 🎬 Video Testing Checklist

Record a video demonstrating:

1. ✅ App launching and requesting permissions
2. ✅ Console showing FCM token generated
3. ✅ Sending test notification from Firebase Console
4. ✅ Notification appearing on device
5. ✅ Tapping notification and app opening
6. ✅ Foreground notification showing banner
7. ✅ Background notification appearing
8. ✅ Killed state notification waking app

This video serves as proof that iOS push notifications are working correctly.

---

## 📞 Need Help?

If tests fail:

1. **Check Console Logs:** Look for specific error messages
2. **Review Setup Guide:** Ensure all steps in `IOS_PUSH_NOTIFICATION_SETUP.md` were followed
3. **Verify Firebase Config:** Check APNs key upload and Bundle ID match
4. **Test on Different Device:** Some devices may have restrictions
5. **Check Network:** Ensure device has internet connectivity

---

**Last Updated:** January 2025  
**Platform:** iOS 13.4+  
**Status:** All 10 test scenarios should pass for production readiness
