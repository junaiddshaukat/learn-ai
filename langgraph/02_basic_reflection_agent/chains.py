from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI

# UPDATE: gemini-1.5-flash to gemini-2.5-flash
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

tweet_generation_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are a creative social media writer. Generate one engaging tweet based on the user's topic. "
            "Keep it concise, clear, and under 280 characters. If there is feedback, revise the tweet accordingly."
        ),
        MessagesPlaceholder(variable_name="messages")
    ]
)

tweet_critique_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are a strict tweet critic. Review the tweet for clarity, tone, engagement, and correctness. "
            "Give concise feedback and suggest an improved version."
        ),
        MessagesPlaceholder(variable_name="messages")
    ]
)

generation_chain = tweet_generation_prompt | llm
reflection_chain = tweet_critique_prompt | llm
