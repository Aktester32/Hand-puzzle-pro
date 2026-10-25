# 🧩 HandPuzzle Pro – AI-Powered AR Camera Puzzle Game

HandPuzzle Pro is an interactive browser-based Augmented Reality (AR) puzzle game built with Next.js and MediaPipe AI for real-time hand tracking. Users frame their shot using hand gestures, capture their photo, and solve dynamic sliding puzzles using pinch-to-drag gestures.

---

## 🚀 One-Click & Zero-Config Deployment Options

### 1. Deploy to Vercel (Recommended)
The project includes a ready-to-deploy [`vercel.json`](./vercel.json).
1. Push this repository to **GitHub / GitLab / Bitbucket**.
2. Go to [vercel.com/new](https://vercel.com/new).
3. Import the repository.
4. Click **Deploy** — Vercel detects Next.js automatically and builds the production bundle with zero configuration.

---

### 2. Deploy to Netlify
The project includes [`netlify.toml`](./netlify.toml) configured with the Next.js runtime plugin.
1. Push this repository to GitHub.
2. Go to [app.netlify.com](https://app.netlify.com).
3. Click **Add new site > Import an existing project**.
4. Netlify will detect `npm run build` and publish `.next` automatically.
5. Click **Deploy site**.

---

### 3. Deploy with Docker (Render, Railway, Fly.io, AWS, GCP, Azure)
The project includes a production-grade multi-stage [`Dockerfile`](./Dockerfile) and [`.dockerignore`](./.dockerignore).

**Build and run locally with Docker:**
```bash
docker build -t handpuzzle-pro .
docker run -p 3000:3000 handpuzzle-pro
```
Visit `http://localhost:3000`.

**Deploy to Render / Railway / Fly.io:**
- Connect your Git repo and select **Docker** as the environment.
- The platform will automatically build from `Dockerfile` and expose port `3000`.

---

### 4. Self-Hosted (VPS / Node.js Server)
```bash
# 1. Install dependencies
npm install

# 2. Build for production
npm run build

# 3. Start production server on port 3000
npm start
```

For persistent background execution with PM2:
```bash
npm install -g pm2
pm2 start npm --name "handpuzzle-pro" -- start
```

---

## 🛠 Local Development
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## 📷 Features & Technology Stack
- **Framework**: Next.js 16 + React 19
- **Hand Tracking**: MediaPipe Hands AI (Director's frame gesture capture & pinch-to-grab interaction)
- **Styling**: Vanilla CSS design system matching Figma mockups
- **Hosting Support**: Vercel, Netlify, Docker, Node.js standalone
