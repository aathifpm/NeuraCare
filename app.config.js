module.exports = {
  name: "Neuracare",
  slug: "neuracare",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/TribletLogo.png",
  userInterfaceStyle: "dark",
  splash: {
    image: "./assets/images/splash.png",
    resizeMode: "contain",
    backgroundColor: "#121212"
  },
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.neuracare.app"
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#121212"
    },
    package: "com.neuracare.app"
  },
  web: {
    favicon: "./assets/favicon.png"
  },
  extra: {
    geminiApiKey: process.env.GEMINI_API_KEY,
    firebase: {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
      measurementId: process.env.FIREBASE_MEASUREMENT_ID
    },
    eas: {
      projectId: "your-project-id"
    }
  }
}