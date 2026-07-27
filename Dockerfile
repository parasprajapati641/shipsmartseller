FROM mcr.microsoft.com/playwright:v1.62.0-jammy

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3001

ENV PORT=3001
ENV NODE_ENV=production

CMD ["npx", "tsx", "automation/server.ts"]