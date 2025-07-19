# NeuraCare: AI-based Virtual Health Assistant

NeuraCare is a federated learning-driven virtual health assistant designed to provide personalized healthcare support while maintaining data privacy. The system leverages natural language processing (NLP) and machine learning within a secure, decentralized framework to deliver health advice, symptom tracking, and medication reminders without compromising sensitive user data.

## 🚀 Latest Release

**Version**: `v1.0.0`  
📦 [Download APK](https://github.com/aathifpm/NeuraCare/releases/download/V1.0.0/Neuracare.V1.0.0.apk)

## Features

- **AI-Powered Health Assistant**: Chat with an intelligent virtual assistant trained on medical knowledge
- **Symptom Tracking**: Monitor and analyze symptoms over time
- **Medication Reminders**: Never miss important medications
- **Personalized Health Insights**: Receive tailored health recommendations

## Technology Stack

- **Frontend**: React Native with Expo Go
- **UI Framework**: React Native components
- **Backend Integration**: Firebase, Realm
- **AI**: Google Generative AI
- **Storage**: Secure on-device storage with encryption

## Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/NeuraCare.git
   cd NeuraCare
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   ```bash
   cp .env.sample .env
   ```
   Then edit the `.env` file with your API keys and configuration

4. Start the development server
   ```bash
   npx expo start
   ```

## Development

The app uses Expo Router for navigation with the following structure:
- `app/` - Main application code and routes
- `components/` - Reusable UI components
- `constants/` - App constants and configuration
- `hooks/` - Custom React hooks
- `services/` - API and backend services

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Medical datasets used for training (with proper licensing)
- Open-source libraries that made this project possible
- Healthcare professionals who provided domain expertise
