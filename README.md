# PingPong Dashboard 🏓

A real-time microservices monitoring dashboard with Chaos Monkey capabilities.

## 🎯 Project Status

| Service | Port | Status | Health |
|---------|------|--------|--------|
| Auth | 3001 | ✅ Running | [GET /health](http://localhost:3001/health) |

## 🏗️ Architecture
┌─────────────┐
│ React │
│ Frontend │
└──────┬──────┘
│
┌──────▼─────────────────────────────────────┐
│ Aggregator API │
│ (Status Aggregation & Chaos) │
└──────┬─────────────────────────────────────┘
│
├──────────► Auth Service (3001) ✅
├──────────► Payment Service (3002) ⏳
└──────────► Notification Service (3003) ⏳


## 📅 Daily Progress

### Day 1 (Feb 15, 2026)
- ✅ Created GitHub repository
- ✅ Initialized auth microservice
- ✅ Added health check endpoint
- ✅ Configured middleware and error handling
- ✅ Set up environment variables

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/Avinash12344/Pingpong-Dashboard.git

# Install dependencies
cd services/auth
npm install

# Run auth service
npm run dev

## 🚀 Run All Services
npm run install:all
npm run dev:all