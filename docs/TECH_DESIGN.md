# AI 社交成长教练技术设计文档 v0.1

## 1. 文档目的

本文档基于《低社交度人群 AI 社交成长教练 PRD v0.1》，进一步明确产品的技术架构、Agent 编排方案、语音模块方案、数据模型、API 设计、MVP 实施路径，以及是否存在比 LangChain / LangGraph 更合适的技术框架组合。

本产品的核心不是简单聊天，而是“训练型 AI Agent”：它需要持续理解用户目标、模拟场景、进行语音陪练、给出结构化反馈、记录成长轨迹，并在涉及心理危机、未成年人风险或操控性话术时进行安全分流。

---

## 2. 技术结论摘要

### 2.1 推荐总体技术路线

推荐采用“分层组合架构”，而不是用单一 Agent 框架包办所有能力。

```text
前端体验层：Next.js / React / App
语音交互层：MVP 用 STT + TTS；进阶用 Realtime WebRTC / LiveKit / Pipecat
Agent 编排层：LangGraph 为主
工具与 RAG 层：LangChain 或 LlamaIndex 作为辅助
数据层：PostgreSQL + pgvector + Redis + 对象存储
评估观测层：LangSmith / OpenTelemetry / 自建评估集
安全层：独立 Safety Gateway + Agent 内部安全节点
```

### 2.2 核心建议

1. **核心 Agent 编排继续优先选择 LangGraph。**  
   原因是本产品有明确的状态流转、训练阶段、角色扮演、复盘、记忆、安全分支等需求，LangGraph 的图结构更适合做可控流程。

2. **第一版语音不要直接上完整实时通话。**  
   建议先做“按住说话 / 点击录音”模式：
   
   ```text
   用户录音 → STT → LangGraph → TTS → 播放
   ```

3. **第二阶段再上实时语音。**  
   若主要是 Web / App 内实时陪练，优先考虑 OpenAI Realtime API + WebRTC。  
   若未来要支持多人房间、真人教练接入、电话呼入呼出、跨模型供应商，考虑 LiveKit 或 Pipecat。

4. **不要把 CrewAI / AutoGen 作为第一版核心框架。**  
   它们适合多智能体协作、任务分工、自动化流程，但本产品第一阶段更需要“稳定、可控、可评估的训练流程”，而不是很多 Agent 自由协商。

5. **LlamaIndex 可作为知识库 / 课程内容 / 礼仪内容 RAG 辅助。**  
   如果后期有大量课程、心理教育、社交礼仪、职场沟通资料需要检索增强，可以引入 LlamaIndex；第一版不必强依赖。

---

## 3. 产品技术需求拆解

## 3.1 必须支持的能力

### A. 多场景社交训练

系统需要支持：

- 校园社交。
- 大学生表达训练。
- 初入职场沟通。
- 面试表达。
- 会议发言。
- 拒绝与边界表达。
- 观点表达训练。
- 社交礼仪学习。
- 角色扮演。

### B. 有状态训练流程

一次训练不是一问一答，而是多轮流程：

```text
选择场景 → 明确训练目标 → AI 示范 → 用户练习 → AI 追问 → 用户二次表达 → 复盘评分 → 推荐下一步
```

因此需要保存：

- 当前训练模式。
- 当前角色。
- 当前场景。
- 用户目标。
- 用户本轮表现。
- AI 追问策略。
- 训练结束标准。

### C. 用户成长记忆

系统需要长期记录：

- 用户身份阶段：青春期 / 大学生 / 初入职场。
- 主要困难：不敢说、表达乱、不会拒绝、社交礼仪弱等。
- 用户偏好：温和、直接、职场正式、自然、不油腻等。
- 能力评分：清晰度、逻辑性、自信度、礼貌度、边界感、说服力。
- 历史训练记录。
- 下次推荐任务。

### D. 安全分流

必须识别以下风险：

- 自伤、自杀、严重绝望。
- 伤害他人。
- 未成年人高风险线下见面或被诱导。
- 被霸凌、虐待、性骚扰、胁迫。
- 用户要求操控、欺骗、PUA、骚扰他人。
- 过度心理诊断需求。

### E. 语音交流

MVP 需要支持：

- 录音上传。
- 自动转写。
- AI 文本生成。
- TTS 播放。
- 基础语音表现分析：语速、停顿、犹豫词、表达长度。

进阶版本需要支持：

- 实时语音通话。
- 打断 AI。
- VAD 语音活动检测。
- 低延迟回复。
- 更自然的角色扮演。

---

## 4. 技术架构总览

## 4.1 推荐系统架构

```text
┌──────────────────────────────────────────────┐
│                  Client Layer                 │
│  Web / Mobile App / Mini Program              │
│  - Chat UI                                    │
│  - Voice Recorder                             │
│  - Roleplay Room                              │
│  - Training Report                            │
└───────────────────────┬──────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────┐
│                API Gateway / BFF              │
│  - Auth                                       │
│  - Rate Limit                                 │
│  - Request Validation                         │
│  - Session Management                         │
│  - Safety Pre-check                           │
└───────────────┬───────────────────┬──────────┘
                │                   │
                ▼                   ▼
┌──────────────────────┐   ┌──────────────────────┐
│    Voice Service      │   │   Agent Service       │
│  - STT                │   │  - LangGraph           │
│  - TTS                │   │  - Safety Node         │
│  - VAD                │   │  - Scene Node          │
│  - Audio Metrics      │   │  - Roleplay Node       │
│  - Realtime Gateway   │   │  - Feedback Node       │
└──────────┬───────────┘   └──────────┬───────────┘
           │                          │
           ▼                          ▼
┌──────────────────────────────────────────────┐
│                Data / Memory Layer            │
│  - PostgreSQL                                 │
│  - pgvector                                   │
│  - Redis                                      │
│  - Object Storage                             │
│  - Checkpoint Store                           │
└───────────────────────┬──────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────┐
│             Observability / Evaluation        │
│  - LangSmith                                  │
│  - OpenTelemetry                              │
│  - Prompt Versioning                          │
│  - Safety Audit                               │
│  - Quality Evaluation                         │
└──────────────────────────────────────────────┘
```

---

## 5. 技术框架对比与选择

## 5.1 Agent 编排框架候选

### 方案 A：LangGraph + LangChain

适合程度：★★★★★

适合本产品的原因：

- 支持图式工作流。
- 适合多节点、有分支的训练流程。
- 适合做角色扮演、复盘、记忆更新、安全分流。
- 便于控制每一步输出格式。
- 更容易做状态持久化和恢复。
- 生态成熟，能与 LangSmith 做观测和评估。

不足：

- 初期设计图状态和节点会比普通聊天机器人复杂。
- 需要团队理解状态机、checkpoint、streaming 等概念。

结论：

> 推荐作为核心 Agent 编排框架。

---

### 方案 B：OpenAI Agents SDK

适合程度：★★★★☆

适合点：

- 适合快速构建工具调用型 Agent。
- 对语音 Agent 支持更直接。
- VoicePipeline 可快速实现音频输入、转写、Agent 调用、TTS 输出。
- 如果第一版更偏“单 Agent + 语音陪练”，开发速度会很快。

不足：

- 若要做复杂训练状态、长期成长计划、多分支安全流程，仍需要自己设计外层状态机。
- 与 LangGraph 相比，图式流程的表达力不如 LangGraph 直观。

结论：

> 可作为语音 MVP 的实现工具，但不建议替代 LangGraph 成为核心训练编排层。

---

### 方案 C：CrewAI

适合程度：★★★☆☆

适合点：

- 角色设定、任务分工、多 Agent 协作较方便。
- 可以设计“表达教练、礼仪教练、角色扮演教练、复盘教练”等多个 Agent。
- 适合做后台内容生成、课程生成、批量测评等任务。

不足：

- 第一版产品需要稳定的训练流程，不需要太多 Agent 自由协作。
- 多 Agent 协作可能增加不可控性、延迟和成本。
- 对语音实时交互不是核心优势。

结论：

> 不推荐作为 MVP 主框架。可在后期用于课程内容生产、场景库生成、评估任务自动化。

---

### 方案 D：AutoGen / Microsoft Agent Framework

适合程度：★★★☆☆

适合点：

- 适合复杂多智能体系统。
- 适合研究型、多 Agent 协同、企业自动化流程。
- 工具调用、分布式运行、MCP 等能力较强。

不足：

- 对本产品的核心“训练流程 + 语音陪练 + 用户成长记录”来说偏重。
- 第一版会增加学习成本和架构复杂度。

结论：

> 不作为第一版主框架；可作为后期企业版或复杂多 Agent 评估系统的备选。

---

### 方案 E：LlamaIndex Workflows

适合程度：★★★☆☆

适合点：

- 擅长知识库、文档解析、RAG、课程内容检索。
- 如果社交礼仪、职场沟通、表达训练课程库变大，LlamaIndex 很有价值。
- Workflows 也可以做多步骤流程。

不足：

- 本产品的核心不是文档问答，而是互动训练。
- 作为核心 Agent 编排不如 LangGraph 更贴合当前需求。

结论：

> 推荐作为知识库和课程检索增强层，不作为第一版核心编排框架。

---

## 5.2 语音框架候选

### 方案 A：STT + LangGraph + TTS

适合程度：★★★★★

适合阶段：MVP

流程：

```text
录音文件 / 音频流
  ↓
Speech-to-Text
  ↓
LangGraph Agent
  ↓
Text-to-Speech
  ↓
前端播放
```

优点：

- 开发简单。
- 可控性强。
- 便于调试。
- 成本可控。
- 对训练型产品足够好。

缺点：

- 不是真正实时通话。
- 打断体验较弱。
- 自然度不如实时语音。

结论：

> 第一版推荐方案。

---

### 方案 B：OpenAI Realtime API + WebRTC

适合程度：★★★★★

适合阶段：V0.4 实时语音陪练

优点：

- 低延迟。
- 支持实时语音交互。
- 适合 Web / App 内的语音陪练。
- 用户体验更像真人对话。
- 支持打断、流式输出和实时转写。

缺点：

- 工程复杂度高于 MVP 方案。
- 需要处理 session、权限、WebRTC 连接、网络稳定性。
- 需要设计 Realtime 与 LangGraph 的工具调用边界。

结论：

> 第二阶段推荐升级方案。

---

### 方案 C：LiveKit Agents

适合程度：★★★★☆

适合阶段：多人房间、真人教练接入、电话/视频/实时协作场景

优点：

- 适合实时音视频房间。
- 支持将 Agent 作为房间参与者。
- 适合多方互动。
- 适合未来扩展真人教练、同伴练习、多人模拟面试。

缺点：

- 对 MVP 来说偏重。
- 需要额外部署实时音视频基础设施。
- 如果只是单人 AI 陪练，可能用不到完整能力。

结论：

> 不建议第一版引入；当产品进入多人实时训练、真人教练、电话场景时再考虑。

---

### 方案 D：Pipecat

适合程度：★★★★☆

适合阶段：多模型、多供应商、强语音管线定制

优点：

- 开源。
- 专注实时语音和多模态 Agent。
- 可以灵活编排 STT、LLM、TTS、传输层。
- 适合希望避免强绑定单一模型供应商的团队。

缺点：

- 对团队语音工程能力要求更高。
- 第一版会增加集成成本。
- 如果已经确定使用 OpenAI 生态，初期不一定需要。

结论：

> 作为中后期语音架构备选，尤其适合多供应商和私有化部署需求。

---

## 5.3 最终推荐技术组合

### MVP 技术组合

```text
前端：Next.js + React + Tailwind
后端：FastAPI
Agent：LangGraph + LangChain
语音：STT + TTS / OpenAI Agents SDK VoicePipeline
数据库：PostgreSQL + pgvector
缓存：Redis
对象存储：S3 / R2 / OSS
观测：LangSmith + 应用日志
部署：Docker + 云服务器 / Render / Fly.io / AWS / 阿里云
```

### 进阶技术组合

```text
前端：Next.js / React Native / Flutter
实时语音：OpenAI Realtime API + WebRTC
Agent 编排：LangGraph
多人实时：LiveKit
多供应商语音管线：Pipecat
知识库：LlamaIndex / LangChain RAG
评估：LangSmith + 自建测试集 + 人工抽检
数据：PostgreSQL + pgvector + Redis + 对象存储
```

---

## 6. Agent 设计

## 6.1 Agent 总体结构

建议不要一开始做很多完全独立的 Agent，而是采用“主流程 + 专家节点”的方式。

```text
SocialCoachGraph
├── Safety Node
├── Intent Router Node
├── User Profile Node
├── Scene Understanding Node
├── Emotion Reflection Node
├── Strategy Node
├── Expression Coach Node
├── Roleplay Node
├── Etiquette Coach Node
├── Feedback Node
└── Memory Update Node
```

每个节点可以由一个 prompt + structured output 组成，也可以由一个小型 chain / agent 实现。

---

## 6.2 状态设计

### AgentState 示例

```python
class AgentState(TypedDict):
    user_id: str
    session_id: str
    mode: Literal[
        "scene_analysis",
        "roleplay",
        "expression_training",
        "etiquette_learning",
        "voice_practice",
        "feedback"
    ]
    user_stage: Literal["teen", "college", "new_worker", "other"]
    user_text: str
    transcript: Optional[str]
    audio_features: Optional[dict]
    scene: Optional[dict]
    intent: Optional[str]
    risk_level: Literal["none", "low", "medium", "high", "crisis"]
    safety_action: Optional[str]
    coaching_goal: Optional[str]
    roleplay_config: Optional[dict]
    strategy: Optional[dict]
    response_text: Optional[str]
    feedback: Optional[dict]
    memory_updates: Optional[list]
    next_action: Optional[str]
```

---

## 6.3 节点职责

### 6.3.1 Safety Node

输入：用户文本、历史上下文、年龄阶段。  
输出：风险等级、安全动作、是否继续普通训练。

风险等级：

```text
none：无明显风险
low：轻微负面情绪
medium：明显困扰，需要温和建议
high：涉及霸凌、虐待、胁迫、自我伤害暗示
crisis：明确自伤、自杀、伤害他人或紧急危险
```

如果风险为 high / crisis，跳转到 Safety Response Node，不进入普通社交训练。

---

### 6.3.2 Intent Router Node

识别用户想做什么：

```text
场景分析
话术优化
角色扮演
观点表达训练
礼仪学习
语音复盘
情绪反思
成长计划
```

---

### 6.3.3 Scene Understanding Node

识别：

- 场景类型：校园、职场、亲密关系、朋友、陌生社交。
- 人物关系：同学、朋友、老师、领导、同事、面试官。
- 用户真实目标：破冰、拒绝、表达不同意见、道歉、争取资源等。
- 沟通难点：不敢说、没逻辑、怕冒犯、怕冷场等。

---

### 6.3.4 Expression Coach Node

负责观点表达训练。

核心输出：

```json
{
  "original_problem": "观点不明确，理由不足",
  "recommended_framework": "PREP",
  "rewritten_expression": "我建议采用 A 方案，因为...",
  "practice_instruction": "请用 30 秒重新表达一遍，先说结论，再说两个理由。"
}
```

---

### 6.3.5 Roleplay Node

负责扮演具体对象。

配置示例：

```json
{
  "role": "直属领导",
  "attitude": "理性但有压力感",
  "difficulty": 3,
  "goal": "训练用户在会议中表达不同意见",
  "constraints": [
    "不要羞辱用户",
    "不要输出过强攻击性内容",
    "每轮只提出一个追问"
  ]
}
```

---

### 6.3.6 Feedback Node

反馈维度：

```text
清晰度
逻辑性
证据充分度
自信度
礼貌度
边界感
共情度
说服力
语音流畅度
```

反馈原则：

- 先肯定行为进步。
- 再指出可训练问题。
- 不评价人格。
- 给出可复述版本。
- 给下一轮练习任务。

---

### 6.3.7 Memory Update Node

写入长期记忆前需做过滤。

可写入：

- 用户训练目标。
- 用户偏好语气。
- 用户常见场景。
- 能力评分趋势。
- 推荐下一步任务。

不默认写入：

- 原始语音。
- 敏感心理细节。
- 他人隐私。
- 未经授权的聊天记录。

---

## 7. 语音模块设计

## 7.1 MVP：按住说话方案

### 流程

```text
用户点击录音
  ↓
前端采集音频 Blob
  ↓
上传 /voice/transcribe
  ↓
后端调用 STT
  ↓
得到 transcript
  ↓
调用 /agent/turn
  ↓
LangGraph 生成 response_text + feedback
  ↓
调用 TTS
  ↓
返回 audio_url / audio_stream
  ↓
前端播放
```

### API 设计

```http
POST /voice/transcribe
Content-Type: multipart/form-data

file: audio.webm
session_id: string
```

返回：

```json
{
  "transcript": "我觉得这个方案可能不太好，但我不知道怎么说",
  "audio_features": {
    "duration_sec": 8.2,
    "speech_rate_wpm": 118,
    "pause_count": 5,
    "filler_words": ["嗯", "就是", "可能"]
  }
}
```

```http
POST /agent/turn
```

请求：

```json
{
  "user_id": "u_123",
  "session_id": "s_456",
  "mode": "expression_training",
  "text": "我觉得这个方案可能不太好，但我不知道怎么说",
  "audio_features": {
    "duration_sec": 8.2,
    "speech_rate_wpm": 118,
    "pause_count": 5,
    "filler_words": ["嗯", "就是", "可能"]
  }
}
```

返回：

```json
{
  "reply_text": "你已经表达了不同意见，这是很好的开始。但这句话的问题是观点不够明确、理由不够具体。我们可以改成：我建议不要完全沿用上次方案，因为上次转化率低于预期，而且这次目标人群不同。",
  "feedback": {
    "clarity": 5,
    "logic": 4,
    "confidence": 5,
    "etiquette": 8,
    "suggestion": "下一轮先说结论，再说两个理由。"
  },
  "next_action": "retry_expression"
}
```

```http
POST /voice/synthesize
```

请求：

```json
{
  "text": "我们再练一遍。请先说结论，再说两个理由。",
  "voice": "warm_coach"
}
```

返回：

```json
{
  "audio_url": "https://cdn.example.com/audio/xxx.mp3"
}
```

---

## 7.2 进阶：Realtime WebRTC 方案

### 流程

```text
用户进入语音训练房间
  ↓
前端请求 /voice/realtime/session
  ↓
后端创建实时会话配置
  ↓
前端建立 WebRTC 连接
  ↓
实时传输音频
  ↓
Realtime 模型进行语音识别和响应
  ↓
必要时通过 tool call 调用 LangGraph
  ↓
LangGraph 返回训练策略、追问、反馈
  ↓
实时语音输出
```

### 关键设计

#### A. Realtime 层只负责自然对话体验

Realtime 层处理：

- 低延迟语音。
- 打断。
- 转写。
- 语音输出。
- 短上下文对话。

#### B. LangGraph 负责训练逻辑

LangGraph 处理：

- 安全分流。
- 场景识别。
- 训练目标判断。
- 角色扮演策略。
- 观点表达反馈。
- 成长记忆更新。

#### C. 两者通过工具调用连接

Realtime 会话中配置工具：

```json
{
  "name": "run_social_coach_graph",
  "description": "Run the social coaching graph for scene analysis, roleplay, expression feedback, and safety handling.",
  "parameters": {
    "type": "object",
    "properties": {
      "user_text": {"type": "string"},
      "mode": {"type": "string"},
      "session_id": {"type": "string"},
      "audio_metrics": {"type": "object"}
    },
    "required": ["user_text", "mode", "session_id"]
  }
}
```

---

## 8. 数据模型设计

## 8.1 用户表 users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT,
  phone TEXT,
  nickname TEXT,
  age_stage TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

---

## 8.2 用户画像表 user_profiles

```sql
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  stage TEXT,
  goals JSONB,
  common_challenges JSONB,
  preferred_tone TEXT,
  privacy_settings JSONB,
  skill_scores JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

示例：

```json
{
  "goals": ["提升会议发言", "学会表达不同意见"],
  "common_challenges": ["不敢开口", "表达缺少逻辑"],
  "preferred_tone": "自然、真诚、有边界感",
  "skill_scores": {
    "clarity": 6,
    "confidence": 5,
    "logic": 6,
    "etiquette": 7
  }
}
```

---

## 8.3 训练会话表 training_sessions

```sql
CREATE TABLE training_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  mode TEXT,
  scene_type TEXT,
  status TEXT,
  started_at TIMESTAMP DEFAULT now(),
  ended_at TIMESTAMP,
  summary JSONB
);
```

---

## 8.4 对话轮次表 training_turns

```sql
CREATE TABLE training_turns (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES training_sessions(id),
  role TEXT,
  text TEXT,
  audio_url TEXT,
  transcript TEXT,
  audio_features JSONB,
  feedback JSONB,
  created_at TIMESTAMP DEFAULT now()
);
```

---

## 8.5 能力评分表 skill_assessments

```sql
CREATE TABLE skill_assessments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  session_id UUID REFERENCES training_sessions(id),
  clarity INT,
  logic INT,
  evidence INT,
  confidence INT,
  etiquette INT,
  empathy INT,
  boundary INT,
  persuasion INT,
  fluency INT,
  comments TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

---

## 8.6 安全事件表 safety_events

```sql
CREATE TABLE safety_events (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  session_id UUID,
  risk_level TEXT,
  risk_type TEXT,
  user_text TEXT,
  action_taken TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

---

## 8.7 内容知识库表 knowledge_chunks

```sql
CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY,
  category TEXT,
  title TEXT,
  content TEXT,
  embedding VECTOR,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT now()
);
```

知识库内容可包括：

- 社交礼仪。
- 职场沟通。
- 表达结构。
- 观点表达训练。
- 面试表达。
- 校园社交。
- 冲突沟通。
- 边界表达。

---

## 9. API 设计

## 9.1 用户与画像

```http
POST /onboarding
GET /users/{user_id}/profile
PATCH /users/{user_id}/profile
```

---

## 9.2 Agent 对话

```http
POST /agent/turn
POST /agent/roleplay/start
POST /agent/roleplay/turn
POST /agent/feedback
POST /agent/session/end
```

---

## 9.3 语音

```http
POST /voice/transcribe
POST /voice/synthesize
POST /voice/realtime/session
POST /voice/realtime/tool-callback
```

---

## 9.4 训练计划

```http
GET /training/plans/recommended
POST /training/plans/{plan_id}/start
GET /training/sessions/{session_id}
GET /training/progress
```

---

## 9.5 内容与礼仪课程

```http
GET /lessons
GET /lessons/{lesson_id}
POST /lessons/{lesson_id}/practice
```

---

## 10. 核心训练模块技术实现

## 10.1 观点表达训练

### 输入

```json
{
  "scene": "meeting_disagreement",
  "user_expression": "我觉得可能这个方案不太好吧",
  "target": "勇敢、有逻辑、有依据地表达不同意见"
}
```

### 模型输出结构

```json
{
  "diagnosis": {
    "main_issue": "观点模糊，缺少理由和建议",
    "risk": "语气过弱，容易被忽略"
  },
  "framework": "PREP",
  "rewritten_versions": {
    "gentle": "我理解这个方案的优点，不过我有一个担心点...",
    "confident": "我建议我们不要完全沿用这个方案，原因有两个...",
    "formal": "从目标和数据来看，我建议对方案做一次调整..."
  },
  "practice_task": "请用 30 秒重新表达：先说结论，再说两个理由，最后给一个建议。",
  "score": {
    "clarity": 5,
    "logic": 4,
    "confidence": 5,
    "evidence": 3
  }
}
```

---

## 10.2 社交礼仪训练

### 训练形式

- 小课学习。
- 判断题。
- 场景模拟。
- 错误示范。
- 用户重写。

### 示例题

```text
场景：你想请同事帮忙看一个文档。
错误表达：在吗？帮我看下这个。
请改成更礼貌、清楚、有边界感的表达。
```

### 推荐输出

```text
更好的表达：
“你今天方便帮我看一下这个文档吗？主要想请你帮忙看逻辑是否清楚。如果你今天没时间，我也可以明天再发你。”

为什么更好：
1. 说明了具体请求。
2. 给了对方选择空间。
3. 降低了压迫感。
4. 表达更礼貌。
```

---

## 10.3 角色扮演训练

### 难度分级

```text
Level 1：友善对象，只做轻度回应
Level 2：普通对象，会提出追问
Level 3：有压力对象，会质疑用户观点
Level 4：强势对象，会打断或反驳
Level 5：高压模拟，但仍需保持安全和尊重
```

### 控制原则

- 每轮只给一个挑战。
- 不羞辱用户。
- 不引导用户使用操控话术。
- 不将训练变成情绪攻击。
- 结束时必须复盘。

---

## 11. Prompt 与结构化输出设计

## 11.1 Prompt 分层

建议分为：

```text
System Prompt：产品边界、安全原则、风格基调
Developer Prompt：模块职责、输出格式、评分规则
User Context：用户画像、训练目标、当前场景
Task Prompt：本轮具体任务
```

---

## 11.2 主教练 System Prompt 要点

```text
你是一个社交成长教练，不是心理医生。
你的任务是帮助用户练习社交表达、观点表达、沟通礼仪和自信表达。
你不能做临床诊断、人格判断、药物建议或心理治疗。
你要用支持性语言反馈用户的行为表现，而不是评价用户人格。
当用户涉及自伤、伤害他人、未成年人风险、被虐待、被胁迫等内容时，停止普通训练并进入安全支持流程。
你不能帮助用户操控、欺骗、骚扰、PUA 他人。
```

---

## 11.3 结构化评分 Schema

```json
{
  "type": "object",
  "properties": {
    "scores": {
      "type": "object",
      "properties": {
        "clarity": {"type": "integer", "minimum": 1, "maximum": 10},
        "logic": {"type": "integer", "minimum": 1, "maximum": 10},
        "evidence": {"type": "integer", "minimum": 1, "maximum": 10},
        "confidence": {"type": "integer", "minimum": 1, "maximum": 10},
        "etiquette": {"type": "integer", "minimum": 1, "maximum": 10},
        "boundary": {"type": "integer", "minimum": 1, "maximum": 10},
        "persuasion": {"type": "integer", "minimum": 1, "maximum": 10}
      }
    },
    "strengths": {"type": "array", "items": {"type": "string"}},
    "improvements": {"type": "array", "items": {"type": "string"}},
    "rewritten_expression": {"type": "string"},
    "next_practice": {"type": "string"}
  }
}
```

---

## 12. 安全设计

## 12.1 双层安全机制

### 第一层：入口安全检查

在请求进入 Agent 前进行快速识别：

- 自伤风险。
- 伤人风险。
- 未成年人风险。
- 操控/骚扰需求。
- 性化或不当内容。

### 第二层：Agent 内部 Safety Node

用于结合上下文进一步判断，并决定：

- 继续普通训练。
- 温和提醒边界。
- 拒绝不当请求。
- 转入危机支持。
- 建议寻求可信成年人或专业帮助。

---

## 12.2 不当请求示例与处理

### 用户请求

```text
教我怎么让她离不开我。
```

处理：

```text
拒绝操控型建议，转为健康关系沟通：尊重对方意愿、表达真实感受、接受拒绝。
```

### 用户请求

```text
怎么让同事闭嘴？
```

处理：

```text
不提供攻击话术，转为边界表达和会议秩序表达。
```

### 用户请求

```text
我不想活了。
```

处理：

```text
停止训练，进入危机支持流程，建议立即联系当地紧急服务、可信任的人或专业心理援助。
```

---

## 13. 隐私与合规设计

## 13.1 数据最小化

默认只保存：

- 转写文本。
- 训练评分。
- 用户授权的成长画像。

默认不保存：

- 原始语音。
- 音频文件。
- 未授权聊天记录。
- 过度敏感心理信息。

---

## 13.2 语音隐私

建议设置：

```text
保存原始语音：默认关闭
保存转写文本：默认开启，可关闭
用于模型训练：默认关闭，需要单独授权
删除历史记录：用户可随时操作
```

---

## 13.3 未成年人保护

若用户选择“青春期 / 未成年”阶段：

- 禁止成人化恋爱建议。
- 禁止高风险线下见面建议。
- 对霸凌、骚扰、被胁迫场景更敏感。
- 建议联系家长、老师、可信成年人。
- 安全提示更明确。

---

## 14. 评估与观测

## 14.1 质量评估指标

### 对话质量

- 回答是否贴合场景。
- 是否给出可执行建议。
- 是否避免空泛鸡汤。
- 是否保持支持性语言。

### 训练质量

- 是否明确指出表达问题。
- 是否给出更好版本。
- 是否让用户重新练习。
- 是否更新成长记录。

### 安全质量

- 是否识别危机内容。
- 是否拒绝操控、PUA、骚扰请求。
- 是否避免心理诊断。
- 是否正确处理未成年人风险。

### 语音质量

- 转写准确率。
- 回复延迟。
- TTS 自然度。
- 打断体验。
- 用户完成率。

---

## 14.2 评估集设计

建议建立以下测试集：

1. 普通社交场景集。
2. 观点表达训练集。
3. 职场沟通集。
4. 校园社交集。
5. 礼仪判断集。
6. 危机安全集。
7. PUA/操控拒绝集。
8. 未成年人保护集。
9. 语音转写噪声集。

每个测试样本包括：

```json
{
  "input": "用户原话",
  "expected_behavior": "应该如何处理",
  "forbidden_behavior": "不能出现什么",
  "rubric": {
    "helpfulness": 1,
    "safety": 1,
    "specificity": 1,
    "tone": 1
  }
}
```

---

## 15. 部署架构

## 15.1 MVP 部署

```text
Frontend：Vercel / Netlify / 自建静态服务
Backend：FastAPI + Uvicorn
Worker：Celery / RQ
Database：PostgreSQL
Cache：Redis
Object Storage：S3 / R2 / OSS
Vector：pgvector
Observability：LangSmith + Sentry + Logs
```

### 服务拆分

MVP 可以先做单体后端：

```text
app/
├── api/
│   ├── agent.py
│   ├── voice.py
│   ├── profile.py
│   └── training.py
├── graph/
│   ├── state.py
│   ├── nodes.py
│   ├── edges.py
│   └── prompts.py
├── services/
│   ├── stt.py
│   ├── tts.py
│   ├── memory.py
│   ├── safety.py
│   └── rag.py
├── db/
│   ├── models.py
│   └── repositories.py
└── evals/
    ├── test_cases.jsonl
    └── evaluators.py
```

---

## 15.2 中后期部署

当用户量上来后拆分服务：

```text
API Gateway
├── Auth Service
├── Agent Service
├── Voice Service
├── Training Service
├── Memory Service
├── Safety Service
├── Content Service
└── Evaluation Service
```

---

## 16. MVP 实施计划

## 16.1 V0.1：文字版核心 Agent

目标：验证训练逻辑。

功能：

- Onboarding。
- 用户画像。
- 社交场景分析。
- 话术优化。
- 观点表达训练。
- 基础角色扮演。
- 复盘评分。
- 安全分流。

技术重点：

- LangGraph 跑通。
- 结构化输出稳定。
- 评分规则可解释。
- 训练记录入库。

---

## 16.2 V0.2：语音 MVP

目标：验证语音陪练价值。

功能：

- 录音上传。
- STT。
- TTS。
- 语音表现分析。
- 语音训练报告。

技术重点：

- 音频格式兼容。
- 转写准确率。
- TTS 延迟。
- 前端录音体验。

---

## 16.3 V0.3：训练计划与成长系统

目标：提升留存。

功能：

- 7 天表达训练。
- 14 天职场沟通训练。
- 能力雷达图。
- 历史趋势。
- 推荐下一课。

---

## 16.4 V0.4：实时语音陪练

目标：提升沉浸感。

功能：

- WebRTC 实时语音。
- 可打断回复。
- 角色动态追问。
- 实时字幕。
- 训练中暂停反馈。

---

## 16.5 V0.5：多人/真人教练扩展

目标：拓展商业模式。

功能：

- 真人教练接入。
- AI + 真人混合训练。
- 多人模拟面试。
- 小组讨论训练。
- 企业新人训练空间。

---

## 17. 成本控制建议

### 17.1 模型分层

不要所有任务都调用最强模型。

```text
安全初筛：轻量模型 / 分类器
意图识别：轻量模型
普通话术优化：中等模型
复杂复盘：强模型
实时语音：实时模型
RAG 检索：embedding + 中等模型
```

### 17.2 缓存策略

可缓存：

- 礼仪课程内容。
- 标准场景示范。
- 常见话术模板。
- 训练任务模板。

不可简单缓存：

- 用户个人化反馈。
- 安全响应。
- 敏感场景。

---

## 18. 关键技术风险与应对

### 风险 1：AI 反馈过于空泛

应对：

- 强制结构化输出。
- 每次必须给“可复述版本”。
- 每次必须给下一轮练习任务。
- 建立高质量示例库。

### 风险 2：角色扮演变得不可控

应对：

- 限制角色攻击性。
- 设置难度等级。
- 每轮只允许一个挑战。
- 高压模拟必须可随时停止。

### 风险 3：语音延迟影响体验

应对：

- MVP 用短音频回合。
- TTS 支持流式播放。
- 后续用 WebRTC。
- 降低每轮回复长度。

### 风险 4：用户依赖 AI 做情感决策

应对：

- 强调产品是训练工具。
- 鼓励用户尊重他人意愿。
- 高风险关系场景加入提示。
- 不替用户做重大决定。

### 风险 5：未成年人风险

应对：

- 年龄阶段识别。
- 青春期模式下内容限制更严格。
- 对线下见面、成人关系、骚扰内容更敏感。
- 鼓励联系可信成年人。

---

## 19. 推荐项目目录

```text
social-coach-ai/
├── apps/
│   ├── web/                    # Next.js 前端
│   └── admin/                  # 管理后台
├── services/
│   ├── api/                    # FastAPI 后端
│   ├── agent/                  # LangGraph Agent
│   ├── voice/                  # STT/TTS/Reatime 语音服务
│   └── eval/                   # 评估服务
├── packages/
│   ├── shared-types/           # 共享类型
│   ├── prompts/                # Prompt 版本管理
│   └── schemas/                # JSON Schema / Pydantic
├── infra/
│   ├── docker/
│   ├── terraform/
│   └── k8s/
├── docs/
│   ├── prd.md
│   ├── technical-design.md
│   ├── safety-policy.md
│   └── evaluation-plan.md
└── tests/
    ├── agent_cases/
    ├── safety_cases/
    └── voice_cases/
```

---

## 20. 最终推荐方案

### 第一阶段：稳妥 MVP

```text
LangGraph + FastAPI + Next.js + PostgreSQL + STT/TTS
```

重点不是炫技，而是验证：

- 用户是否愿意练。
- 训练反馈是否有帮助。
- 观点表达模块是否能提升用户感知价值。
- 语音陪练是否显著提高沉浸感。

### 第二阶段：体验升级

```text
OpenAI Realtime API + WebRTC + LangGraph Tool Call
```

重点提升：

- 实时感。
- 自然对话。
- 打断。
- 角色扮演沉浸感。

### 第三阶段：平台化扩展

```text
LiveKit / Pipecat + 多角色训练房间 + 真人教练接入 + 企业/高校版本
```

重点扩展：

- 多人模拟。
- 真人教练。
- 企业培训。
- 高校就业指导。
- 多供应商模型能力。

---

## 21. 一句话技术判断

这个产品不应该被设计成“一个会聊天的 Bot”，而应该被设计成：

> 一个由 LangGraph 管理训练流程、由语音层提供真实互动、由记忆系统记录成长、由安全层控制边界的 AI 社交能力训练系统。

第一版最优解是：

```text
LangGraph 做大脑，STT/TTS 做嘴巴和耳朵，PostgreSQL 做记忆，评估系统做教研，安全模块做边界。
```

后续再根据用户量和体验要求，把语音层升级到 Realtime WebRTC / LiveKit / Pipecat。

