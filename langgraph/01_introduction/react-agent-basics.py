from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
from langchain_community.tools.tavily_search import TavilySearchResults
from langgraph.prebuilt import create_react_agent

load_dotenv()

llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash")

search_tool = TavilySearchResults(max_results=20)

agent = create_react_agent(llm, tools=[search_tool])

print("--- Agent Execution Trace ---")

# We can use stream with "values" mode to see how the state builds up:
# This shows exactly what the agent is thinking (tool calls) and the tool return values.
events = agent.stream(
    {"messages": [("user", "What is the current weather of lahore?")]},
    stream_mode="values"
)

for event in events:
    # Print the very last message in the state to follow the logic step-by-step
    event["messages"][-1].pretty_print()
