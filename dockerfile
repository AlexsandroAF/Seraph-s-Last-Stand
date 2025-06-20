# Multi-stage build para otimizar a imagem final
FROM node:18-bullseye-slim as builder

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Stage de produção
FROM nginx:stable-alpine

# Instalar certificados SSL (caso precise)
RUN apk add --no-cache openssl

# Remover configuração padrão do nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiar configuração customizada do nginx
COPY nginx.conf /etc/nginx/conf.d/

# Copiar arquivos buildados do stage anterior
COPY --from=builder /app/dist /usr/share/nginx/html

# Criar diretório para logs
RUN mkdir -p /var/log/nginx

# Expor portas
EXPOSE 80 443

# Comando para iniciar nginx
CMD ["nginx", "-g", "daemon off;"]
