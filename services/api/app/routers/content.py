"""Content router - scenarios, roles, etiquette lessons."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional

router = APIRouter()


# --- Schemas ---

class Scenario(BaseModel):
    id: str
    title: str
    category: str
    icon: str
    description: str
    difficulty: int = Field(ge=1, le=5)
    tags: List[str]
    target_skill: str


class Role(BaseModel):
    id: str
    name: str
    category: str
    icon: str
    description: str
    attitude: str
    difficulty: int = Field(ge=1, le=5)
    sample_lines: List[str]


class EtiquetteLesson(BaseModel):
    id: str
    title: str
    category: str
    icon: str
    duration: str
    content: str
    key_points: List[str]
    common_mistakes: List[str]
    practice_prompt: str


class ExpressionFramework(BaseModel):
    id: str
    name: str
    description: str
    steps: List[str]
    example: str
    when_to_use: str


# --- Data ---

SCENARIOS = [
    Scenario(
        id="meeting_disagreement",
        title="会议中表达不同意见",
        category="职场",
        icon="💼",
        description="练习在工作会议中有理有据地提出不同看法",
        difficulty=3,
        tags=["职场", "表达", "冲突"],
        target_skill="逻辑性",
    ),
    Scenario(
        id="new_classmate",
        title="和新同学聊天",
        category="校园",
        icon="🎒",
        description="练习破冰和自然开启对话",
        difficulty=1,
        tags=["校园", "破冰", "社交"],
        target_skill="自信度",
    ),
    Scenario(
        id="interview",
        title="面试自我表达",
        category="职场",
        icon="🎯",
        description="练习清晰自信地介绍自己的优势",
        difficulty=3,
        tags=["职场", "面试", "自信"],
        target_skill="自信度",
    ),
    Scenario(
        id="refuse_request",
        title="拒绝不合理请求",
        category="日常",
        icon="🛡️",
        description="练习有边界感地拒绝他人",
        difficulty=2,
        tags=["日常", "边界", "拒绝"],
        target_skill="边界感",
    ),
    Scenario(
        id="conflict_friend",
        title="和朋友表达不满",
        category="朋友",
        icon="💔",
        description="练习用非暴力沟通处理矛盾",
        difficulty=3,
        tags=["朋友", "冲突", "情绪"],
        target_skill="共情度",
    ),
    Scenario(
        id="report_to_boss",
        title="向上汇报",
        category="职场",
        icon="📊",
        description="练习结构化汇报工作进展",
        difficulty=2,
        tags=["职场", "汇报", "逻辑"],
        target_skill="逻辑性",
    ),
    Scenario(
        id="networking_event",
        title="社交场合自我介绍",
        category="日常",
        icon="🤝",
        description="练习在陌生场合自然介绍自己",
        difficulty=2,
        tags=["日常", "社交", "自信"],
        target_skill="自信度",
    ),
    Scenario(
        id="ask_for_help",
        title="向他人求助",
        category="日常",
        icon="🙏",
        description="练习礼貌且清晰地提出请求",
        difficulty=1,
        tags=["日常", "请求", "礼仪"],
        target_skill="清晰度",
    ),
    Scenario(
        id="apologize",
        title="真诚道歉",
        category="日常",
        icon="💝",
        description="练习真诚且有行动力的道歉表达",
        difficulty=2,
        tags=["日常", "道歉", "共情"],
        target_skill="共情度",
    ),
    Scenario(
        id="presentation",
        title="课堂/公开演讲",
        category="校园",
        icon="📢",
        description="练习在众人面前清晰表达观点",
        difficulty=4,
        tags=["校园", "演讲", "自信"],
        target_skill="自信度",
    ),
]

ROLES = [
    Role(
        id="classmate",
        name="同学",
        category="校园",
        icon="👩‍🎓",
        description="友好的同学，适合初学者练习",
        attitude="友善、好奇",
        difficulty=1,
        sample_lines=["嗨，你是新来的吗？", "我们一起做小组作业吧？", "你周末有什么安排？"],
    ),
    Role(
        id="interviewer",
        name="面试官",
        category="职场",
        icon="👔",
        description="专业的面试官，会追问细节",
        attitude="专业、客观",
        difficulty=3,
        sample_lines=["请用3分钟介绍一下你自己", "你的缺点是什么？", "为什么选择我们公司？"],
    ),
    Role(
        id="boss",
        name="直属领导",
        category="职场",
        icon="👨‍💼",
        description="理性的领导，关注结果",
        attitude="理性但有压力感",
        difficulty=3,
        sample_lines=["这个方案的结果怎么样？", "你为什么选择这个方向？", "预算有限，你怎么考虑？"],
    ),
    Role(
        id="colleague",
        name="同事",
        category="职场",
        icon="👥",
        description="平级同事，日常协作沟通",
        attitude="平等、务实",
        difficulty=2,
        sample_lines=["这个任务你能帮我一下吗？", "我们怎么分工比较好？", " deadline 提前了，怎么办？"],
    ),
    Role(
        id="friend",
        name="朋友",
        category="日常",
        icon="🤝",
        description="好朋友，聊天比较随意",
        attitude="轻松、随意",
        difficulty=1,
        sample_lines=["周末去哪儿玩？", "我最近遇到点事...", "你觉得我这样做对吗？"],
    ),
    Role(
        id="stranger",
        name="陌生人",
        category="日常",
        icon="👋",
        description="完全不认识的人，需要破冰",
        attitude="中立、有距离感",
        difficulty=2,
        sample_lines=["你好，请问...", "这个地方怎么走？", "你也是来参加活动的吗？"],
    ),
    Role(
        id="strict_teacher",
        name="严格老师",
        category="校园",
        icon="👨‍🏫",
        description="严格的老师，要求清晰表达",
        attitude="严肃、要求高",
        difficulty=3,
        sample_lines=["你的观点依据是什么？", "数据支撑在哪里？", "能不能说得更具体一些？"],
    ),
    Role(
        id="difficult_client",
        name="挑剔客户",
        category="职场",
        icon="💼",
        description="难缠的客户，要求很多",
        attitude="苛刻、不耐烦",
        difficulty=4,
        sample_lines=["这个价格太高了", "你们的方案没什么新意", "能不能更快交付？"],
    ),
]

ETIQUETTE_LESSONS = [
    EtiquetteLesson(
        id="greeting",
        title="如何自然地打招呼",
        category="基础礼仪",
        icon="👋",
        duration="3分钟",
        content="打招呼是社交的第一步。自然的打招呼不需要过度热情，也不需要过于冷淡。关键是真诚和适度。",
        key_points=[
            "微笑是最好的开场白",
            "用对方的名字称呼会增加亲近感",
            "简短问候即可，不需要长篇大论",
            "注意对方的反应，如果对方很忙就简短一些",
        ],
        common_mistakes=[
            "过度热情让对方感到不适",
            "完全忽视对方的存在",
            "只打招呼不继续对话",
        ],
        practice_prompt="请练习向一位新认识的同学/同事打招呼，控制在2句话以内。",
    ),
    EtiquetteLesson(
        id="end_conversation",
        title="怎样礼貌地结束对话",
        category="基础礼仪",
        icon="👋",
        duration="3分钟",
        content="结束对话也是一门艺术。好的结束既不会让对方感到被冷落，又能优雅地退出。",
        key_points=[
            "先感谢对方的交流",
            "给出一个自然的结束理由",
            "表达希望下次再聊的意愿",
            "不要突然消失或不回消息",
        ],
        common_mistakes=[
            "突然不回复消息",
            "用敷衍的借口结束",
            "结束语过于生硬",
        ],
        practice_prompt="请练习礼貌地结束一次聊天对话。",
    ),
    EtiquetteLesson(
        id="meeting_etiquette",
        title="会议发言的基本礼仪",
        category="职场礼仪",
        icon="📊",
        duration="5分钟",
        content="会议发言需要注意时机、方式和内容。好的发言应该简洁有力，尊重他人时间。",
        key_points=[
            "发言前先举手或示意",
            "先说结论，再说理由",
            "控制发言时长，不占用过多时间",
            "不打断他人发言",
            "有不同意见时用委婉的方式表达",
        ],
        common_mistakes=[
            "长篇大论没有重点",
            "打断他人发言",
            "发言前不做准备",
            "情绪化地表达反对意见",
        ],
        practice_prompt="请模拟一次30秒的会议发言，表达对一个方案的支持意见。",
    ),
    EtiquetteLesson(
        id="wechat_message",
        title="微信消息怎么发才得体",
        category="线上沟通",
        icon="💬",
        duration="4分钟",
        content="线上沟通虽然没有面对面，但礼仪同样重要。清晰、礼貌、有边界感的消息会更受欢迎。",
        key_points=[
            "先说明来意，不要只发'在吗'",
            "重要消息先组织好语言再发",
            "避免在工作时间外发非紧急消息",
            "收到消息及时回复，即使只是确认收到",
            "使用适当的称呼和表情",
        ],
        common_mistakes=[
            "只发'在吗'不说事",
            "连续发多条短消息轰炸",
            "重要信息不发文字只发语音",
            "不回复对方的消息",
        ],
        practice_prompt="请写一条给同事的工作消息，说明你需要他帮忙看一份文档。",
    ),
    EtiquetteLesson(
        id="accept_praise",
        title="如何接受赞美",
        category="自信表达",
        icon="🌟",
        duration="3分钟",
        content="很多人不知道如何优雅地接受赞美，要么过度谦虚，要么显得自满。学会接受赞美也是自信的表现。",
        key_points=[
            "真诚地说'谢谢'",
            "可以适当分享努力的细节",
            "回赞对方也是一个好方法",
            "不要过度谦虚或否认",
        ],
        common_mistakes=[
            "说'没有没有，我其实很差的'",
            "完全忽视对方的赞美",
            "过度谦虚让对方尴尬",
        ],
        practice_prompt="请练习回应一句赞美：'你今天的汇报做得真好！'",
    ),
    EtiquetteLesson(
        id="dorm_relationship",
        title="宿舍关系处理技巧",
        category="校园社交",
        icon="🏠",
        duration="5分钟",
        content="宿舍是校园生活的重要场景。良好的宿舍关系需要尊重、沟通和边界感。",
        key_points=[
            "尊重他人的作息时间和习惯",
            "有问题及时沟通，不要积怨",
            "公共区域的使用要有分寸",
            "借了东西要及时归还",
            "有矛盾时先冷静再沟通",
        ],
        common_mistakes=[
            "不打招呼就用他人物品",
            "有不满但不说，背后抱怨",
            "完全不顾他人感受",
            "在宿舍大声吵闹",
        ],
        practice_prompt="请练习向室友表达：'希望晚上11点后大家能安静一些'。",
    ),
    EtiquetteLesson(
        id="boundary_expression",
        title="如何表达边界感",
        category="边界与尊重",
        icon="🛡️",
        duration="4分钟",
        content="有边界感不是冷漠，而是对自己和他人负责。学会表达边界是成熟社交的重要部分。",
        key_points=[
            "明确但不攻击性地表达边界",
            "用'我'开头而不是'你'开头",
            "给出替代方案而不是单纯拒绝",
            "坚持自己的边界，不要被说服",
        ],
        common_mistakes=[
            "明明不愿意却答应了",
            "用攻击性的方式表达边界",
            "边界模糊，时松时紧",
        ],
        practice_prompt="请练习表达边界：'我很想帮你，但我今天确实没时间，明天可以吗？'",
    ),
    EtiquetteLesson(
        id="asking_questions",
        title="如何礼貌地提问",
        category="基础礼仪",
        icon="❓",
        duration="3分钟",
        content="好的提问既能得到答案，又能让对方感到被尊重。提问前先思考，会让沟通更高效。",
        key_points=[
            "提问前先确认对方是否方便",
            "问题要具体，不要太空泛",
            "表达感谢，占用对方时间",
            "得到答案后及时反馈",
        ],
        common_mistakes=[
            "问题过于空泛，对方无法回答",
            "连环追问不给对方思考时间",
            "得到答案后没有任何反馈",
        ],
        practice_prompt="请练习向老师/领导提出一个具体的问题。",
    ),
]

EXPRESSION_FRAMEWORKS = [
    ExpressionFramework(
        id="prep",
        name="PREP 结构",
        description="观点表达的经典结构，适合有明确观点需要阐述的场景",
        steps=[
            "Point（观点）- 先说你的核心观点",
            "Reason（理由）- 给出支持你观点的理由",
            "Example（例子）- 用一个具体的例子来支撑",
            "Point（重申）- 回到观点，做总结",
        ],
        example="我建议采用A方案。因为A方案成本低、风险小。比如上次我们用类似方案，节省了30%的时间。所以我认为A方案是最优选择。",
        when_to_use="会议发言、观点辩论、方案推荐",
    ),
    ExpressionFramework(
        id="conclusion_first",
        name="结论先行",
        description="先说结论，再说理由，适合需要快速传达信息的场景",
        steps=[
            "先说结论 - 你想让对方知道什么",
            "说理由 - 为什么是这个结论",
            "给建议 - 下一步该怎么做",
        ],
        example="我们下周可以上线。因为开发已经完成，测试也通过了。建议你明天确认一下最终文案。",
        when_to_use="工作汇报、进度同步、快速沟通",
    ),
    ExpressionFramework(
        id="problem_solution",
        name="问题-原因-方案",
        description="适合需要说明问题并提出解决方案的场景",
        steps=[
            "问题是什么 - 清楚地描述现状",
            "为什么会发生 - 分析问题的原因",
            "可以怎么解决 - 提出具体方案",
        ],
        example="最近的转化率下降了。分析发现是因为新用户引导流程太长。建议我们把注册步骤从5步减少到3步。",
        when_to_use="问题汇报、方案提案、复盘分析",
    ),
    ExpressionFramework(
        id="fact_feeling",
        name="事实-感受-需求-请求",
        description="适合情感沟通和边界表达，不容易引起对方防御",
        steps=[
            "事实 - 客观地描述发生的事情",
            "感受 - 表达这件事带给你的感受",
            "需求 - 你真正需要的是什么",
            "请求 - 具体希望对方怎么做",
        ],
        example="这周你有三次没有回复我的消息（事实），我感到有点担心和不被重视（感受），我希望我们的沟通能更及时（需求），你能尽量当天回复我吗（请求）？",
        when_to_use="亲密关系沟通、朋友矛盾、边界表达",
    ),
]


# --- Routes ---

@router.get("/scenarios", response_model=List[Scenario])
async def list_scenarios(category: Optional[str] = None, difficulty: Optional[int] = None):
    """List available training scenarios."""
    result = SCENARIOS
    if category:
        result = [s for s in result if s.category == category]
    if difficulty:
        result = [s for s in result if s.difficulty == difficulty]
    return result


@router.get("/scenarios/{scenario_id}", response_model=Scenario)
async def get_scenario(scenario_id: str):
    """Get a specific scenario."""
    for s in SCENARIOS:
        if s.id == scenario_id:
            return s
    raise HTTPException(status_code=404, detail="场景未找到")


@router.get("/roles", response_model=List[Role])
async def list_roles(category: Optional[str] = None):
    """List available roleplay roles."""
    if category:
        return [r for r in ROLES if r.category == category]
    return ROLES


@router.get("/roles/{role_id}", response_model=Role)
async def get_role(role_id: str):
    """Get a specific role."""
    for r in ROLES:
        if r.id == role_id:
            return r
    raise HTTPException(status_code=404, detail="角色未找到")


@router.get("/etiquette", response_model=List[EtiquetteLesson])
async def list_etiquette(category: Optional[str] = None):
    """List etiquette lessons."""
    if category:
        return [e for e in ETIQUETTE_LESSONS if e.category == category]
    return ETIQUETTE_LESSONS


@router.get("/etiquette/{lesson_id}", response_model=EtiquetteLesson)
async def get_etiquette(lesson_id: str):
    """Get a specific etiquette lesson."""
    for e in ETIQUETTE_LESSONS:
        if e.id == lesson_id:
            return e
    raise HTTPException(status_code=404, detail="课程内容未找到")


@router.get("/frameworks", response_model=List[ExpressionFramework])
async def list_frameworks():
    """List expression frameworks."""
    return EXPRESSION_FRAMEWORKS


@router.get("/categories")
async def list_categories():
    """List all content categories."""
    scenario_categories = list(set(s.category for s in SCENARIOS))
    role_categories = list(set(r.category for r in ROLES))
    etiquette_categories = list(set(e.category for e in ETIQUETTE_LESSONS))
    return {
        "scenarios": scenario_categories,
        "roles": role_categories,
        "etiquette": etiquette_categories,
    }


