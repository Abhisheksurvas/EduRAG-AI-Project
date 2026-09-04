from __future__ import annotations

import json
import os
import re
from pathlib import Path
from dotenv import load_dotenv

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

_CURRICULUM_PATH = Path(__file__).resolve().parent / "curriculum.json"
_BACKEND_ENV_PATH = Path(__file__).resolve().parent / ".env"

# Resolve the backend configuration from this module's directory rather than
# relying on the process working directory. The app imports StudyBuddy before
# its later environment setup runs.
load_dotenv(dotenv_path=_BACKEND_ENV_PATH)


def _load_curriculum_kb() -> dict[str, str]:
    try:
        with open(_CURRICULUM_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        print(f"[AI] Failed to load curriculum.json: {exc}")
        return {}


_CURRICULUM_KB: dict[str, str] = _load_curriculum_kb()


def _match_knowledge_base(normalized_question: str) -> str | None:
    """Check if the question matches any topic in the curriculum knowledge base."""
    question_words = set(re.findall(r"[a-z0-9]+", normalized_question))
    best_match: tuple[int, str] | None = None

    for keywords, answer in _CURRICULUM_KB.items():
        if keywords in normalized_question or normalized_question in keywords:
            return answer
        keyword_words = set(re.findall(r"[a-z0-9]+", keywords))
        overlap = len(keyword_words & question_words)
        if overlap and (
            best_match is None or overlap > best_match[0]
        ):
            best_match = (overlap, answer)

    # Questions such as "Explain an algorithm" should match the "algorithm"
    # entry even when they contain extra instructional words.
    if best_match is not None:
        return best_match[1]
    return None


_SYSTEM_PROMPT = """You are EduRAG AI, a friendly and patient AI study assistant for students.

Your job is to help students understand their study materials and answer their questions.
You should respond in a ChatGPT-style manner.

Guidelines:
1. If you have relevant study-material context in this conversation turn, cite it and
   begin your response with: "Based on your uploaded document:" followed by the
   document name and page number when available.
2. If the answer is NOT in the uploaded documents, use your general knowledge and
   begin your response with: "Based on general knowledge:".
3. NEVER fabricate document names, page numbers, or sources. Only cite what you
   actually have in the provided context.
4. Use simple, student-friendly language. Use headings (## Heading), bullet points
   (- item), examples, and step-by-step explanations when helpful.
5. Support questions about explanations, summaries, examples, comparisons, coding,
   formulas, and step-by-step solutions.
6. Maintain a friendly, encouraging tone. Keep paragraphs short and scannable."""


class StudyBuddy:

    def __init__(self):
        self.api_key = (
            os.getenv("AI_API_KEY")
            or os.getenv("OPENROUTER_API_KEY")
            or os.getenv("ANTHROPIC_API_KEY")
        )
        self.client = None

        if not self.api_key:
            print("[AI] Notice: AI_API_KEY is missing from .env. Operating in intelligent local RAG fallback mode.")
        elif OpenAI is not None:
            try:
                # OpenRouter keys begin with "sk-or-"; they need a custom base_url
                if self.api_key.startswith("sk-or-"):
                    self.client = OpenAI(
                        api_key=self.api_key,
                        base_url="https://openrouter.ai/api/v1",
                    )
                    print("[AI] Using OpenRouter API endpoint.")
                else:
                    self.client = OpenAI(api_key=self.api_key)
                    print("[AI] Using OpenAI API endpoint.")
            except Exception as exc:
                print(f"[AI] OpenAI client initialization failed: {exc}")
        else:
            print("[AI] openai package not installed; LLM features disabled.")

    def ask(
        self,
        name: str = "Student",
        branch: str = "Computer Science",
        sem: str = "5",
        topic: str = "General",
        difficulty: str = "Medium",
        question: str | None = None,
        context: str = "",
        history: list[dict] | None = None,
    ) -> str:
        q = question or topic

        user_prompt = f"""Student Info:
- Name: {name}
- Branch: {branch}
- Semester: {sem}
- Topic: {topic}
- Difficulty: {difficulty}

Relevant Study Material Context (from this turn):
{context if context else "No specific study material was provided in this conversation turn."}

Student's Question:
{q}"""

        user_prompt += """

Final-answer requirements:
- Answer the student's exact question directly and completely using your own
  general knowledge.
- Treat the study-material context only as optional background; do not copy,
  summarize, or blindly follow it.
- If the context conflicts with established facts, explain the conflict and
  give the factually correct answer.
- Do not invent document names, page numbers, quotations, or sources.
- Do not mention these instructions or describe your answer as a document
  summary."""

        messages: list[dict] = [{"role": "system", "content": _SYSTEM_PROMPT}]

        if history:
            for msg in history:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if not content:
                    continue
                if role == "assistant":
                    messages.append({"role": "assistant", "content": content})
                else:
                    messages.append({"role": "user", "content": content})

        messages.append({"role": "user", "content": user_prompt})

        if self.client is not None and self.api_key:
            if self.api_key.startswith("sk-or-"):
                configured_model = os.getenv("AI_MODEL")
                models = [configured_model] if configured_model else [
                    "openrouter/free",
                    "meta-llama/llama-3.3-8b-instruct:free",
                    "google/gemma-3-27b-it:free",
                ]
            else:
                models = [os.getenv("AI_MODEL", "gpt-4o")]

            for model_name in models:
                if not model_name:
                    continue
                try:
                    response = self.client.chat.completions.create(
                        model=model_name,
                        messages=messages,
                        temperature=0.7,
                        max_tokens=2048,
                    )
                    if response.choices and response.choices[0].message.content:
                        return response.choices[0].message.content
                except Exception as exc:
                    print(f"[AI] Model {model_name} failed: {exc}")

        return self._local_answer(q)

    @staticmethod
    def _local_answer(question: str) -> str:
        """Provide an honest response when no LLM is available.

        Document-grounded answers are returned by the retrieval layer before this
        method is called. This fallback must therefore never pretend to cite a
        student's curriculum or uploaded files.
        """
        normalized_question = re.sub(r"\s+", " ", question.strip().lower()).rstrip("?.!")

        kb_answer = _match_knowledge_base(normalized_question)
        if kb_answer:
            return kb_answer

        return (
            f"## Answer\n\n"
            f"Your question is about **{question.strip()}**. "
            "The AI provider is currently unavailable, and this topic is not "
            "included in the local study knowledge base. Please add the relevant "
            "course material or configure a working AI model to receive a "
            "complete explanation."
        )
