# PixLink Server Dockerfile

# 使用Node.js 18作为基础镜像（Alpine 3.18版本）
FROM node:18-alpine3.18

# 安装OpenSSL和其他必要的依赖
RUN apk add --no-cache openssl1.1-compat

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 创建CA证书目录
RUN mkdir -p certs

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "run", "dev"]
