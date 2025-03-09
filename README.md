# Garden of Tasks

A visualization tool that transforms your completed Asana tasks into a beautiful, growing garden. Watch your productivity bloom with an interactive isometric garden where each plant represents a completed task.

## Features

- Connect directly to Asana using your personal access token
- Automatically fetch and cache your completed tasks (up to 1 year of history)
- View tasks as beautiful plants and trees in an isometric garden
- Navigate with pan and zoom functionality
- Hover over plants to see task details
- Token persistence between sessions
- Automatic background refresh (maximum once per 5 minutes)

## Technology Stack

- React 18 + TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- PixiJS v8 for garden rendering
- Firebase for hosting and deployment

## Live Demo

Visit the live application at: [https://garden-of-accomplishments.web.app](https://garden-of-accomplishments.web.app)

## Development

### Prerequisites

- Node.js 16+ and npm
- Asana account with a personal access token
- Firebase CLI (for deployment)

### Local Setup

1. Clone the repository
```bash
git clone <repository-url>
cd garden-of-tasks
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

4. Open your browser to http://localhost:5173

### Production Build

To create a production build:
```bash
npm run build
```

This will generate optimized files in the `dist` directory.

### Deployment

The application is configured for Firebase Hosting. To deploy:

1. Install Firebase CLI if you haven't already
```bash
npm install -g firebase-tools
```

2. Login to Firebase
```bash
firebase login
```

3. Initialize Firebase (first time only)
```bash
firebase init
```
Select "Hosting" and follow the prompts, using "dist" as your public directory.

4. Deploy to Firebase
```bash
npm run build
firebase deploy --only hosting
```

## Project Structure

- `/src` - Source code
  - `/components` - React components including Garden and Asana integration
  - `/services` - API services and data handling
  - `/assets` - Static assets and resources
- `/public` - Public static files
- `/dist` - Build output (not in git)

## License

MIT License

## Acknowledgements

- [Asana API](https://developers.asana.com/docs) for task data
- [PixiJS](https://pixijs.com/) for rendering
- [Tailwind CSS](https://tailwindcss.com/) for styling
