# D.A — Drive Assistant

> Real-time vehicular mesh intelligence network

A live vehicle tracking and communication platform. Vehicles connect peer-to-peer via Bluetooth/Wi-Fi mesh, appear as live dots on a satellite map, and can communicate via radio talk, poke, and SOS broadcasting.

## Features (Frontend v0.1)

- 🗺️ **Live Map** — OpenStreetMap satellite view with real-time vehicle nodes
- 🚗 **Vehicle Mesh** — Animated connection lines showing mesh network topology  
- 📡 **Talk Direct** — Push-to-talk radio communication between vehicles
- 👋 **Poke** — Send a "wants to talk" notification
- 🚨 **SOS Broadcasting** — Emergency alerts with radius broadcasting
- 📍 **Vehicle Profiles** — Plate, owner, speed, fuel, route, mesh hops
- 🔍 **Search & Filter** — Find any vehicle by plate, owner, or status
- ⚡ **Live Simulation** — Vehicles move in real-time (WebSocket-ready)

## Stack

- **React 18** + Vite
- **Leaflet** + OpenStreetMap (free, no API key needed)
- **Tailwind CSS**
- **Netlify** (hosting + future serverless functions)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Netlify

1. Push to GitHub
2. Connect repo on netlify.com → "Import from Git"
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Deploy ✅

## Roadmap

- [ ] **v0.2** — Supabase real-time backend (live vehicle data)
- [ ] **v0.3** — WebRTC push-to-talk audio
- [ ] **v0.4** — Admin panel (fleet management)
- [ ] **v0.5** — Mobile app (React Native)
- [ ] **v1.0** — Hardware dongle + OBD-II integration

## License

Proprietary — © Moses Mwombe / D.A Drive Assistant
