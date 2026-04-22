FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm install -g serve
ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "serve -s dist -l $PORT"]
