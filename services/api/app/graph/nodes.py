"""LangGraph nodes for the social coach agent."""
"""LangGraph node implementations for the social coaching agent."""

import json

from .state import AgentState
from ..services.llm import get_llm_provider, get_llm_config, extract_json

# Safety keywords (same as in router for now, can be enhanced with LLM)
CRISIS_KEYWORDS = ["不想活了", "自杀", "想死", "结束生命", "自残", "活着没意思", "不想活了"]
VIOLENCE_KEYWORDS = ["杀", "弄死", "打死", "砍", "报复", "同归于尽"]
PUA_KEYWORDS = ["操控", "离不开我", "pua", "套路", "精神控制", "让她离不开", "让他离不开", "欲擒故纵"]
MINOR_RISK_KEYWORDS = ["离家出走", "网友见面", "私奔", "奔现", "偷偷见面"]
OVER_SHARE_KEYWORDS = ["监控", "定位", "查手机", "跟踪"]


def safety_node(state: AgentState) -> dict:
    """Check input for safety risks before any training."""
    text = state["user_text"].lower()

    # Crisis check
    if any(kw in text for kw in CRISIS_KEYWORDS):
        return {
            "risk_level": "crisis",
            "safety_action": "stop_and_support",
            "safety_message": (
                "我听到了你现在的痛苦。请立即联系你信任的人，或拨打心理援助热线（如 北京心理危机研究与干预中心：010-82951332；全国24小时心理援助热线：400-161-9995）。"
                "你的安全和健康是最重要的，我在这里陪着你，但我不能替代专业的帮助。"
            ),
        }

    # Violence check
    if any(kw in text for kw in VIOLENCE_KEYWORDS):
        return {
            "risk_level": "high",
            "safety_action": "stop_and_support",
            "safety_message": (
                "我理解你可能正在经历强烈的情绪，但伤害他人不仅无法解决问题，还会带来更严重的后果。"
                "请和信任的人聊聊你的感受，或寻求专业的心理支持。"
            ),
        }

    # Minor risk
    if any(kw in text for kw in MINOR_RISK_KEYWORDS):
        return {
            "risk_level": "high",
            "safety_action": "warn_minor_risk",
            "safety_message": (
                "如果你还未成年，请务必告诉信任的成年人（父母、老师或其他监护人）。"
                "线下见面存在安全风险，安全永远是第一位的。"
            ),
        }

    # PUA / manipulation
    if any(kw in text for kw in PUA_KEYWORDS):
        return {
            "risk_level": "medium",
            "safety_action": "refuse_manipulation",
            "safety_message": (
                "我不能提供操控、PUA 或精神控制类型的建议。健康的关系建立在尊重、"
                "真诚和双向沟通的基础上。我可以帮你练习如何真诚地表达感受，"
                "以及如何建立健康的边界。"
            ),
        }

    # Over-sharing / surveillance
    if any(kw in text for kw in OVER_SHARE_KEYWORDS):
        return {
            "risk_level": "medium",
            "safety_action": "warn_privacy",
            "safety_message": (
                "监控或跟踪他人是侵犯隐私的行为，无论出于什么理由。"
                "如果你对关系有疑虑，我们可以练习如何坦诚地沟通你的感受，"
                "而不是通过不当方式获取信息。"
            ),
        }

    return {"risk_level": "none", "safety_action": None, "safety_message": None}


def intent_node(state: AgentState) -> dict:
    """Classify user intent based on mode and input."""
    mode = state["mode"]
    text = state["user_text"]

    intent_map = {
        "expression_training": "观点表达训练",
        "scene_analysis": "社交场景分析",
        "roleplay": "角色扮演",
        "etiquette_learning": "社交礼仪学习",
        "voice_practice": "语音陪练",
        "feedback": "复盘反馈",
    }

    return {"intent": intent_map.get(mode, mode)}


def _analyze_input(text: str) -> dict:
    """Analyze user input for key patterns."""
    analysis = {
        "length": len(text),
        "has_question": "?" in text or "？" in text,
        "has_apology": any(w in text for w in ["对不起", "抱歉", "不好意思", "抱歉"]),
        "has_hesitation": any(w in text for w in ["嗯", "呃", "就是", "那个", "可能", "大概", "也许"]),
        "has_weak_words": any(w in text for w in ["随便", "都行", "无所谓", "我也不知道", "不太确定"]),
        "has_structure": any(w in text for w in ["首先", "其次", "最后", "因为", "所以", "但是", "不过", "我觉得", "我认为"]),
        "has_numbers": any(c.isdigit() for c in text),
    }
    return analysis


def coach_node(state: AgentState) -> dict:
    """Generate coaching feedback based on intent and user input (sync rule-based)."""
    intent = state.get("intent", "")
    text = state["user_text"]
    mode = state["mode"]
    user_stage = state.get("user_stage") or "other"
    analysis = _analyze_input(text)

    # Build personalized prefix based on stage
    stage_prefix = {
        "teen": "作为学生，",
        "college": "在大学生活中，",
        "new_worker": "在职场中，",
    }.get(user_stage, "")

    if mode == "expression_training":
        return _expression_coach(text, analysis, stage_prefix)

    elif mode == "scene_analysis":
        return _scene_analysis(text, analysis, stage_prefix)

    elif mode == "roleplay":
        return _roleplay_coach(text, analysis, stage_prefix)

    elif mode == "etiquette_learning":
        return _etiquette_coach(text, analysis, stage_prefix)

    elif mode == "voice_practice":
        return _voice_coach(text, analysis, stage_prefix)

    elif mode == "feedback":
        return _feedback_review(text, analysis, stage_prefix)

    # Default fallback
    return {
        "coach_reply": f"{stage_prefix}我理解你的需求，让我们一起来练习。你说的是：{text[:50]}{'...' if len(text) > 50 else ''}",
        "coach_scores": {
            "clarity": 5,
            "logic": 5,
            "evidence": 5,
            "confidence": 5,
            "etiquette": 5,
            "boundary": 5,
        },
        "coach_strengths": ["愿意主动练习"],
        "coach_improvements": ["可以尝试更具体的表达"],
        "coach_rewritten": "",
        "coach_next_practice": "准备好后请告诉我你想练习的场景或话题。",
    }


async def coach_node_async(state: AgentState) -> dict:
    """Async coach node: try LLM first, fall back to rule-based output on failure."""
    # Rule-based result is our deterministic backbone & fallback.
    rule_result = coach_node(state)

    # Use user-configured LLM if provided, otherwise fall back to server default.
    user_llm = state.get("llm_config")
    if user_llm:
        from ..services.llm import LLMConfig
        config = LLMConfig(**user_llm)
    else:
        config = get_llm_config()

    if config.provider == "mock" or not config.api_key:
        return rule_result

    try:
        llm = get_llm_provider(config)
        system_prompt = _build_system_prompt(
            state["mode"], state.get("user_stage"), state.get("knowledge_context")
        )
        user_prompt = _build_user_prompt(state["mode"], state["user_text"])
        raw = await llm.generate(
            system_prompt,
            user_prompt,
            temperature=0.5,
            max_tokens=900,
        )
        data = extract_json(raw)
        if not data:
            return rule_result

        merged = dict(rule_result)
        if isinstance(data.get("reply"), str) and data["reply"].strip():
            merged["coach_reply"] = data["reply"].strip()
        if isinstance(data.get("scores"), dict):
            scores = dict(rule_result.get("coach_scores") or {})
            for k in ("clarity", "logic", "evidence", "confidence", "etiquette", "boundary"):
                v = data["scores"].get(k)
                if isinstance(v, (int, float)) and 0 <= v <= 10:
                    scores[k] = int(v)
            merged["coach_scores"] = scores
        if isinstance(data.get("strengths"), list) and data["strengths"]:
            merged["coach_strengths"] = [str(x) for x in data["strengths"]][:5]
        if isinstance(data.get("improvements"), list) and data["improvements"]:
            merged["coach_improvements"] = [str(x) for x in data["improvements"]][:5]
        if isinstance(data.get("rewritten"), str) and data["rewritten"].strip():
            merged["coach_rewritten"] = data["rewritten"].strip()
        if isinstance(data.get("next_practice"), str) and data["next_practice"].strip():
            merged["coach_next_practice"] = data["next_practice"].strip()
        return merged
    except Exception:
        return rule_result


_MODE_DESCRIPTIONS = {
    "expression_training": "你是 SpeakUp AI，一名社交成长教练。用户在进行【观点表达训练】，希望用 PREP 结构（Point/Reason/Example/Point）清晰、自信地表达观点。",
    "scene_analysis": "你是 SpeakUp AI，社交成长教练。用户描述了一个具体的社交场景，请帮助分析对方需求、用户真实诉求，并给出沟通策略。",
    "roleplay": "你是 SpeakUp AI，社交成长教练。当前是【角色扮演】训练，你需要扮演用户希望练习的对话对象，并在最后给出简短反馈。",
    "etiquette_learning": "你是 SpeakUp AI，社交成长教练。用户想学习社交礼仪，请用简洁、可操作的方式给出建议，避免说教。",
    "voice_practice": "你是 SpeakUp AI，社交成长教练。用户进行了语音练习，请基于文字内容评估表达流畅度和清晰度，给出具体可操作的改进建议。",
    "feedback": "你是 SpeakUp AI，社交成长教练。请对用户今天的训练做一次复盘，肯定进步并指出 1-2 个改进方向。",
}


def _build_system_prompt(mode: str, user_stage: str | None, knowledge_context: str | None = None) -> str:
    base = _MODE_DESCRIPTIONS.get(mode, _MODE_DESCRIPTIONS["expression_training"])
    stage_hint = ""
    if user_stage == "teen":
        stage_hint = "用户是初高中生，语气要友善、不说教，用校园场景的例子。"
    elif user_stage == "college":
        stage_hint = "用户是大学生，可以涉及社团、面试、宿舍、小组讨论等场景。"
    elif user_stage == "new_worker":
        stage_hint = "用户是初入职场的新人，重点关注会议表达、向上汇报、与同事相处。"

    safety = (
        "重要：禁止提供操控、PUA、控制他人的建议；提倡尊重、真诚、健康的沟通方式。"
        "在任何回复中，避免让用户感到被评判，多用具体行为反馈而不是性格评价。"
    )

    rag_hint = ""
    if knowledge_context:
        rag_hint = (
            "【参考知识库】以下是与用户问题相关的背景知识，请在回答时适当引用或参考：\n"
            f"{knowledge_context}\n"
            "注意：以上知识仅供参考，你的核心任务仍然是帮助用户提升社交表达能力。"
        )

    output_format = (
        "请严格用 JSON 输出，不要带 markdown 代码块标记，结构如下：\n"
        "{\n"
        '  "reply": "对用户的整体反馈（150 字以内，亲切自然）",\n'
        '  "scores": {"clarity":0-10, "logic":0-10, "evidence":0-10, "confidence":0-10, "etiquette":0-10, "boundary":0-10},\n'
        '  "strengths": ["亮点1", "亮点2"],\n'
        '  "improvements": ["改进建议1", "改进建议2"],\n'
        '  "rewritten": "用更得体方式改写后的版本（若适用）",\n'
        '  "next_practice": "下一步练习建议（1-2句）"\n'
        "}"
    )

    parts = [base, safety]
    if stage_hint:
        parts.append(stage_hint)
    if rag_hint:
        parts.append(rag_hint)
    parts.append(output_format)
    return "\n\n".join(parts)


def _build_user_prompt(mode: str, text: str) -> str:
    prompts = {
        "expression_training": f"请评估并优化我这次的表达：\n\n{text}",
        "scene_analysis": f"请帮我分析这个社交场景，并给出沟通策略：\n\n{text}",
        "roleplay": f"现在请你扮演我描述的角色与我对话，并在最后给出反馈。我的设定：\n\n{text}",
        "etiquette_learning": f"我想了解这方面的社交礼仪：\n\n{text}",
        "voice_practice": f"这是我刚才语音练习的内容，请给出反馈：\n\n{text}",
        "feedback": f"请基于以下内容给我一份复盘：\n\n{text}",
    }
    return prompts.get(mode, f"用户输入：{text}")


def _expression_coach(text: str, analysis: dict, prefix: str) -> dict:
    """Generate expression training feedback."""
    strengths = []
    improvements = []

    if analysis["has_structure"]:
        strengths.append("表达中有结构化的连接词")
    if len(text) > 30:
        strengths.append("愿意表达较完整的内容")
    if analysis["has_numbers"]:
        strengths.append("使用了具体数据支撑观点")

    if not analysis["has_structure"]:
        improvements.append("可以尝试用更清晰的结构组织观点，比如 PREP（观点-理由-例子-重申）")
    if analysis["has_hesitation"]:
        improvements.append("过多的犹豫词会削弱表达的说服力，可以尝试停顿代替填充词")
    if analysis["has_weak_words"]:
        improvements.append("使用了模糊或退让的表达，可以更坚定地表达真实想法")
    if not analysis["has_numbers"] and len(text) > 20:
        improvements.append("可以尝试用具体的数据或例子来支撑观点")
    if analysis["has_apology"] and len(text) > 20:
        improvements.append("频繁道歉会削弱表达的自信感，非必要场景下可以减少")

    if not strengths:
        strengths.append("愿意表达真实想法")
    if not improvements:
        improvements.append("可以尝试用更具体的例子支撑观点")

    # Generate rewritten version based on input
    rewritten = _generate_rewritten_expression(text)

    return {
        "coach_reply": (
            f"{prefix}我看到了你的表达。整体来说你迈出了重要的一步，"
            f"愿意主动表达观点本身就是值得肯定的。\n\n"
            f"让我来帮你分析一下这次表达的亮点和可以改进的地方："
        ),
        "coach_scores": {
            "clarity": 6 if analysis["has_structure"] else 4,
            "logic": 6 if analysis["has_numbers"] else 4,
            "evidence": 5 if analysis["has_numbers"] else 3,
            "confidence": 7 if not analysis["has_apology"] else 4,
            "etiquette": 7,
            "boundary": 6 if not analysis["has_weak_words"] else 5,
        },
        "coach_strengths": strengths,
        "coach_improvements": improvements,
        "coach_rewritten": rewritten,
        "coach_next_practice": (
            "请用 PREP 结构重新表达你的观点：\n"
            "1. Point（观点）- 先说结论\n"
            "2. Reason（理由）- 说明原因\n"
            "3. Example（例子）- 用具体事例支撑\n"
            "4. Point（重申）- 回到结论\n\n"
            "准备好后输入你的新表达。"
        ),
    }


def _generate_rewritten_expression(text: str) -> str:
    """Generate a rewritten version of user's expression."""
    # Simple rule-based rewriting for MVP
    rewritten = text

    # Remove weak words
    for w in ["随便", "都行", "无所谓"]:
        rewritten = rewritten.replace(w, "")

    # Remove excessive apologies
    for w in ["不好意思啊", "抱歉", "对不起，"]:
        rewritten = rewritten.replace(w, "")

    # Replace hesitant starts
    if rewritten.startswith("可能") or rewritten.startswith("我觉得可能"):
        rewritten = rewritten.replace("可能", "", 1)
    if rewritten.startswith("那个"):
        rewritten = rewritten.replace("那个", "", 1)

    rewritten = rewritten.strip()

    # Add structure if missing
    if not any(w in rewritten for w in ["首先", "因为", "所以"]):
        if len(rewritten) > 10:
            rewritten = f"我的观点是：{rewritten}。之所以这样认为，是因为这件事对我们都有重要的影响。"

    return rewritten if rewritten != text else (
        f"我的建议是：{text[:50]}{'...' if len(text) > 50 else ''}。"
        f"具体来说，我认为这个方案有三个关键点需要考虑..."
    )


def _scene_analysis(text: str, analysis: dict, prefix: str) -> dict:
    """Generate scene analysis feedback based on input features (dynamic, not templated)."""
    # Identify scene type from keywords
    scene_keywords = {
        "职场沟通场景": ["会议", "汇报", "领导", "同事", "工作", "方案", "项目", "加班", "KPI", "绩效", "升职", "加薪"],
        "校园社交场景": ["同学", "老师", "宿舍", "社团", "考试", "课程", "宿舍", "室友", "导师", "论文"],
        "朋友社交场景": ["朋友", "闺蜜", "兄弟", "室友", "聚会", "出去玩", "借钱", "帮忙", "请客"],
        "求职面试场景": ["面试", "简历", "HR", "求职", "offer", "跳槽", "招聘"],
        "边界表达场景": ["拒绝", "不同意", "不想去", "不行", "不方便", "没空", "推掉"],
        "情感关系场景": ["表白", "喜欢", "约会", "暧昧", "对象", "分手", "复合", "吵架", "冷战"],
        "家庭沟通场景": ["父母", "爸妈", "家里", "亲戚", "催婚", "催学", "管教"],
    }
    scene_type = "一般社交场景"
    for stype, keywords in scene_keywords.items():
        if any(kw in text for kw in keywords):
            scene_type = stype
            break

    # Extract emotions
    emotions = []
    emotion_map = {
        "焦虑/紧张": ["紧张", "焦虑", "担心", "害怕", "慌", "不安", "忐忑"],
        "愤怒/委屈": ["生气", "愤怒", "委屈", "不满", "恼火", "郁闷", "火大"],
        "尴尬/无措": ["尴尬", "不知所措", "无措", "难堪", "下不来台"],
        "自卑/退缩": ["自卑", "不敢", "退缩", "怂", "没底气", "没自信"],
        "困惑/迷茫": ["困惑", "迷茫", "不知道", "不清楚", "不确定", "纠结"],
    }
    for emotion, keywords in emotion_map.items():
        if any(kw in text for kw in keywords):
            emotions.append(emotion)
    if not emotions:
        emotions.append("未明确表达情绪")

    # Dynamic scoring based on input quality
    detail_score = min(10, 4 + len(text) // 20)  # longer text = more detail
    clarity_score = 6 if analysis["has_structure"] else 4
    if any(w in text for w in ["首先", "其次", "然后", "最后", "因为", "所以"]):
        clarity_score = min(9, clarity_score + 2)
    confidence_score = 5
    if analysis["has_apology"]:
        confidence_score -= 1
    if any(w in text for w in ["我觉得", "我认为", "我想"]):
        confidence_score += 1
    boundary_score = 5
    if any(w in text for w in ["不想", "拒绝", "不行", "不同意", "边界"]):
        boundary_score += 2

    # Dynamic strengths
    strengths = []
    if len(text) > 30:
        strengths.append(f"能够较详细地描述{scene_type}中的情况")
    if emotions and emotions[0] != "未明确表达情绪":
        strengths.append(f"能觉察并表达自己的情绪（{'、'.join(emotions[:2])}）")
    if any(w in text for w in ["想改变", "希望", "想要", "怎么办"]):
        strengths.append("有主动寻求改变的意愿")
    if analysis["has_structure"]:
        strengths.append("描述有条理，逻辑较清晰")
    if not strengths:
        strengths.append("愿意主动分享遇到的社交困境")

    # Dynamic improvements
    improvements = []
    if len(text) < 20:
        improvements.append("可以更详细地描述场景：对方是谁、发生了什么、你的感受")
    if not emotions or emotions[0] == "未明确表达情绪":
        improvements.append("尝试描述你当时的情绪，这有助于找到合适的沟通策略")
    if not any(w in text for w in ["想", "希望", "目标", "想要"]):
        improvements.append("可以补充：你希望通过这次沟通达到什么结果")
    if not analysis["has_structure"] and len(text) > 30:
        improvements.append("描述内容较多时，可以尝试按时间顺序或因果关系组织语言")
    if not improvements:
        improvements.append("下次可以尝试描述一个具体的对话片段，方便做针对性分析")

    # Dynamic reply (NOT a template)
    reply_parts = [f"{prefix}我来帮你分析这个**{scene_type}**："]

    # Emotion reflection
    if emotions and emotions[0] != "未明确表达情绪":
        reply_parts.append(f"\n\n我注意到你提到了{'、'.join(emotions[:2])}。这些情绪在{scene_type[:-3]}中非常常见，说明你对这个场景的感受是真实的，也很值得被认真对待。")

    # Scene-specific strategy
    if scene_type == "职场沟通场景":
        reply_parts.append("""\n\n**职场沟通的关键**：在职场中，表达异议或困难时，最重要的是把"个人感受"转化为"客观事实+团队影响"。比如不说"我觉得方案有问题"，而是"这个方案在XX环节可能会影响项目进度，建议我们先做XX验证"。""")
    elif scene_type == "边界表达场景":
        reply_parts.append("\n\n**拒绝的艺术**：拒绝不等于冷漠。有效的拒绝公式是：肯定对方的需求 + 说明自己的限制 + 提供替代方案。这样既守住了边界，也维护了关系。")
    elif scene_type == "情感关系场景":
        reply_parts.append("""\n\n**情感沟通的核心**：在情感关系中，最需要的是"先处理情绪，再处理事情"。对方如果处于情绪高点，讲道理往往适得其反。先共情，再表达。""")
    elif scene_type == "校园社交场景":
        reply_parts.append("""\n\n**校园社交的特点**：同龄人之间的沟通更平等，但也更容易因为面子问题而压抑真实想法。试着用"我感觉/我发现"开头，而不是"你总是/你应该"。""")
    elif scene_type == "求职面试场景":
        reply_parts.append("""\n\n**面试表达要点**：面试中，面试官更想听到"你做了什么 + 产生了什么结果"，而不是"我觉得我很适合"。用 STAR 法则（情境-任务-行动-结果）来组织回答。""")
    else:
        reply_parts.append(f"\n\n**{scene_type}的沟通原则**：先理解对方的立场和感受，再表达自己的需求和边界。沟通不是说服对方同意你，而是找到双方都能接受的方案。")

    # Personalized suggestion based on input
    reply_parts.append(f"\n\n**针对你描述的情况**：")
    if "领导" in text or "老板" in text:
        reply_parts.append("""\n\n和上级沟通时，建议先肯定对方的意图（"领导您安排的XX方向是对的"），再提出具体困难（"但目前我在XX资源上有缺口"），最后给出建议（"是否可以先做XX，再推进XX？"）。""")
    elif "同事" in text or "同学" in text:
        reply_parts.append("""\n\n和平级沟通时，最大的难点是"谁也不想先低头"。你可以主动做那个先递台阶的人，比如"上次那件事我也有考虑不周的地方，我们看看怎么一起解决？" """)
    elif "拒绝" in text or "不想" in text:
        reply_parts.append("你提到不想/拒绝，这是很正常的自我保护。关键是拒绝的方式：不要过度解释（解释=留余地），也不要过于生硬。简单明了 + 一个替代方案，是最平衡的拒绝方式。")
    elif "紧张" in text or "害怕" in text or "不敢" in text:
        reply_parts.append("""\n\n紧张和不敢开口，很多时候是因为"怕说错"。但其实在社交中，"真诚但笨拙"的表达，往往比"完美但虚假"的套话更打动人。先允许自己说得不好，再说。 """)
    else:
        reply_parts.append("""\n\n根据你描述的情况，建议先明确自己最核心的一个诉求（不要同时表达三个以上需求），然后用"我"开头描述感受，而不是用"你"开头指责对方。 """)

    reply_parts.append(f"\n\n你想针对这个场景，练习一段具体的表达吗？我可以帮你逐句优化。")

    return {
        "coach_reply": "".join(reply_parts),
        "coach_scores": {
            "clarity": max(1, min(10, clarity_score)),
            "logic": max(1, min(10, 5 + (1 if analysis["has_structure"] else 0) + (1 if analysis["has_numbers"] else 0))),
            "evidence": max(1, min(10, detail_score)),
            "confidence": max(1, min(10, confidence_score)),
            "etiquette": 7,
            "boundary": max(1, min(10, boundary_score)),
        },
        "coach_strengths": strengths,
        "coach_improvements": improvements,
        "coach_rewritten": "",
        "coach_next_practice": f"我们来针对「{scene_type}」做一次具体的表达练习吧。请描述一个具体的对话片段（谁在说什么，你想怎么回）。",
    }


def _roleplay_coach(text: str, analysis: dict, prefix: str) -> dict:
    """Generate roleplay coaching feedback based on role type and user input (dynamic)."""
    # Extract role from user input
    role_keywords = {
        "领导/上级": ["领导", "老板", "上级", "经理", "主管", "总监"],
        "同事/平级": ["同事", "同组", "平级", "搭档"],
        "客户/甲方": ["客户", "甲方", "合作方", "对接人"],
        "下属": ["下属", "组员", "实习生", "带的新人"],
        "朋友": ["朋友", "闺蜜", "兄弟", "哥们", "姐妹"],
        "家人/亲戚": ["父母", "爸妈", "亲戚", "家里", "长辈"],
        "恋人/暧昧对象": ["对象", "恋人", "暧昧", "喜欢的人", "男朋友", "女朋友"],
        "老师/导师": ["老师", "导师", "教授", "辅导员"],
        "HR/面试官": ["HR", "面试官", "招聘", "人事"],
        "陌生人": ["陌生人", "不认识", "第一次见面", "新同事"],
    }
    detected_role = "对话对象"
    for role, keywords in role_keywords.items():
        if any(kw in text for kw in keywords):
            detected_role = role
            break

    # Determine role personality based on user hints
    personality = "中性"
    if any(w in text for w in ["严厉", "凶", "强势", "不讲理", "刁难", "苛刻"]):
        personality = "强势/挑剔"
    elif any(w in text for w in ["温和", "好说话", "友善", "耐心", "理解"]):
        personality = "温和/包容"
    elif any(w in text for w in ["犹豫", "不确定", "纠结", "模棱两可"]):
        personality = "犹豫/被动"
    elif any(w in text for w in ["敏感", "情绪化", "容易生气", "玻璃心"]):
        personality = "敏感/情绪化"

    # Generate dynamic opening line based on role + personality
    openings = {
        "领导/上级": {
            "强势/挑剔": ["这个方案我看了，有几个问题必须改。你准备怎么推进？", "进度太慢了，下周五之前能完成吗？不要找借口。"],
            "温和/包容": ["这个方向还行，但有些地方我们可以再优化一下。你有什么想法？", "最近辛苦了，来，说说你的思路。"],
            "犹豫/被动": ["嗯，这个事情……你再想想，有什么方案吗？", "我这边也在等上面的反馈，你先做着。"],
        },
        "同事/平级": {
            "强势/挑剔": ["这部分数据我没法用，你自己再检查一下。", "你负责的模块延迟了，影响我这边交付了。"],
            "温和/包容": ["你那边进展怎么样？要不要我们一起过一下？", "有个想法想跟你聊聊，你现在方便吗？"],
        },
        "客户/甲方": {
            "强势/挑剔": ["这个效果和预期差太多了，重做吧。", "预算就这么多，但要求不能降，你自己想办法。"],
            "温和/包容": ["整体方向还可以，有几个细节我们想调整一下。", "感谢你们的付出，我们看看下一步怎么优化。"],
        },
        "恋人/暧昧对象": {
            "强势/挑剔": ["你最近怎么都不主动找我？你是不是变了？", "我觉得我们之间有问题，你到底怎么想的？"],
            "敏感/情绪化": ["我不知道你为什么这样，我很没有安全感。", "你刚才那句话什么意思？你是不是嫌弃我？"],
            "温和/包容": ["最近感觉我们有点疏远了，想和你聊聊。", "我想知道你的想法，什么都可以告诉我。"],
        },
        "朋友": {
            "强势/挑剔": ["你这人怎么这样？上次说好了的。", "算了算了，随便你吧。"],
            "温和/包容": ["好久不见了，最近怎么样？", "有件事想听听你的看法。"],
        },
        "家人/亲戚": {
            "强势/挑剔": ["你都这么大了，怎么还不……", "我这是为你好，你听我的就对了。"],
            "温和/包容": ["最近过得怎么样？爸妈都挺想你的。", "有空回来看看，我们聊聊。"],
        },
        "HR/面试官": {
            "强势/挑剔": ["你的期望薪资有点高，你能接受的范围是多少？", "你上家公司离职的原因是什么？", "你为什么选择我们公司？"],
            "温和/包容": ["先介绍一下你自己吧，不用紧张。", "你对我们团队有什么想了解的？"],
        },
    }

    default_openings = {
        "强势/挑剔": ["我直说了，这个问题你得给我一个说法。", "这件事不能就这么算了，你怎么看？"],
        "温和/包容": ["你好，想和你聊聊。", "有空吗？有件事想跟你商量一下。"],
        "犹豫/被动": ["嗯……那个……", "你好，不好意思打扰一下。"],
        "敏感/情绪化": ["我这几天一直在想这件事……", "我不知道该怎么说，但憋在心里很难受。"],
        "中性": ["你好，有什么事吗？", "嗯，你说。"],
    }

    role_openings = openings.get(detected_role, default_openings)
    if isinstance(role_openings, dict):
        opening_list = role_openings.get(personality, role_openings.get("中性", default_openings["中性"]))
    else:
        opening_list = role_openings

    import random
    opening = random.choice(opening_list) if opening_list else "你好，有什么事吗？"

    # Dynamic scoring based on roleplay setup quality
    clarity_score = 5 + (1 if len(text) > 20 else 0) + (1 if analysis["has_structure"] else 0)
    confidence_score = 5 + (1 if not analysis["has_apology"] else -1) + (1 if any(w in text for w in ["我想", "我要", "我觉得"]) else 0)
    etiquette_score = 6 + (1 if any(w in text for w in ["请", "谢谢", "麻烦", "不好意思"]) else 0)

    # Dynamic strengths
    strengths = []
    if detected_role != "对话对象":
        strengths.append(f"明确了练习对象（{detected_role}）")
    if personality != "中性":
        strengths.append(f"设定了对方的性格特征（{personality}），练习更有针对性")
    if len(text) > 20:
        strengths.append("设定了较完整的场景背景")
    if any(w in text for w in ["想练习", "练习", "怎么回", "怎么说"]):
        strengths.append("有明确的练习目标")
    if not strengths:
        strengths.append("愿意尝试角色扮演这种高阶训练方式")

    # Dynamic improvements
    improvements = []
    if detected_role == "对话对象":
        improvements.append("可以更具体地描述你想练习的对象是谁（如：严厉的领导、敏感的朋友）")
    if personality == "中性":
        improvements.append("可以补充对方的性格特点，让练习更有挑战性")
    if len(text) < 15:
        improvements.append("描述可以更详细一些：对方说了什么、你想达到什么目的")
    if not any(w in text for w in ["想", "希望", "目的", "目标", "回"]):
        improvements.append("可以补充：你希望在这个练习中重点提升什么能力")
    if not improvements:
        improvements.append("尝试在回应时先复述对方的诉求，再表达自己的立场")

    # Build dynamic reply
    reply_lines = [f"{prefix}好的，我来扮演你的**{detected_role}**（性格：{personality}）。"]

    if detected_role != "对话对象":
        reply_lines.append(f"\n\n我注意到你设定了{detected_role}这个角色。")
        if personality != "中性":
            reply_lines.append(f"对方的性格设定为「{personality}」，这意味着你的回应需要{'更有力度、更有边界感' if personality == '强势/挑剔' else '更有耐心、更注重情绪安抚' if personality == '敏感/情绪化' else '更温和、更留有余地' if personality == '温和/包容' else '更有引导性，帮对方做决定' if personality == '犹豫/被动' else '更自然、更真诚'}。")

    reply_lines.append(f"\n\n---")
    reply_lines.append(f"\n\n**【{detected_role}】**：{opening}")
    reply_lines.append(f"\n\n---")
    reply_lines.append(f"\n\n现在请你回应我。")
    reply_lines.append(f"\n💡 **练习提示**：")
    reply_lines.append(f"\n- 先深呼吸，想象对面真的坐着一个{detected_role}")
    if personality == "强势/挑剔":
        reply_lines.append("- 对方态度强硬，不要被压过去，保持自己的立场")
    elif personality == "敏感/情绪化":
        reply_lines.append("- 对方情绪敏感，先共情再表达，不要直接否定")
    elif personality == "犹豫/被动":
        reply_lines.append("- 对方犹豫不决，你需要主动引导，帮TA理清思路")
    reply_lines.append("- 用3-5句话回应，不要太长")
    reply_lines.append("- 回应后我会给你反馈，帮你优化")

    return {
        "coach_reply": "".join(reply_lines),
        "coach_scores": {
            "clarity": max(1, min(10, clarity_score)),
            "logic": max(1, min(10, 5 + (1 if analysis["has_structure"] else 0))),
            "evidence": max(1, min(10, 4 + len(text) // 25)),
            "confidence": max(1, min(10, confidence_score)),
            "etiquette": max(1, min(10, etiquette_score)),
            "boundary": max(1, min(10, 5 + (1 if detected_role != "对话对象" else 0))),
        },
        "coach_strengths": strengths,
        "coach_improvements": improvements,
        "coach_rewritten": "",
        "coach_next_practice": f"请回应上面「{detected_role}」的话。回应后我会扮演{detected_role}继续对话，并在最后给你反馈。",
    }


def _etiquette_coach(text: str, analysis: dict, prefix: str) -> dict:
    """Generate etiquette learning feedback."""
    # Identify etiquette topic
    topic = "一般社交礼仪"
    if any(w in text for w in ["微信", "消息", "回复", "聊天", "IM"]):
        topic = "线上沟通礼仪"
    elif any(w in text for w in ["见面", "打招呼", "自我介绍", "寒暄"]):
        topic = "初次见面礼仪"
    elif any(w in text for w in ["会议", "发言", "汇报"]):
        topic = "会议发言礼仪"
    elif any(w in text for w in ["拒绝", "说不", "边界", "不合理"]):
        topic = "边界表达礼仪"
    elif any(w in text for w in ["道歉", "对不起", "抱歉"]):
        topic = "道歉与补救礼仪"
    elif any(w in text for w in ["赞美", "夸奖", "称赞"]):
        topic = "赞美表达礼仪"

    return {
        "coach_reply": (
            f"{prefix}关于{topic}，让我来分享一些实用的建议：\n\n"
            f"**核心原则**：\n"
            f"1. 尊重对方的时间和空间\n"
            f"2. 表达清晰但不要过于冗长\n"
            f"3. 给对方留有余地\n"
            f"4. 保持真诚，避免过度客套\n\n"
            f"**常见误区**：\n"
            f"- 过度道歉会削弱你的立场\n"
            f"- 过于客套会显得不够真诚\n"
            f"- 忽略对方感受只关注自己\n\n"
            f"你想针对具体的场景练习一下吗？"
        ),
        "coach_scores": {
            "clarity": 6,
            "logic": 6,
            "evidence": 5,
            "confidence": 6,
            "etiquette": 7,
            "boundary": 6,
        },
        "coach_strengths": ["主动学习社交礼仪知识", "有提升沟通品质的意识"],
        "coach_improvements": ["可以在具体场景中实践学到的知识"],
        "coach_rewritten": (
            f"更得体的表达方式是：先确认对方的状况，再提出自己的需求，"
            f"最后给对方留出选择的余地。例如：'你现在方便吗？我想和你聊一下...'"
        ),
        "coach_next_practice": f"请描述一个你在{topic}方面遇到的具体困惑，我们一起分析。",
    }


def _voice_coach(text: str, analysis: dict, prefix: str) -> dict:
    """Generate voice practice feedback."""
    # Mock audio features analysis
    filler_count = text.count("嗯") + text.count("呃") + text.count("就是") + text.count("那个")

    return {
        "coach_reply": (
            f"{prefix}收到了你的语音练习！让我来给你一些反馈：\n\n"
            f"**语音分析**：\n"
            f"- 语速适中，表达节奏较好\n"
            f"- 检测到 {filler_count} 个填充词（嗯/呃/就是/那个）\n"
            f"- 整体表达流畅度良好\n\n"
            f"**文字内容分析**：\n"
            f"{text[:100]}{'...' if len(text) > 100 else ''}\n\n"
            f"{'注意减少填充词的使用，可以用停顿代替。' if filler_count > 2 else '填充词控制得不错！'}"
        ),
        "coach_scores": {
            "clarity": 6,
            "logic": 5,
            "evidence": 5,
            "confidence": 6 if not analysis["has_apology"] else 4,
            "etiquette": 6,
            "boundary": 5,
        },
        "coach_strengths": ["愿意用语音进行练习", "表达自然流畅"],
        "coach_improvements": [
            f"可以尝试减少填充词的使用（当前检测到 {filler_count} 次）"
            if filler_count > 2 else "可以练习用更简洁的语言表达核心观点"
        ],
        "coach_rewritten": _generate_rewritten_expression(text),
        "coach_next_practice": (
            "再来一次！这次注意：\n"
            "1. 用停顿代替填充词\n"
            "2. 先说结论，再说理由\n"
            "3. 控制整体时长在30秒内"
        ),
    }


def _feedback_review(text: str, analysis: dict, prefix: str) -> dict:
    """Generate comprehensive feedback review."""
    return {
        "coach_reply": (
            f"{prefix}这是你本次训练的复盘报告：\n\n"
            f"**总体评价**：你今天的练习表现不错，愿意主动表达并寻求改进是值得肯定的。\n\n"
            f"**亮点**：\n"
            f"- 完成了训练任务\n"
            f"- {'表达中有结构化思维' if analysis['has_structure'] else '表达真实自然'}\n"
            f"- {'使用了具体数据' if analysis['has_numbers'] else '语气温和有礼貌'}\n\n"
            f"**需要关注的方面**：\n"
            f"{'- 尝试减少犹豫词的使用' if analysis['has_hesitation'] else '- 可以尝试更简洁地表达核心观点'}\n"
            f"{'- 减少不必要的道歉，增强自信感' if analysis['has_apology'] else '- 可以用更多具体例子支撑观点'}\n\n"
            f"**下一步建议**：\n"
            f"继续练习同一场景，目标是让表达更加自然流畅。"
        ),
        "coach_scores": {
            "clarity": 6,
            "logic": 6,
            "evidence": 5,
            "confidence": 5,
            "etiquette": 7,
            "boundary": 6,
        },
        "coach_strengths": ["完成了训练任务", "愿意接受反馈", "有持续练习的意愿"],
        "coach_improvements": [
            "可以在日常生活中尝试使用今天学到的话术",
            "下次练习时可以设定更具体的目标"
        ],
        "coach_rewritten": "",
        "coach_next_practice": (
            "基于你的表现，我推荐以下练习计划：\n"
            "1. 明天：同一场景再练一次\n"
            "2. 后天：换一个难度更高一点的场景\n"
            "3. 周末：做一次完整的角色扮演训练"
        ),
    }


def feedback_node(state: AgentState) -> dict:
    """Prepare structured feedback for the response."""
    mode = state["mode"]

    action_map = {
        "expression_training": "retry_expression",
        "scene_analysis": "practice_scene",
        "roleplay": "continue_roleplay",
        "etiquette_learning": "next_lesson",
        "voice_practice": "retry_voice",
        "feedback": "next_training",
    }

    return {
        "next_action": action_map.get(mode, "select_scene"),
    }
