# Publishing to the App Store — Step by Step

## Prerequisites
- Apple Developer account ($99/year) enrolled at developer.apple.com
- App created in App Store Connect
- Xcode installed with your Apple ID signed in

---

## Step 1: Prepare App Metadata in App Store Connect

Go to appstoreconnect.apple.com > Your App:

- **App Information**: Name, subtitle, category (Finance), primary language
- **Pricing**: Free (since pro features are coming later)
- **App Privacy**: Fill out the privacy questionnaire (the app stores data locally only)
- **Screenshots**: Required for each device size you support
  - 6.7" (iPhone 15 Pro Max) — required
  - 6.1" (iPhone 15 Pro) — optional but recommended
  - Take screenshots from the simulator: `Cmd+S` in Simulator
- **Description**: App Store description, keywords, support URL
- **App Icon**: 1024x1024 icon (no transparency, no rounded corners — Apple rounds them)

## Step 2: Configure the Production Build

Make sure `app.config.ts` has the correct values:

```
bundleIdentifier: "com.moneytracker.app"  <- must match App Store Connect
version: "1.0.0"                          <- display version
```

## Step 3: Build with EAS (recommended)

This is the easiest path — builds in the cloud, handles signing automatically.

**Install EAS CLI:**
```bash
npm install -g eas-cli
```

**Log in:**
```bash
eas login
```

**Create `eas.json`** in `apps/mobile/`:
```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "production": {
      "ios": {
        "buildConfiguration": "Release",
        "distribution": "store"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@email.com",
        "ascAppId": "your-app-store-connect-app-id"
      }
    }
  }
}
```

**Build:**
```bash
cd apps/mobile
eas build --platform ios --profile production
```

EAS will:
- Ask to create/select a provisioning profile and distribution certificate (choose to let EAS manage it)
- Build the `.ipa` file in the cloud
- Give you a download link when done (~10-15 minutes)

## Step 4: Submit to App Store Connect

**Option A — Submit directly from EAS:**
```bash
eas submit --platform ios --latest
```
This uploads the build to App Store Connect automatically.

**Option B — Upload manually via Xcode:**
1. Download the `.ipa` from the EAS build link
2. Open Xcode > Window > Organizer (or use Transporter app from Mac App Store)
3. Drag and drop the `.ipa` to upload

## Step 5: Submit for Review

Back in App Store Connect:

1. Go to your app > App Store tab
2. Select the build you just uploaded (it appears after processing, ~5-30 min)
3. Fill in "What's New" (for first release, describe the app)
4. **Export Compliance**: Select "No" if your app doesn't use non-standard encryption (standard HTTPS is fine, select "Yes it uses encryption" then "Yes it qualifies for exemption")
5. Click "Submit for Review"

## Step 6: Wait for Review

- First review typically takes 24-48 hours
- Apple may reject with feedback — common reasons:
  - Missing privacy policy URL
  - Screenshots don't match the app
  - "Coming Soon" features that look broken (locked pro section should be fine since it's clearly labeled)
  - Crashes on launch

## Alternative: Build Locally with Xcode

If you prefer not to use EAS:

```bash
cd apps/mobile
npx expo prebuild --platform ios --clean
cd ios
pod install
open MoneyTracker.xcworkspace
```

In Xcode:
1. Select **Any iOS Device (arm64)** as target
2. Set Signing Team to your paid developer account
3. Product > Archive
4. When archive completes, click Distribute App > App Store Connect > Upload
5. Follow the prompts

---

## Checklist Before Submitting

- [ ] App icon (1024x1024) set in `assets/icon.png`
- [ ] Splash screen configured
- [ ] Version number set in `app.config.ts`
- [ ] Screenshots taken for required device sizes
- [ ] Privacy policy URL (can be a simple webpage)
- [ ] Support URL
- [ ] App description and keywords in App Store Connect
- [ ] Tested on a real device
- [ ] No crash on first launch with empty data
