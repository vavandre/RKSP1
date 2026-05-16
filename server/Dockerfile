FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src ./src
COPY .env ./
RUN mkdir -p data

EXPOSE 4000
CMD ["npm", "start"]
