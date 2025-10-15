# ☕ CozyCup Backend - Click · Collect · Coffee  

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20+-brightgreen?logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/Express.js-REST-blue?logo=express">
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-success?logo=mongodb">
  <img src="https://img.shields.io/badge/Docker-ready-blue?logo=docker">
  <img src="https://img.shields.io/badge/CI-CD--GitHub_Actions-orange?logo=githubactions">
</p>

<p align="center">
  <em>Click, Collect, Coffee - a complete backend for a modern coffee shop experience ☕</em>
</p>

---

## 🌟 Overview  

**CozyCup** is a modular, production-ready backend that powers a complete coffee-shop platform:  
**online orders, reservations, passes, and check-ins** - all built with clean, secure, and testable Node.js.

Built with clarity and developer experience in mind:
- **Fast REST API** powered by Express  
- **Secure Authentication** via JWT (RS256)  
- **MongoDB (Mongoose)** for flexible data modeling  
- **CI/CD** with GitHub Actions  
- **Containerized Deployments** using Docker  
- **Production ready** via Render cloud hosting  

---

## 🧠 Tech Stack  

| Layer | Technology |
|:------|:------------|
| **Language** | JavaScript (Node.js 20) |
| **Framework** | Express.js |
| **Database** | MongoDB + Mongoose |
| **Auth** | JWT (RS256, access + refresh) |
| **Testing** | Jest + Supertest |
| **Lint & Format** | ESLint, Prettier |
| **CI/CD** | GitHub Actions |
| **Containerization** | Docker |
| **Deployment** | Render (Docker image) |

---

## 🚀 Quick Start

Follow these simple steps to run **CozyCup Backend** locally on Windows (PowerShell) or any system with Node.js support.

---

### 🧩 Prerequisites
Before starting, make sure you have:
- [Node.js 20+](https://nodejs.org/en/download)
- [Git](https://git-scm.com/downloads)
- [MongoDB](https://www.mongodb.com/try/download/community) *(or Docker Desktop to run Mongo easily)*

---

### ⚙️ 1. Clone & Install
```powershell
git clone https://github.com/Eladgel1/CozyCup-backend.git
cd CozyCup-backend
npm ci
```

---

### 🧾 2. Configure Environment
Create a `.env` file in the project root (or copy it from an example file if one exists):

```powershell
Copy-Item .env.example .env
```

Then open `.env` and set your variables:

```dotenv
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
MONGO_URI=mongodb://localhost:27017/cozycup
CORS_ORIGIN=http://localhost:5173

JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
<your-private-key>
-----END PRIVATE KEY-----
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----
<your-public-key>
-----END PUBLIC KEY-----
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
```

💡 **Tip:** If you’re using **MongoDB Atlas**, replace `MONGO_URI` with your `mongodb+srv://...` connection string.

---

### ☕ 3. Start MongoDB
Run MongoDB locally or via Docker:

```powershell
# A) Local MongoDB
Make sure Mongo service is running

# B) Using Docker
docker run -d --name mongo -p 27017:27017 mongo:6
```

---

### 🔥 4. Start the API Server
Launch the development server (with hot reload):

```powershell
npm run dev
```

Your API will now be live at:

```
http://localhost:3000
```

**Useful endpoints:**
- Swagger Docs → http://localhost:3000/docs  
- Health Check → http://localhost:3000/health  

---

### 🧪 5. Run Tests & Lint
```powershell
npm run test
npm run lint
```

---

### 🐳 6. Run in Docker (optional)
If you prefer running the backend as a Docker container:

```powershell
# Build the Docker image
npm run docker:build

# Run the container (using your local .env)
npm run docker:run
```

Your service will be available at:
```
http://localhost:3000
```

💡 On Windows, Docker connects to your host Mongo via `host.docker.internal`.

---

✅ **Done!**  
Your CozyCup backend is now up and running locally.  
☕️ Time to brew some API magic.
