# 1. Imagen base: node:18-alpine (optimización de tamaño) [cite: 147]
FROM node:18-alpine

# 2. Working directory: /app [cite: 148]
WORKDIR /app

# 3. Copiar package files
COPY package*.json ./

# 4. Instalar dependencias ANTES de copiar código fuente (optimización de capas) [cite: 149, 155]
RUN npm install

# 5. Copiar código fuente
COPY . .

# 6. Exponer puerto 3000 [cite: 149]
EXPOSE 3000

# 7. Comando de inicio: ejecutar el servidor Node.js [cite: 150]
CMD ["npm", "start"]
