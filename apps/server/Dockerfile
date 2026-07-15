FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY apps/server/package*.json ./apps/server/
RUN npm install --workspace=apps/server --ignore-scripts
COPY prisma ./prisma/
COPY apps/server ./apps/server/
RUN npx prisma generate
RUN npm run build --workspace=apps/server
EXPOSE 3000
CMD ["node", "apps/server/dist/index.js"]
