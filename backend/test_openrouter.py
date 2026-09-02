#!/usr/bin/env python3

from dotenv import load_dotenv
import os
from openai import OpenAI

load_dotenv()

API_KEY = os.getenv("AI_API_KEY")

print(f"API_KEY: {API_KEY[:20]}..." if API_KEY else "API_KEY: None")
print(f"Starts with sk-or-: {API_KEY.startswith('sk-or-') if API_KEY else False}")

if API_KEY:
    try:
        if API_KEY.startswith("sk-or-"):
            client = OpenAI(
                api_key=API_KEY,
                base_url="https://openrouter.ai/api/v1",
            )
        else:
            client = OpenAI(api_key=API_KEY)
        
        print("Client created successfully")
        
        response = client.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=[
                {"role": "user", "content": "Hello, this is a test"}
            ]
        )
        
        print(f"Response: {response.choices[0].message.content}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
else:
    print("No API key found")