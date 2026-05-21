// Mock data for the MVP

export interface SafetyCheck {
  risk_level: "none" | "low" | "medium" | "high" | "crisis";
  action: string | null;
  message: string | null;
}

export interface AgentTurnResponse {
  reply_text: string;
  intent: string | null;
  scores: TrainingFeedback;
  safety: SafetyCheck;
  next_action: string | null;
}

export interface TrainingFeedback {
  clarity: number;
  logic: number;
  evidence: number;
  confidence: number;
  etiquette: number;
  boundary: number;
  strengths: string[];
  improvements: string[];
  rewritten_expression: string;
  next_practice: string;
}

export const mockScenarios = [
  {
    id: "meeting_disagreement",
    title: "会议中表达不同意见",
    category: "职场",
    icon: "💼",
    description: "练习在工作会议中有理有据地提出不同看法",
    difficulty: 3,
  },
  {
    id: "new_classmate",
    title: "和新同学聊天",
    category: "校园",
    icon: "🎒",
    description: "练习破冰和自然开启对话",
    difficulty: 1,
  },
  {
    id: "interview",
    title: "面试自我表达",
    category: "职场",
    icon: "🎯",
    description: "练习清晰自信地介绍自己的优势",
    difficulty: 3,
  },
  {
    id: "refuse_request",
    title: "拒绝不合理请求",
    category: "日常",
    icon: "🛡️",
    description: "练习有边界感地拒绝他人",
    difficulty: 2,
  },
  {
    id: "conflict_friend",
    title: "和朋友表达不满",
    category: "朋友",
    icon: "💔",
    description: "练习用非暴力沟通处理矛盾",
    difficulty: 3,
  },
  {
    id: "report_to_boss",
    title: "向上汇报",
    category: "职场",
    icon: "📊",
    description: "练习结构化汇报工作进展",
    difficulty: 2,
  },
];

export const mockRoles = [
  { id: "classmate", name: "同学", icon: "👩‍🎓", category: "校园" },
  { id: "interviewer", name: "面试官", icon: "👔", category: "职场" },
  { id: "boss", name: "直属领导", icon: "👨‍💼", category: "职场" },
  { id: "colleague", name: "同事", icon: "👥", category: "职场" },
  { id: "friend", name: "朋友", icon: "🤝", category: "日常" },
  { id: "stranger", name: "陌生人", icon: "👋", category: "日常" },
];

export const mockFeedback: TrainingFeedback = {
  clarity: 5,
  logic: 4,
  evidence: 3,
  confidence: 5,
  etiquette: 8,
  boundary: 7,
  strengths: ["表达了不同意见", "语气温和有礼貌"],
  improvements: ["观点不够明确", "缺少具体理由", "没给出替代方案"],
  rewritten_expression:
    "我建议这次不要完全沿用上次方案。原因是上次报名转化率只有 18%，低于预期。如果我们这次把宣传重点改成用户案例，可能会更容易吸引目标人群。",
  next_practice: "请用 PREP 结构重新表达：先说结论，再说两个理由，最后给一个建议。",
};

export const mockGrowthData = {
  totalSessions: 12,
  totalPracticeMinutes: 86,
  streakDays: 3,
  scores: {
    clarity: [5, 5, 6, 6, 7, 7],
    logic: [4, 4, 5, 5, 6, 6],
    confidence: [3, 4, 4, 5, 5, 6],
    etiquette: [6, 7, 7, 8, 8, 8],
  },
  recentSessions: [
    {
      date: "2026-05-21",
      scene: "会议中表达不同意见",
      score: 6.5,
      mode: "观点表达训练",
    },
    {
      date: "2026-05-20",
      scene: "和新同学聊天",
      score: 7.0,
      mode: "角色扮演",
    },
    {
      date: "2026-05-19",
      scene: "拒绝不合理请求",
      score: 6.0,
      mode: "边界表达训练",
    },
  ],
};

export const mockEtiquetteLessons = [
  {
    id: 1,
    title: "如何自然地打招呼",
    category: "基础礼仪",
    duration: "3 分钟",
  },
  {
    id: 2,
    title: "怎样礼貌地结束对话",
    category: "基础礼仪",
    duration: "3 分钟",
  },
  {
    id: 3,
    title: "会议发言的基本礼仪",
    category: "职场礼仪",
    duration: "5 分钟",
  },
  {
    id: 4,
    title: "微信消息怎么发才得体",
    category: "线上沟通",
    duration: "4 分钟",
  },
  {
    id: 5,
    title: "如何接受赞美",
    category: "自信表达",
    duration: "3 分钟",
  },
  {
    id: 6,
    title: "宿舍关系处理技巧",
    category: "校园社交",
    duration: "5 分钟",
  },
];
