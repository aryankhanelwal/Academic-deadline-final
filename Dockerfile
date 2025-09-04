# Use the official Node.js runtime as the base image
FROM node:18-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create a non-root user to run the application
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Set the working directory in the container
WORKDIR /app

# Change ownership of the app directory to the nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to nodejs user before installing dependencies
USER nodejs

# Copy package.json and package-lock.json (if available)
COPY --chown=nodejs:nodejs package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy the rest of the application code
COPY --chown=nodejs:nodejs . .

# Expose the port the app runs on
EXPOSE 3000

# Define environment variable
ENV NODE_ENV=production

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Command to run the application
CMD ["node", "server.js"]
