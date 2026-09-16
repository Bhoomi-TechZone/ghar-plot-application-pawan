# iOS Notification Popup Test Checklist

## Prerequisites
- [ ] Clean build: `cd ios && rm -rf build Pods && pod install && cd ..`
- [ ] Fresh install: Delete app from device/simulator
- [ ] Run: `npx react-native run-ios`
- [ ] Backend ready to send notifications to alert ID: `6aa12929cf1b8e62c220fd02`

## Test Scenario 1: Foreground Notification
**Goal:** Popup appears immediately when notification arrives while app is open

### Steps:
1. [ ] Open app on iOS device/simulator
2. [ ] Keep app in **foreground** (don't minimize)
3. [ ] Trigger alert from backend (send FCM to the logged-in user)
4. [ ] Observe logs in Metro bundler

### Expected Logs:
```
📩 Foreground notification received: [...gharplot.localFallback: 1...]
✅ Showing local fallback notification as banner
🚨🚨🚨 [FG] Local Notification DELIVERED (Event 3)
🍎 iOS local fallback notification delivered in foreground
📦 Notification data: {...}
✅ Triggering iOS local fallback popup now
✅ iOS local fallback popup triggered on DELIVERED event
🚨🚨🚨 [DEBUG APP] 🔔 SHOWING ADMIN POPUP NOW: <title>
```

### Expected UI:
- [ ] Notification banner appears at top of screen
- [ ] **Popup dialog appears** over the app (indigo/red theme based on alert type)
- [ ] Popup shows alert title, reason, time
- [ ] Popup has "Edit" and "Close" buttons

### ❌ Should NOT Happen:
- [ ] NO navigation to EditAlert screen
- [ ] NO duplicate popups

---

## Test Scenario 2: Background Notification Tap
**Goal:** Popup appears when user taps notification from notification center

### Steps:
1. [ ] Open app on iOS device/simulator
2. [ ] Press **Home button** or swipe up (app goes to background)
3. [ ] Trigger alert from backend
4. [ ] Wait for notification banner to appear
5. [ ] **Tap the notification banner**
6. [ ] Observe logs

### Expected Logs (when notification arrives):
```
📩 Remote notification received in background: {...}
📲 Data-only FCM push in background — scheduling local fallback
✅ Local fallback notification scheduled: local-fallback-<id>
```

### Expected Logs (when tapped):
```
🔔 Notification tapped: {...gharplot.localFallback: 1...}
✅ User tapped notification in background - storing for navigation
🍎 iOS local fallback notification tapped — showing popup instead of navigating
📦 Notification data: {...}
✅ Popup triggered from iOS local fallback tap (via NotificationHandler)
🚀 TRIGGER POPUP - Processing now!
✅ App ready, triggering popup for ID: 6aa12929cf1b8e62c220fd02
🚨🚨🚨 [DEBUG APP] 🔔 SHOWING ADMIN POPUP NOW: <title>
```

### Expected UI:
- [ ] App comes to foreground
- [ ] **Popup dialog appears** (NOT EditAlert screen)
- [ ] Popup is fully interactive
- [ ] Can tap "Edit" to navigate to EditAlert
- [ ] Can tap "Close" to dismiss

### ❌ Should NOT Happen:
- [ ] NO direct navigation to EditAlert screen
- [ ] NO blank screen or loading screen
- [ ] NO double popups

---

## Test Scenario 3: Killed State Notification Tap
**Goal:** Popup appears after app launches from killed state

### Steps:
1. [ ] **Force close app** (swipe up from app switcher)
2. [ ] Trigger alert from backend
3. [ ] Wait for notification banner to appear
4. [ ] **Tap the notification banner**
5. [ ] Wait for app to fully launch
6. [ ] Observe logs

### Expected Logs:
```
🚀 App opened from killed state by notification
📱 Initial Notification: {...}
✅ Cancelled only tapped notification: <id>
💾 Storing popup data for: iOS local fallback
💾 Popup data stored directly from notification tap
--- (app initialization logs) ---
🎬 App came to FOREGROUND - Checking pending notifications
📨 Found pending notification: Trigger Popup
🚀 TRIGGER POPUP - Processing now!
⏳ Waiting for app readiness (nav: false, callback: false). Attempt 1
⏳ Waiting for app readiness (nav: false, callback: true). Attempt 2
✅ App ready, triggering popup for ID: 6aa12929cf1b8e62c220fd02
🚨🚨🚨 [DEBUG APP] 🔔 SHOWING ADMIN POPUP NOW: <title>
```

### Expected UI:
- [ ] App launches
- [ ] Splash screen appears
- [ ] App loads to main screen
- [ ] **Popup dialog appears** (after 1-2 seconds)
- [ ] Popup is fully interactive

### ❌ Should NOT Happen:
- [ ] NO direct navigation to EditAlert screen
- [ ] NO stuck on splash screen
- [ ] NO popup getting stuck/frozen

---

## Debugging Tips

### If popup doesn't appear in FOREGROUND:
1. Check if `global.triggerProfessionalReminder` is defined:
   ```javascript
   console.log('Popup function defined:', !!global.triggerProfessionalReminder);
   ```
2. Look for this log: `✅ Triggering iOS local fallback popup now`
3. If you see `⏳ Waiting for global.triggerProfessionalReminder`, the retry logic is working
4. After 5 failed attempts, you'll see: `❌ global.triggerProfessionalReminder not defined after 5 attempts`

### If popup doesn't appear on BACKGROUND TAP:
1. Check pending notification data:
   ```javascript
   import AsyncStorage from '@react-native-async-storage/async-storage';
   AsyncStorage.getItem('pendingNotificationData').then(d => console.log('Pending:', d));
   ```
2. Look for: `💾 Popup data stored directly from notification tap`
3. Check AppState handler logs: `🎬 App came to FOREGROUND`

### If navigation happens instead of popup:
1. Verify `gharplot.localFallback` flag in notification data
2. Check if iOS local fallback detection is working:
   - Should see: `🍎 iOS local fallback detected`
3. Ensure `return;` statement after popup trigger is not being bypassed

### Common Issues:
- **Popup appears twice:** Check deduplication bridge (`global.lastGlobalReminderId`)
- **No logs at all:** Check if Notifee is initialized properly
- **Notification doesn't show banner:** Check AppDelegate.swift completion handler
- **App crashes:** Check for syntax errors or missing imports

---

## Success Criteria
✅ All 3 test scenarios pass  
✅ Popup appears in all cases (no EditAlert navigation)  
✅ No duplicate popups  
✅ Logs show iOS local fallback detection  
✅ Android still works (unchanged behavior)  

## Failure Recovery
If tests fail:
1. Check logs in Metro bundler for error messages
2. Review NotificationHandler.js for syntax errors
3. Verify Platform import is present
4. Check AppDelegate.swift is setting `gharplot.localFallback: 1`
5. Ensure notification payload has proper data structure

---

## Additional Debug Commands
```javascript
// In Metro bundler console or app code:

// Check global popup function
console.log('Popup function:', !!global.triggerProfessionalReminder);

// Check pending data
AsyncStorage.getItem('pendingNotificationData').then(d => console.log('Pending:', d));

// Clear pending data
AsyncStorage.removeItem('pendingNotificationData');

// Test popup manually
global.debugAppReminders.testPopupNow();
```
