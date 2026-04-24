from typing import List, Literal

from langchain_core.messages import BaseMessage, ToolMessage, HumanMessage
from langgraph.graph import END, StateGraph, MessagesState

from chains import revisor_chain, first_responder_chain
from execute_tools import execute_tools

builder = StateGraph(MessagesState)
MAX_ITERATIONS = 2

def draft_node(state: MessagesState):
    res = first_responder_chain.invoke({"messages": state["messages"]})
    return {"messages": [res]}

def revisor_node(state: MessagesState):
    res = revisor_chain.invoke({"messages": state["messages"]})
    return {"messages": [res]}

builder.add_node("draft", draft_node)
builder.add_node("execute_tools", execute_tools)
builder.add_node("revisor", revisor_node)

builder.add_edge("draft", "execute_tools")
builder.add_edge("execute_tools", "revisor")

def event_loop(state: MessagesState) -> Literal["execute_tools", "__end__"]:
    count_tool_visits = sum(isinstance(item, ToolMessage) for item in state["messages"])
    num_iterations = count_tool_visits
    if num_iterations > MAX_ITERATIONS:
        return END
    return "execute_tools"

builder.add_conditional_edges("revisor", event_loop)
builder.set_entry_point("draft")

app = builder.compile()

print(app.get_graph().draw_mermaid())

response = app.invoke(
    {"messages": [HumanMessage("Write about how small business can leverage AI to grow")]}
)

print(response["messages"][-1].tool_calls[0]["args"]["answer"])
# print(response, "response")