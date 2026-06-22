# iOS Build — Provisioning Profile Fix

## Problem

Running `xcodebuild` for `BeansonMe` fails with:

```
error: No profiles for 'com.anonymous.beans-on-me' were found
```

There are two causes:

1. **Wrong bundle ID** — `com.anonymous.beans-on-me` is Expo's default placeholder. Apple has no registered app or provisioning profile for this identifier.
2. **Missing `-allowProvisioningUpdates` flag** — Without it, Xcode cannot contact the Apple Developer portal to auto-create a profile even when `CODE_SIGN_STYLE=Automatic` is set.

---

## Fix 1 — Update the bundle identifier

In `beans-on-me-app/app.json` (or `app.config.js`), change the `bundleIdentifier` under the `ios` key from the placeholder to your real identifier:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.mohamedseliem.beansonme"
    }
  }
}
```

Then regenerate the native project:

```bash
cd beans-on-me-app
npx expo prebuild --clean
```

The new bundle ID must be registered in your Apple Developer account (under **Certificates, Identifiers & Profiles → Identifiers**) before a profile can be issued.

---

## Fix 2 — Add `-allowProvisioningUpdates` to the build command

Add the flag so Xcode can reach the Apple portal and auto-create/download the profile:

```bash
cd ~/quran-companion/beans-on-me-app/ios

xcodebuild \
  -workspace BeansonMe.xcworkspace \
  -scheme BeansonMe \
  -configuration Release \
  -destination 'id=00008140-00121C5C34F2801C' \
  -derivedDataPath build-release \
  DEVELOPMENT_TEAM=VAPW79S5R6 \
  CODE_SIGN_STYLE=Automatic \
  -allowProvisioningUpdates \
  build
```

Then install:

```bash
xcrun devicectl device install app \
  --device 00008140-00121C5C34F2801C \
  build-release/Build/Products/Release-iphoneos/BeansonMe.app
```

---

## Recommended approach

Apply **both** fixes together:

1. Set a real bundle ID in `app.json` and run `expo prebuild --clean`
2. Always pass `-allowProvisioningUpdates` when building with automatic signing

This ensures the correct profile is fetched and the build succeeds on subsequent runs without manual intervention.
