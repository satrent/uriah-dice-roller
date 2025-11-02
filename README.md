# Uriah's Dice Roller

A collaborative, real-time dice rolling application for tabletop RPGs.

## Project Structure

```
uriah-dice-roller/
├── client/          # React frontend (Vite)
│   ├── src/
│   ├── public/
│   └── package.json
└── server/          # Node.js backend (Express + Socket.IO)
    ├── server.js
    └── package.json
```

## Getting Started

### Prerequisites
- Node.js installed

### Installation

1. Install backend dependencies:
   ```powershell
   cd server
   npm install
   ```

2. Install frontend dependencies:
   ```powershell
   cd ../client
   npm install
   ```

### Running Locally

**Option 1: Use the startup script (recommended)**
```powershell
.\start-dev.ps1
```

**Option 2: Run manually**

Terminal 1 - Backend:
```powershell
cd server
npm start
```

Terminal 2 - Frontend:
```powershell
cd client
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Configuration

### Frontend Environment Variables

Create a `.env.local` file in the `client/` directory:

```
VITE_SOCKET_SERVER_URL=http://localhost:3001
```

For production, set `VITE_SOCKET_SERVER_URL` to your deployed backend URL.

## Deployment

### Frontend (Client)
The frontend can be deployed to:
- Vercel
- Netlify
- Cloudflare Pages
- Any static hosting service

Build command: `npm run build` (in client directory)

### Backend (Server)
The backend can be deployed to:
- Railway
- Render
- Fly.io
- DigitalOcean App Platform
- Any Node.js hosting service

Make sure to set the CORS origin to your frontend URL in production!
