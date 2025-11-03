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

### Frontend (Client) - GitHub Pages

The frontend is configured to deploy automatically to GitHub Pages via GitHub Actions.

**Setup Steps:**
1. Go to your GitHub repository → Settings → Pages
2. Under "Source", select "GitHub Actions"
3. The workflow will automatically deploy on pushes to `main` branch (when `client/` files change)

**Configuration:**
- The workflow is located at `.github/workflows/deploy.yml`
- It automatically sets:
  - `VITE_SOCKET_SERVER_URL`: Points to your Render API
  - `VITE_BASE_PATH`: Set to `/uriah-dice-roller/` for GitHub Pages

**Note:** If your GitHub Pages URL is different (e.g., custom domain or different repo name), update `VITE_BASE_PATH` in `.github/workflows/deploy.yml`

**Alternative Deployments:**
The frontend can also be deployed to:
- Vercel
- Netlify
- Cloudflare Pages
- Any static hosting service

### Backend (Server) - Render

The backend is configured for Render deployment.

**Environment Variables (if needed):**
- `PORT`: Automatically set by Render
- `CORS_ORIGIN`: Set to your frontend URL (e.g., `https://username.github.io/uriah-dice-roller`) in Render's dashboard

**Alternative Deployments:**
- Railway
- Fly.io
- DigitalOcean App Platform
- Any Node.js hosting service
