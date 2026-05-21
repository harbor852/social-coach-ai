# MVP 任务清单

基于《多智能体协作开发指南》的最推荐执行顺序。

## 阶段 A：项目骨架

- [x] 创建仓库
- [x] 写入 PRD (docs/PRD.md)
- [x] 写入技术设计文档 (docs/TECH_DESIGN.md)
- [x] 写 TASKS.md
- [ ] 初始化前端 (Next.js + 4个静态页面)
- [ ] 初始化后端 (FastAPI + mock /agent/turn)
- [ ] 前后端 mock 联调

## 阶段 B：核心 Agent

- [ ] LLM Provider 抽象 (mock/kimi/deepseek)
- [ ] LangGraph AgentState 定义
- [ ] Safety Node (安全识别)
- [ ] Intent Node (意图识别)
- [ ] Coach Node (表达教练)
- [ ] Feedback Node (复盘评分)
- [ ] 结构化输出解析

## 阶段 C：核心功能

- [ ] 场景训练
- [ ] 表达训练 (观点表达 PREP)
- [ ] 角色扮演
- [ ] 社交礼仪模块
- [ ] 训练复盘

## 阶段 D：数据保存

- [ ] 用户画像
- [ ] 训练会话 (training_sessions)
- [ ] 对话轮次 (training_turns)
- [ ] 能力评分 (skill_assessments)

## 阶段 E：语音 MVP

- [ ] 前端录音
- [ ] /voice/transcribe (mock)
- [ ] /voice/synthesize (mock)
- [ ] 语音陪练页面
- [ ] 语音反馈指标

## 阶段 F：安全与测试

- [ ] 安全测试集 (自伤/伤人/PUA/未成年人)
- [ ] 普通训练回归测试
- [ ] Prompt 输出格式测试

## 多智能体分工

| 智能体 | 角色 | 任务 |
|--------|------|------|
| Kimi Code | 主力工程师 | 编码、修 bug、前后端开发、LangGraph |
| Claude Code | 架构审查 | 代码审查、架构检查、安全审查 |
| Hermes | 测试工程师 | 测试用例、mock 数据、SQL、安全用例 |
| Cursor | 本地驾驶 | 小修改、补全、看 diff |
| Gemini | 资料文案 | UI 文案、礼仪内容、资料查询 |
