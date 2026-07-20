# ⚠️ Bundle ID Mismatch - Quick Fix Guide

## 🔍 Problem Detected

There's a **Bundle Identifier mismatch** between your configuration files:

| File | Bundle ID |
|------|-----------|
| **app.json (ios)** | `com.bhoomitechzone.gharplot` |
| **GoogleService-Info.plist** | `com.bhoomitechzone.gharplot.app` |

This mismatch will prevent iOS push notifications from working.

---

## ✅ Solution: Update app.json (Recommended)

This is the **easiest and recommended** solution.

### Step 1: Update app.json

Open `app.json` and change:

```json
{
  "expo": {
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.bhoomitechzone.gharplot.app"
    }
  }
}
```

**Note:** Changed from `com.bhoomitechzone.gharplot` to `com.bhoomitechzone.gharplot.app`

---

### Step 2: Update Xcode

1. Open Xcode: `cd ios && open GharPlot.xcworkspace`
2. Select **GharPlot** project in left sidebar
3. Select **GharPlot** target
4. Go to **Signing & Capabilities** tab
5. Change **Bundle Identifier** to: `com.bhoomitechzone.gharplot.app`

---

### Step 3: Verify Match

After changes, verify all files match:

```bash
# Check app.json
grep "bundleIdentifier" app.json

# Check GoogleService-Info.plist
grep "BUNDLE_ID" ios/GharPlot/GoogleService-Info.plist

# Check Xcode project (after opening in Xcode)
# Should show: com.bhoomitechzone.gharplot.app
```

**All three should show:** `com.bhoomitechzone.gharplot.app`

---

## 🔄 Alternative: Update Firebase Configuration (Advanced)

If you prefer to keep `com.bhoomitechzone.gharplot` (without `.app`):

### Step 1: Add New iOS App in Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: **gharplot-a1e5b**
3. Click **⚙️ Settings** → **Project Settings**
4. Scroll to **Your apps**
5. Click **Add app** → **iOS**
6. Enter Bundle ID: `com.bhoomitechzone.gharplot` (without `.app`)
7. Click **Register app**

---

### Step 2: Download New GoogleService-Info.plist

1. Continue through Firebase setup wizard
2. Download the new `GoogleService-Info.plist`
3. Replace existing file:
   ```bash
   # Backup current file first
   cp ios/GharPlot/GoogleService-Info.plist ios/GharPlot/GoogleService-Info.plist.backup
   
   # Replace with new file
   # (Download from Firebase, then drag to ios/GharPlot/ folder)
   ```

---

### Step 3: Upload APNs Key Again

You'll need to upload your APNs key for the new iOS app:

1. In Firebase Console → Project Settings → Cloud Messaging
2. Find your new iOS app (com.bhoomitechzone.gharplot)
3. Upload APNs Authentication Key (.p8)
4. Enter Key ID and Team ID

---

## 🎯 Which Solution Should I Choose?

### ✅ Choose **Solution 1** (Update app.json) if:
- You haven't published to App Store yet
- You don't mind changing bundle ID
- You want the quickest fix (5 minutes)

### ⚠️ Choose **Solution 2** (Update Firebase) if:
- App is already published on App Store
- You need to keep the original bundle ID
- You're comfortable with Firebase Console (15 minutes)

---

## 🧪 After Applying Fix

Verify the fix worked:

### Test 1: Build & Run
```bash
cd ios
pod install
cd ..
# Open in Xcode and build
```

### Test 2: Check Console Logs
Look for:
```
✅ APNs device token received
✅ FCM Token received: eyJhbGci...
```

If you see these logs, **the fix worked!** ✅

### Test 3: Send Test Notification
1. Firebase Console → Cloud Messaging
2. Send test message to iOS app
3. Check if notification appears on iPhone

---

## 📋 Implementation for Solution 1 (Recommended)

I can implement Solution 1 for you right now. Here's what will change:

### File: app.json
```json
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "com.bhoomitechzone.gharplot.app"  // ← This line
}
```

### You'll need to:
1. Open Xcode
2. Change Bundle Identifier manually to match

Would you like me to update app.json now? This is the recommended solution unless your app is already on the App Store.

---

## ⚠️ Important Notes

### If App is Already on App Store:
- **DO NOT** change Bundle ID in a published app
- Use **Solution 2** (update Firebase configuration)
- Bundle ID change would require new app submission

### If App is NOT Yet Published:
- **Use Solution 1** (update app.json)
- Much simpler and faster
- No impact on development

---

## 🔍 How to Check Current Status

### Check if app is published:
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Check if Gharplot app exists
3. If it exists, note the Bundle ID shown there

### If app exists on App Store:
- Bundle ID shown there is the **correct one to use**
- Update Firebase configuration to match that Bundle ID
- Do NOT change app.json Bundle ID

### If app does NOT exist on App Store:
- You're free to change Bundle ID
- Update app.json to match GoogleService-Info.plist
- Simpler and faster solution

---

## 🎉 Summary

**Problem:** Bundle ID mismatch between app.json and Firebase  
**Impact:** iOS push notifications won't work  
**Solution 1:** Update app.json (5 min) ✅ **Recommended for new apps**  
**Solution 2:** Update Firebase config (15 min) ✅ **Required for published apps**  

**Next Step:** Check if app is published on App Store, then choose appropriate solution.

---

**Last Updated:** January 2025  
**Status:** Action Required Before Testing  
**Severity:** High (blocks iOS push notifications)
