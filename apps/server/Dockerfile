FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY apps/server/package*.json ./apps/server/
RUN npm install --workspace=apps/server
COPY prisma ./prisma/
COPY apps/server ./apps/server/
RUN npx prisma generate
RUN npm run build --workspace=apps/server
EXPOSE 3000
CMD ["node", "apps/server/dist/index.js"]
