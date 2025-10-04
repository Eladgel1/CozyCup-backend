# ----------------------------
# Base stage (shared settings)
# ----------------------------
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine AS base

# Set work directory
WORKDIR /app

# Ensure reproducible timezone/locale (optional)
ENV TZ=UTC

# Copy only manifests first (layered caching)
COPY package*.json ./

# ----------------------------
# Dev stage (hot reload, all devDeps)
# ----------------------------
FROM base AS dev

# Install all deps for dev (includes nodemon, eslint, jest, etc.)
RUN npm ci

# Copy source
COPY . .

# Expose app port (align with your PORT)
EXPOSE 3000

# Use non-root user where possible (node user exists in the official image)
USER node

# Default command for dev (nodemon script already exists in package.json)
CMD ["npm", "run", "dev"]

# ----------------------------
# Prod builder (install prod deps only)
# ----------------------------
FROM base AS prod-builder

# Install only production deps
RUN npm ci --omit=dev

# Copy source (only what we need at runtime)
COPY . .

# ----------------------------
# Prod runtime (thin final image)
# ----------------------------
FROM node:${NODE_VERSION}-alpine AS prod

WORKDIR /app
ENV NODE_ENV=production

# Copy from builder
COPY --chown=node:node --from=prod-builder /app ./

# Ensure non-root
USER node

# Expose port
EXPOSE 3000

# Run app
CMD ["node", "src/index.js"]
