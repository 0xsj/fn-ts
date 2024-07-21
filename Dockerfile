# Base image for common dependencies
ARG NODE_VERSION=20.15.0
FROM node:${NODE_VERSION}-alpine AS deps

# Set environment variable for Node.js environment
ARG NODE_ENV
ENV NODE_ENV=${NODE_ENV}

# Set the working directory
WORKDIR /app

# Copy package.json and yarn.lock (or package-lock.json) to the container
COPY . .

# Install dependencies
RUN yarn install