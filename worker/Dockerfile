FROM node:20-alpine

WORKDIR /app

RUN npm install -g wrangler

COPY . .

EXPOSE 8788

CMD ["wrangler", "dev", "index.ts", "--local", "--port", "8788", "--ip", "0.0.0.0"]
