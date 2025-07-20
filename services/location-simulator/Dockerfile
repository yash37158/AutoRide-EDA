    # The Definitive Dockerfile for a Monorepo

    FROM node:18-alpine

    WORKDIR /app

    ARG service_name

    # Copy the package.json for the service
    COPY services/${service_name}/package*.json ./

    # Install dependencies for that service
    RUN npm install

    # Copy the tsconfig for that service
    COPY services/${service_name}/tsconfig.json ./

    # Copy all source code, including the shared code
    COPY services/${service_name}/src ./src
    COPY services/shared ./shared

    # Run the build
    RUN npm run build

    CMD ["npm", "start"]
