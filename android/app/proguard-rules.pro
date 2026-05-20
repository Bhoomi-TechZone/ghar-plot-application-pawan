# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# React Native Reanimated v4.2.0 Worklets
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.worklets.** { *; }
-dontwarn com.swmansion.reanimated.**
-dontwarn com.swmansion.worklets.**

# Keep worklet-related native methods
-keepclassmembers class * {
    @com.swmansion.reanimated.WorkletFunction *;
}

# Keep all worklet-related classes and methods
-keep class * extends com.swmansion.reanimated.layoutReanimation.AnimationFactory { *; }
-keep class * extends com.swmansion.reanimated.transitions.Transition { *; }

# Reanimated v4.2.0 specific rules
-keep class com.swmansion.reanimated.NativeProxy { *; }
-keep class com.swmansion.reanimated.ReanimatedModule { *; }
-keep class com.swmansion.reanimated.ReanimatedPackage { *; }

# Keep setDynamicFeatureFlag and related methods
-keepclassmembers class com.swmansion.reanimated.** {
    public void setDynamicFeatureFlag(...);
    public void installCoreFunctions(...);
    public void makeShareableClone(...);
    public void scheduleOnUI(...);
}

# Firebase and FCM
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# React Native Firebase
-keep class io.invertase.firebase.** { *; }
-dontwarn io.invertase.firebase.**

# Notifee
-keep class app.notifee.** { *; }
-dontwarn app.notifee.**

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**

# AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }
-dontwarn com.reactnativecommunity.asyncstorage.**

# Vector Icons
-keep class com.oblador.vectoricons.** { *; }
-dontwarn com.oblador.vectoricons.**

# Navigation
-keep class com.reactnavigation.** { *; }
-dontwarn com.reactnavigation.**

# Picker
-keep class com.reactnativecommunity.picker.** { *; }
-dontwarn com.reactnativecommunity.picker.**

# DateTimePicker
-keep class com.reactnativecommunity.datetimepicker.** { *; }
-dontwarn com.reactnativecommunity.datetimepicker.**

# General React Native and JS engine rules
-keep class * extends com.facebook.react.ReactPackage { *; }
-keep class * extends com.facebook.react.bridge.ReactMethod { *; }
-keep class * extends com.facebook.react.bridge.JavaScriptModule { *; }
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}

# Preserve line numbers for better crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
