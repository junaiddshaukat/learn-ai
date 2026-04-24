from typing import List, Sequence
from dotenv import load_dotenv
load_dotenv()

from langchain_core.messages import BaseMessage, HumanMessage
from langgraph.graph import END, StateGraph, MessagesState
from chains import generation_chain, reflection_chain


builder = StateGraph(MessagesState)

REFLECT = "reflect"
GENERATE = "generate"

def generate_node(state: MessagesState):
    # Generates a tweet
    res = generation_chain.invoke({
        "messages": state["messages"]
    })
    return {"messages": [res]}

def reflect_node(state: MessagesState):
    # Generates feedback on the tweet
    res = reflection_chain.invoke({
        "messages": state["messages"]
    })
    
    # We cast the reflector's output as a HumanMessage.
    # This tricks the generator into thinking the user is the one supplying the critique.
    # It also prevents errors with consecutive AI messages.
    feedback_message = HumanMessage(content=res.content)
    
    return {"messages": [feedback_message]}

builder.add_node(GENERATE, generate_node)
builder.add_node(REFLECT, reflect_node)
builder.set_entry_point(GENERATE)

def should_continue_reflection(state: MessagesState):
    if len(state["messages"]) > 4: 
        return END
    return REFLECT

builder.add_conditional_edges(
    GENERATE, 
    should_continue_reflection,
    {
        END: END,
        REFLECT: REFLECT
    }
)

builder.add_edge(REFLECT, GENERATE)


app = builder.compile()
print(app.get_graph().draw_ascii())

if __name__ == "__main__":
    initial_state = {"messages": [HumanMessage(content="Write a tweet about the importance of AI in education.")]}
    print("Invoking graph...")
    response = app.invoke(initial_state)
    
    for message in response["messages"]:
        message.pretty_print()
