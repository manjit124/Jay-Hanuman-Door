# Production Cloud Run Dockerfile for WindowCut Pro
FROM node:22-slim AS builder

WORKDIR /app

# Install all dependencies needed for Vite + esbuild production bundle
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# Copy source and compile dist/index.html + dist/server.cjs (includes OTP & APITXT routes)
COPY . .
RUN mkdir -p data server/data public \
  && npm run build \
  && test -s dist/server.cjs \
  && test -s dist/index.html \
  && grep -q '/api/customer-auth/provider-status' dist/server.cjs \
  && grep -q '/api/customer-auth/send-otp' dist/server.cjs \
  && grep -q '/api/customer-auth/verify-otp' dist/server.cjs \
  && grep -q 'https://apitxt.com/api/sendOTP' dist/server.cjs \
  && ! grep -q 'require("vite")' dist/server.cjs \
  && rm -rf data/backups server/data/backups

# Lean production runtime image
FROM node:22-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/data ./data
COPY --from=builder /app/server/data ./server/data
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/firebase-applet-config.json* ./

# Cloud Run injects PORT (configured as 3000 on door-price-calculator-door-catalog); server.ts reads process.env.PORT dynamically
EXPOSE 3000

CMD ["node", "server.js"]
