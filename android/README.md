# E-REPORT SAGS — Android APK (TEST)

This Android project is a **Trusted Web Activity (TWA)** launcher for
https://e-report-sags.vercel.app/. It uses the installed browser
(Chrome-compatible) instead of embedding a WebView or duplicating the
flight/report data into another local database.

## Build
The dedicated GitHub Actions workflow in
`.github/workflows/android-apk-test.yml` automatically builds an Android
debug APK for the `feature/android-apk-twa` branch. It copies the original
`assets/icons/icon-192.png` into Android resources without modifying the
original logo.

You can also build with Android SDK 35, JDK 17 and Gradle 8.11.1:
`mkdir -p android/app/src/main/res/drawable-nodpi && cp assets/icons/icon-192.png android/app/src/main/res/drawable-nodpi/ic_ereport.png && gradle -p android assembleDebug`

Build artifact: `android/app/build/outputs/apk/debug/app-debug.apk`.

## Security, compatibility and limitations
- **TEST ONLY**: The APK is debug-signed by the GitHub Actions runner; it
  must not be distributed as a production release. Rebuilds may have different
  signing certificates and require uninstalling the previous test APK.
- Until a stable release signing certificate is set and declared at
  `https://e-report-sags.vercel.app/.well-known/assetlinks.json`, Chrome
  displays a Custom Tab instead of a verified fullscreen TWA. Do not publish
  a signing private key in the public repository.
- It opens the existing production URL with unchanged Firebase Auth, App Check,
  realtime database, roster, forms, cache and PDF logic. All server-side
  restrictions continue to apply; this APK does not bypass App Check.
- The Android package does **not** magically make HTML canvas/PDF exports
  faster; it keeps Chrome file sharing/download capabilities and avoids a
  WebView-compatibility regression. Real-device PDF timing must still be measured.
- Internet access is required for first load; offline pages only work according
  to the existing PWA Service Worker cache.
- Minimum Android API 26 (Android 8). Chrome or another compatible browser
  should be installed.
