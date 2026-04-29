# Digital Brain LLM-Wiki Management System

这是一个用于管理个人知识库（Digital Brain / Obsidian Vault）和执行大语言模型（LLM）自动化脚本的 Web 终端和管理平台。

通过这个系统，你可以直接在网页端调用 Gemini 等 LLM 命令行工具，对本地的 Obsidian 笔记进行总结、分析和处理，同时享受漂亮的流式终端输出体验。

## 🌟 核心功能

- **Web 终端执行器**：直接在浏览器中执行 `gemini` 等命令行工具。
- **实时流式输出**：基于 PTY（伪终端）和 SSE（Server-Sent Events）技术，完美还原终端的流式输出（包含思考过程和高亮颜色）。
- **自动化脚本管理**：扫描并运行指定的 Python 自动化脚本。
- **前后端分离架构**：
  - 前端：React + Vite + TailwindCSS
  - 后端：FastAPI + SQLite + Python 异步子进程

## 📁 目录结构

```text
llm_wiki_MS/
├── backend/          # FastAPI 后端服务
│   ├── routers/      # API 路由 (如 scripts.py 负责脚本执行与流式返回)
│   ├── .env          # 后端环境变量 (存放 Web 认证信息)
│   └── main.py       # 后端入口
├── frontend/         # Vite + React 前端应用
│   ├── src/          # 源码 (包含 ScriptRunner.jsx 等组件)
│   └── package.json  # 前端依赖
├── start_dev.sh      # 一键启动脚本
└── README.md         # 项目说明文档
```

## ⚙️ 配置文件与 Obsidian 路径

项目的核心配置主要在以下几个地方：

### 1. Obsidian 知识库位置 (WIKI_DIR)
默认情况下，系统会自动去读取上层目录的 `Digital Brain Wiki` 文件夹作为你的 Obsidian 根目录。
- **当前默认路径**：`/Users/mac/Documents/Digital Brain Wiki/`
- **修改位置**：如果你需要修改 Obsidian 知识库的路径，请打开 `backend/routers/scripts.py`，找到并修改 `WIKI_DIR` 变量：
  ```python
  WIKI_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../Digital Brain Wiki"))
  ```

### 2. 网页登录凭证 (.env)
为了保护你的 Web 端不被他人访问，后端配置了 Basic Auth 基础认证。
- **修改位置**：`backend/.env`
- **配置内容**：
  ```env
  WEB_USERNAME=admin
  WEB_PASSWORD=digitalbrain2026
  ```

## 🚀 启动与使用

我们提供了一个一键启动脚本，可以同时在后台启动 FastAPI 和 Vite 服务。

1. 打开终端，进入项目根目录：
   ```bash
   cd "/Users/mac/Documents/Digital Brain Wiki/llm_wiki_MS"
   ```
2. 运行一键启动脚本：
   ```bash
   ./start_dev.sh
   ```
3. 在浏览器中打开：
   - **前端页面**：[http://localhost:5173](http://localhost:5173)
   - **后端 API 文档**：[http://localhost:8000/docs](http://localhost:8000/docs)

*(按 `Ctrl+C` 即可同时安全地关闭前后端服务)*
