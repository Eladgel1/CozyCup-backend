# ----------------------------
# Base stage
# ----------------------------
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine AS base

# Set work directory
WORKDIR /app

# Ensure reproducible timezone/locale
ENV TZ=UTC

# Copy only manifests first
COPY package*.json ./

# ----------------------------
# Dev stage
# ----------------------------
FROM base AS dev

# Install all deps for dev (includes nodemon, eslint, jest, etc.)
RUN npm ci

# Copy source
COPY . .

# Expose app port
EXPOSE 3000

# Use non-root user where possibl
USER node

# Default command for dev
CMD ["npm", "run", "dev"]

# ----------------------------
# Prod builder
# ----------------------------
FROM base AS prod-builder

# Install only production deps
RUN npm ci --omit=dev

# Copy source
COPY . .

# ----------------------------
# Prod runtime
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
