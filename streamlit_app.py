import streamlit as st
import requests
import uuid


st.set_page_config(
    page_title="EduRAG AI",
    page_icon="📚",
    layout="wide"
)


st.title("📚 EduRAG AI")
st.write("Your Personal AI Learning Assistant")


# -----------------------------
# Session State
# -----------------------------

if "session_id" not in st.session_state:
    st.session_state.session_id = str(uuid.uuid4())

if "messages" not in st.session_state:
    st.session_state.messages = []


# -----------------------------
# Student Information
# -----------------------------

with st.sidebar:

    st.header("🎓 Student Information")

    name = st.text_input(
        "Student Name"
    )

    branch = st.selectbox(
        "Branch",
        [
            "CSE",
            "AI & DS",
            "ENTC",
            "MECH",
            "CIVIL"
        ]
    )

    semester = st.selectbox(
        "Semester",
        [
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8"
        ]
    )

    topic = st.text_input(
        "Topic"
    )

    difficulty = st.selectbox(
        "Difficulty",
        [
            "Beginner",
            "Intermediate",
            "Advanced"
        ]
    )

    if st.button("🗑️ Clear Chat"):
        st.session_state.messages = []
        st.rerun()


# -----------------------------
# Previous Messages
# -----------------------------

for message in st.session_state.messages:

    with st.chat_message(message["role"]):
        st.markdown(message["content"])


# -----------------------------
# Chat Input
# -----------------------------

question = st.chat_input(
    "Ask EduRAG AI anything..."
)


if question:

    if not name:
        st.warning("Please enter your name.")
        st.stop()

    if not topic:
        st.warning("Please enter a topic.")
        st.stop()


    # Display user message

    st.session_state.messages.append({
        "role": "user",
        "content": question
    })

    with st.chat_message("user"):
        st.markdown(question)


    # Send request to backend

    history = [
        {"role": m["role"], "content": m["content"]}
        for m in st.session_state.messages
    ]

    payload = {
        "userId": None,
        "sessionId": st.session_state.session_id,

        "name": name,
        "branch": branch,
        "semester": semester,

        "topic": topic,
        "difficulty": difficulty,

        "question": question,
        "history": history,
    }


    with st.chat_message("assistant"):

        with st.spinner("EduRAG AI is thinking..."):

            try:

                response = requests.post(
                    "http://localhost:8000/api/chat",
                    json=payload,
                    timeout=120
                )

                data = response.json()

                if response.ok and data.get("success"):

                    answer = data["answer"]
                    source_type = data.get("source_type")

                    if source_type == "document":
                        st.markdown(f"📄 **Based on your uploaded document:**\n\n{answer}")
                    elif source_type == "general":
                        st.markdown(f"🧠 **Based on general knowledge:**\n\n{answer}")
                    else:
                        st.markdown(answer)

                    st.session_state.messages.append({
                        "role": "assistant",
                        "content": answer
                    })

                else:

                    error = data.get(
                        "error",
                        "Unknown error"
                    )

                    st.error(error)

            except requests.exceptions.ConnectionError:

                st.error(
                    "Cannot connect to EduRAG backend. "
                    "Make sure backend/app.py is running."
                )

            except Exception as exc:

                st.error(
                    f"Error: {exc}"
                )