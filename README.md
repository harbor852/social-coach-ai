# SpeakUp AI - AI 社交成长教练

面向低社交度人群的 AI 社交成长教练，帮助用户通过场景训练、观点表达训练、角色扮演、语音陪练和社交礼仪学习，逐步提升社交自信与沟通能力。

## 技术栈

- **前端**: Next.js + React + TypeScript + Tailwind CSS
- **后端**: FastAPI (Python)
- **Agent 编排**: LangGraph
- **数据库**: SQLite (MVP) → PostgreSQL
- **语音**: STT + TTS (先 mock，后接入真实服务)
- **LLM**: 可插拔 Provider (mock / Kimi / DeepSeek)

## 项目结构

```
social-coach-ai/
├── apps/web/          # Next.js 前端
├── services/api/      # FastAPI 后端
├── services/voice/    # 语音服务 (预留)
├── packages/          # 共享包
├── prompts/           # Prompt 模板
├── scripts/           # 开发脚本
└── docs/              # 文档
```

## 快速开始

见 docs/TASKS.md 中的开发任务清单。
