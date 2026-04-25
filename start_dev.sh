#!/bin/bash

echo "Starting llm_wiki_MS Development Environment..."

# 获取脚本所在目录的绝对路径
PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

# 启动后端服务 (后台运行)
echo "=> Starting FastAPI Backend..."
cd "$PROJECT_ROOT/backend"
# 激活虚拟环境并启动
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# 启动前端服务
echo "=> Starting Vite Frontend..."
cd "$PROJECT_ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

# 捕获 Ctrl+C 信号，优雅地关闭所有服务
trap "echo -e '\nStopping services...'; kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM

echo "================================================="
echo "✅ Backend is running at: http://localhost:8000"
echo "✅ Frontend is running at: http://localhost:5173"
echo "Press Ctrl+C to stop both services."
echo "================================================="

# 等待后台进程
wait
