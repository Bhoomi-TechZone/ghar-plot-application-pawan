import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import UserNotifications
import Firebase

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // ✅ STEP 1: Initialize Firebase (CRITICAL for iOS Push Notifications)
    FirebaseApp.configure()
    
    // ✅ STEP 2: Configure notification center BEFORE requesting permissions
    UNUserNotificationCenter.current().delegate = self
    
    // ✅ STEP 3: Set Firebase Messaging delegate to receive FCM tokens
    Messaging.messaging().delegate = self
    
    // ✅ STEP 4: Request notification permissions
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
      if granted {
        print("✅ iOS Notification permission granted")
      } else if let error = error {
        print("❌ iOS Notification permission error: \(error.localizedDescription)")
      } else {
        print("⚠️ iOS Notification permission denied by user")
      }
    }
    
    // ✅ STEP 5: Register for remote notifications (APNs)
    application.registerForRemoteNotifications()
    
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "Gharplot",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }
  
  // ✅ STEP 6: Handle successful APNs token registration
  func application(_ application: UIApplication,
                   didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    print("✅ APNs device token received")
    // Forward APNs token to Firebase Messaging
    Messaging.messaging().apnsToken = deviceToken
  }
  
  // ✅ STEP 7: Handle APNs token registration failure
  func application(_ application: UIApplication,
                   didFailToRegisterForRemoteNotificationsWithError error: Error) {
    print("❌ Failed to register for remote notifications: \(error.localizedDescription)")
  }
  
  // ✅ STEP 8: Firebase Messaging Delegate - Receive FCM token
  func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
    if let token = fcmToken {
      print("✅ FCM Token received: \(token)")
      // Send token to JavaScript layer via notification
      NotificationCenter.default.post(
        name: Notification.Name("FCMTokenReceived"),
        object: nil,
        userInfo: ["token": token]
      )
    }
  }
  
  // ✅ STEP 9: Handle notifications when app is in FOREGROUND
  func userNotificationCenter(_ center: UNUserNotificationCenter,
                             willPresent notification: UNNotification,
                             withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    let userInfo = notification.request.content.userInfo
    print("📩 Foreground notification received: \(userInfo)")
    
    // Show notification even when app is in foreground (banner, sound, badge)
    if #available(iOS 14.0, *) {
      completionHandler([[.banner, .sound, .badge, .list]])
    } else {
      completionHandler([[.alert, .sound, .badge]])
    }
  }
  
  // ✅ STEP 10: Handle notification TAP (user clicked on notification)
  func userNotificationCenter(_ center: UNUserNotificationCenter,
                             didReceive response: UNNotificationResponse,
                             withCompletionHandler completionHandler: @escaping () -> Void) {
    let userInfo = response.notification.request.content.userInfo
    print("🔔 Notification tapped: \(userInfo)")
    
    // Forward to React Native via Firebase Messaging
    // The JavaScript layer will handle navigation
    
    completionHandler()
  }
  
  // ✅ STEP 11: Handle remote notification when app is in BACKGROUND/KILLED state
  func application(_ application: UIApplication,
                   didReceiveRemoteNotification userInfo: [AnyHashable: Any],
                   fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
    print("📩 Remote notification received in background: \(userInfo)")
    
    // Let Firebase handle the notification
    completionHandler(.newData)
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
