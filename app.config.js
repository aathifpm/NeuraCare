import 'dotenv/config';

export default {
  expo: {
    name: "Neuracare",
    slug: "neuracare",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/ai-avatar.png",
    scheme: "neuracare",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.neura.neuracare"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/ai-avatar.png",
        backgroundColor: "#000000"
      },
      package: "com.neura.neuracare"
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/ai-avatar.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#000000"
        }
      ],
      "expo-secure-store"
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      eas: {
        projectId: "55c55acd-521c-4472-870c-f08d59abf1c4"
      },
      owner: "aathif123",
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
      FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
      FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
      FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
      FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID,
    }
  }
  
};