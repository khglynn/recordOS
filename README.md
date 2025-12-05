# Record OS

A nostalgic music visualization app styled as a Windows 95 desktop with a grungy Matrix aesthetic.

See your most-loved Spotify albums ranked by saved tracks, play music with retro visualizers, and waste time on classic games.

## Features

- **Album Grid**: Your Spotify library displayed as album covers filling the desktop
- **Track Lists**: Click any album to see tracks, with liked songs highlighted
- **Media Player**: Windows Media Player-style player with visualizations
- **Games**: Minesweeper, Solitaire, and Snake embedded via iframe
- **Threshold Control**: Filter albums by minimum # of liked tracks (3-10 or ALL)
- **Sorting**: By release date, artist, album name, or # of liked tracks
- **Local Demo Mode**: Play stock music before logging in

## Tech Stack

- **Vite + React 18**
- **React95** - Windows 95 UI components
- **styled-components** - CSS-in-JS
- **Butterchurn** - Milkdrop visualizer (WebGL)
- **Spotify Web Playback SDK** - Premium playback
- **Spotify Web API** - Library and audio analysis

## Getting Started

### Prerequisites

- Node.js 18+
- Spotify Premium account (for playback)
- Spotify Developer App with client ID

### Setup

1. Clone and install:
   ```bash
   git clone https://github.com/khglynn/recordOS.git
   cd recordOS
   npm install
   ```

2. Update Spotify Client ID in `src/utils/spotify.js`:
   ```js
   export const SPOTIFY_CLIENT_ID = 'your-client-id-here';
   ```

3. Add redirect URIs to your Spotify App:
   - Development: `http://127.0.0.1:5173/callback`
   - Production: `https://your-domain.vercel.app/callback`

4. Run development server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:5173

## Project Structure

```
recordOS/
├── public/
│   ├── logo.png              # Record OS logo
│   ├── music/                # Demo tracks for pre-login
│   └── callback.html         # OAuth redirect handler
├── src/
│   ├── components/
│   │   ├── Desktop.jsx       # Album grid background
│   │   ├── Taskbar.jsx       # Win95 taskbar
│   │   ├── StartMenu.jsx     # Sort, games, info, logout
│   │   ├── LoginModal.jsx    # Spotify OAuth
│   │   ├── TrackListModal.jsx # Album track list
│   │   ├── MediaPlayer.jsx   # WMP-style player
│   │   ├── GameWindow.jsx    # Embedded games
│   │   └── InfoModal.jsx     # About/contact
│   ├── hooks/
│   │   ├── useSpotify.js     # Spotify auth, library, playback
│   │   └── useLocalAudio.js  # Pre-login audio playback
│   ├── utils/
│   │   ├── spotify.js        # Spotify API helpers
│   │   └── constants.js      # App configuration
│   ├── styles/
│   │   ├── theme.js          # Custom React95 theme
│   │   └── GlobalStyles.js   # Base CSS
│   ├── App.jsx               # Main app component
│   └── main.jsx              # Entry point
├── vercel.json               # Vercel deployment config
└── package.json
```

## Deployment

Deploy to Vercel:

```bash
npm run build
vercel --prod
```

Remember to:
1. Set environment variables if needed
2. Add production redirect URI to Spotify App

## Credits

- **React95**: https://react95.io/
- **Butterchurn**: https://butterchurnviz.com/
- **Games**: minesweeper.online, solitr.com, playsnake.org

## License

MIT
