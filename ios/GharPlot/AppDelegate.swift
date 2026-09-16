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
    FirebaseApp.configure()
    
    // ✅ STEP 2: Configure notification center BEFORE requesting permissions
    UNUserNotificationCenter.current().delegate = self
    
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
    Messaging.messaging().apnsToken = deviceToken
  }
  
  // ✅ STEP 7: Handle APNs token registration failure
  func application(_ application: UIApplication,
                   didFailToRegisterForRemoteNotificationsWithError error: Error) {
    print("❌ Failed to register for remote notifications: \(error.localizedDescription)")
  }
  
  func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
    if let token = fcmToken {
      print("✅ FCM Token received: \(token)")
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
    Messaging.messaging().appDidReceiveMessage(userInfo)

    // Local fallback notifications should always be shown as banners
    if isLocalFallback(in: userInfo) {
      print("✅ Showing local fallback notification as banner")
      
      if #available(iOS 14.0, *) {
        completionHandler([.banner, .sound, .badge, .list])
      } else {
        completionHandler([.alert, .sound, .badge])
      }
      return
    }

    // Data-only FCM push (no aps.alert) — schedule a local notification to
    // show the banner. Suppress the silent push itself (completionHandler([])).
    if !hasVisibleAlert(in: userInfo) {
      print("📲 Data-only FCM push in foreground — scheduling local fallback")
      scheduleLocalNotification(from: userInfo)
      completionHandler([])
      return
    }
    
    // Regular FCM push with alert — show it directly
    if #available(iOS 14.0, *) {
      completionHandler([.banner, .sound, .badge, .list])
    } else {
      completionHandler([.alert, .sound, .badge])
    }
  }
  
  // ✅ STEP 10: Handle notification TAP (user clicked on notification)
  func userNotificationCenter(_ center: UNUserNotificationCenter,
                             didReceive response: UNNotificationResponse,
                             withCompletionHandler completionHandler: @escaping () -> Void) {
    let userInfo = response.notification.request.content.userInfo
    print("🔔 Notification tapped: \(userInfo)")
    Messaging.messaging().appDidReceiveMessage(userInfo)
    
    completionHandler()
  }
  
  // ✅ STEP 11: Handle remote notification when app is in BACKGROUND/KILLED state
  func application(_ application: UIApplication,
                   didReceiveRemoteNotification userInfo: [AnyHashable: Any],
                   fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
    print("📩 Remote notification received in background: \(userInfo)")
    Messaging.messaging().appDidReceiveMessage(userInfo)
    
    // Skip if this is already a local fallback (avoids double-scheduling)
    guard !isLocalFallback(in: userInfo) else {
      completionHandler(.noData)
      return
    }

    if !hasVisibleAlert(in: userInfo) {
      print("📲 Data-only FCM push in background — scheduling local fallback")
      scheduleLocalNotification(from: userInfo)
    }

    completionHandler(.newData)
  }

  private func hasVisibleAlert(in userInfo: [AnyHashable: Any]) -> Bool {
    guard let aps = userInfo["aps"] as? [AnyHashable: Any] else { return false }
    return aps["alert"] != nil
  }

  /// Returns true for local notifications we synthesised from a data-only FCM push.
  /// The value is stored as Int 1 (not Bool true) by UNNotificationContent.userInfo,
  /// so we must check for both.
  private func isLocalFallback(in userInfo: [AnyHashable: Any]) -> Bool {
    let val = userInfo["gharplot.localFallback"]
    if let boolVal = val as? Bool { return boolVal }
    if let intVal = val as? Int { return intVal == 1 }
    if let strVal = val as? String { return strVal == "1" || strVal == "true" }
    return false
  }

  private func scheduleLocalNotification(from userInfo: [AnyHashable: Any]) {
    let content = UNMutableNotificationContent()
    content.title = (userInfo["title"] as? String) ?? "Gharplot Reminder"
    content.body = (userInfo["body"] as? String) ?? (userInfo["reason"] as? String) ?? "You have a new reminder"
    content.sound = .default
    
    // Prefix the identifier so it never collides with the original FCM message
    let msgId = (userInfo["gcm.message_id"] as? String) ?? UUID().uuidString
    let identifier = "local-fallback-\(msgId)"

    // Mark as local fallback so willPresent shows it as a banner
    // and didReceiveRemoteNotification skips re-processing it
    var localUserInfo: [AnyHashable: Any] = [:]
    for (k, v) in userInfo { localUserInfo[k] = v }
    localUserInfo["gharplot.localFallback"] = 1
    if localUserInfo["gcm.message_id"] == nil {
      localUserInfo["gcm.message_id"] = msgId
    }
    content.userInfo = localUserInfo

    // Use a slightly longer delay so the app's foreground willPresent can
    // present it properly as a banner (0.1s is too tight on some devices)
    let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 0.5, repeats: false)

    let request = UNNotificationRequest(
      identifier: identifier,
      content: content,
      trigger: trigger
    )

    UNUserNotificationCenter.current().add(request) { error in
      if let error = error {
        print("❌ Failed to schedule local fallback notification: \(error.localizedDescription)")
      } else {
        print("✅ Local fallback notification scheduled: \(identifier)")
      }
    }
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
