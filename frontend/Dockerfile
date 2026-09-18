# ==============================================================================
# Base stage: Instala dependências comuns
# ==============================================================================
FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./

# ==============================================================================
# Development stage: Usado para desenvolvimento local com hot-reload
# ==============================================================================
FROM base AS development

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]

# ==============================================================================
# Builder stage: Constrói a aplicação estática para produção
# ==============================================================================
FROM base AS builder

RUN npm install

COPY . .

RUN npm run build

# ==============================================================================
# Production stage: Servidor Nginx ultra-leve servindo os arquivos compilados
# ==============================================================================
FROM nginx:alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
