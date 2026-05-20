/**
 * Quick FCM Test - Add this code to test notifications easily
 * You can send notifications from Firebase Console or use this curl command
 */

// STEP 1: Get your FCM Token from the app (check console logs or Test FCM Screen)

// STEP 2: Get your Firebase Server Key
// Go to: Firebase Console → Project Settings → Cloud Messaging → Server Key

// STEP 3: Test using curl command (PowerShell):

/*
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer YOUR_FIREBASE_SERVER_KEY"
}

$body = @{
    to = "YOUR_FCM_TOKEN_HERE"
    notification = @{
        title = "Test Notification"
        body = "This is a test from Firebase!"
        click_action = "FLUTTER_NOTIFICATION_CLICK"
    }
    data = @{
        type = "test"
        message = "Testing FCM"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://fcm.googleapis.com/fcm/send" -Method Post -Headers $headers -Body $body
*/

// STEP 4: Or use this Node.js script:

/*
const admin = require('firebase-admin');
const serviceAccount = require('./path-to-your-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const message = {
  notification: {
    title: 'Test Notification',
    body: 'This is a test from Firebase!'
  },
  token: 'YOUR_FCM_TOKEN_HERE'
};

admin.messaging().send(message)
  .then((response) => {
    console.log('Successfully sent message:', response);
  })
  .catch((error) => {
    console.log('Error sending message:', error);
  });
*/

// EXPECTED RESULTS:
// ✅ Foreground (app open): Alert popup appears
// ✅ Background (app minimized): Notification in status bar
// ✅ Quit (app closed): Notification in status bar, tap opens app

export default {
  testInstructions: 'Follow steps above to test FCM notifications'
};
