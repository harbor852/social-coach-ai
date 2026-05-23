"""LangGraph workflow for the social coaching agent."""

from typing import Literal
from langgraph.graph import StateGraph, END

from .state import AgentState
from .nodes import safety_node, intent_node, coach_node_async, feedback_node


def route_after_safety(state: AgentState) -> Literal["intent", "safety_response"]:
    """Route after safety check: normal training or safety response."""
    if state["risk_level"] in ("high", "crisis"):
        return "safety_response"
    return "intent"


def safety_response(state: AgentState) -> dict:
    """Generate safety response without coaching."""
    return {
        "coach_reply": state.get("safety_message", "我听到了你的困扰。"),
        "next_action": "safety_support",
    }


# Build the graph
workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("safety", safety_node)
workflow.add_node("safety_response", safety_response)
workflow.add_node("intent", intent_node)
workflow.add_node("coach", coach_node_async)
workflow.add_node("feedback", feedback_node)

# Set entry
workflow.set_entry_point("safety")

# Add edges
workflow.add_conditional_edges(
    "safety",
    route_after_safety,
    {"intent": "intent", "safety_response": "safety_response"},
)
workflow.add_edge("safety_response", END)
workflow.add_edge("intent", "coach")
workflow.add_edge("coach", "feedback")
workflow.add_edge("feedback", END)

# Compile
coach_graph = workflow.compile()
