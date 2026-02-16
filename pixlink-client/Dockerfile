# PixLink Client Dockerfile

# 使用Node.js 20作为基础镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 5173

# 启动Vite开发服务器
CMD ["npm", "run", "dev"]
