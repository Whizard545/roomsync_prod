FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Create directories for uploads and database
RUN mkdir -p uploads database

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S roomsync -u 1001
RUN chown -R roomsync:nodejs /app
USER roomsync

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the server
CMD ["npm", "run", "start:server"]
