import json
from typing import List, Dict, Any
from langchain_core.messages import AIMessage, BaseMessage, ToolMessage, HumanMessage
from langchain_community.tools import TavilySearchResults
from langgraph.graph import MessagesState

# Create the Tavily search tool
tavily_tool = TavilySearchResults(max_results=5)

# Function to execute search queries from AnswerQuestion tool calls
def execute_tools(state: MessagesState) -> Dict[str, List[BaseMessage]]:
    last_ai_message: AIMessage = state["messages"][-1]
    
    # Extract tool calls from the AI message
    if not hasattr(last_ai_message, "tool_calls") or not last_ai_message.tool_calls:
        return {"messages": []}
    
    # Process the AnswerQuestion or ReviseAnswer tool calls to extract search queries
    tool_messages = []
    
    for tool_call in last_ai_message.tool_calls:
        if tool_call["name"] in ["AnswerQuestion", "ReviseAnswer"]:
            call_id = tool_call["id"]
            search_queries = tool_call["args"].get("search_queries", [])
            
            # Execute each search query using the tavily tool
            query_results = {}
            for query in search_queries:
                result = tavily_tool.invoke(query)
                query_results[query] = result
            
            # Create a tool message with the results
            tool_messages.append(
                ToolMessage(
                    content=json.dumps(query_results),
                    tool_call_id=call_id
                )
            )
    
    return {"messages": tool_messages}

# Example usage
test_state = {
    "messages": [
        HumanMessage(
            content="Write about how small business can leverage AI to grow"
        ),
        AIMessage(
            content="", 
            tool_calls=[
                {
                    "name": "AnswerQuestion",
                    "args": {
                        'answer': '', 
                        'search_queries': [
                                'AI tools for small business', 
                                'AI in small business marketing', 
                                'AI automation for small business'
                        ], 
                        'reflection': {
                            'missing': '', 
                            'superfluous': ''
                        }
                    },
                    "id": "call_KpYHichFFEmLitHFvFhKy1Ra",
                }
            ],
        )
    ]
}

# Execute the tools
# results = execute_tools(test_state)

# print("Raw results:", results)
# if results["messages"]:
#     parsed_content = json.loads(results["messages"][0].content)
#     print("Parsed content:", parsed_content)