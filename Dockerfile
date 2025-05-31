FROM node:18-alpine

# Install dependencies required for bcrypt and other native modules
RUN apk add --no-cache python3 make g++ git

# Create app directory
WORKDIR /app

# Copy package files for efficient layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Create uploads directory and ensure proper permissions
RUN mkdir -p /app/uploads
RUN chmod 777 /app/uploads

# Copy the rest of the application code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose the port the app runs on
EXPOSE 5000

# Create a non-root user to run the application
RUN addgroup -S appuser && adduser -S -G appuser appuser
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Command to run the application
CMD ["node", "server.js"]
