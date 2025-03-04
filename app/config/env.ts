import { Platform } from 'react-native';

const ENV = {
  dev: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  },
  prod: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  },
};

export default __DEV__ ? ENV.dev : ENV.prod; 