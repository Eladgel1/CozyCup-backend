# CozyCup - Click, Collect, Coffee

**CozyCup** is a compact coffee-shop backend that unifies:
- **Click & Collect** orders with pickup windows,
- **Seat reservations** with time-slot booking and QR check-in,
- **Prepaid coffee passes** (credits) with a simple wallet and redemptions.

Built for portfolio-grade quality: clean **JavaScript (Node.js)**, tests, JWT security, Docker, and CI/CD.

<p align="center"><em>Click, Collect, Coffee ☕️</em></p>

---

## Features

- **Orders (Click & Collect):** place orders against pickup windows, track status (`CONFIRMED → IN_PREP → READY → PICKED_UP`), reorder from history.
- **Seats/Slots:** host creates time slots; customers book, cancel (per policy), or **check in** via signed one-time QR.
- **Passes:** host creates **packages** (e.g., “10 espresso”); customers purchase, see **credits**, and redeem in-store or during pickup.
- **Users & Roles:** one administrative **Host**; customers with email/password login.
- **History & Reports:** per-user history (orders/bookings/redemptions); a **daily summary** endpoint for the Host.
- **Security:** JWT (RS256), role checks, input validation, rate limiting, basic audit log.

---

## Tech Stack

- **Language:** JavaScript (Node.js)
- **Runtime:** Express.js (REST)
- **Database:** MongoDB (Mongoose)
- **Auth:** JWT (RS256, access + refresh)
- **Testing:** Jest (unit), Supertest (API), `mongodb-memory-server` / Testcontainers (integration), **End-to-End** (e.g., Playwright)
- **DevOps:** Docker, Jenkins (CI/CD), Render or AWS ECS (deployment)
- **Tooling:** ESLint, Prettier, Husky, Postman/OpenAPI for API docs

---

## Getting Started (Development)

**Requirements:** Node 20+, npm, MongoDB (local or Atlas)

```bash
# 1) Install dependencies
npm install

# 2) Create env file
copy .env.example .env

# 3) Start Mongo locally (if you don't have it running)
docker run -d --name mongo -p 27017:27017 mongo:6

# 4) Run the dev server (hot reload via nodemon)
npm run dev

# 5) Run Tests
npm run test
```

---

## Environment Variables

CozyCup uses environment variables for configuration. During local development we load them from a `.env` file via [`dotenv`](https://github.com/motdotla/dotenv). In staging/production you should provide variables through the hosting platform (no `.env` committed).