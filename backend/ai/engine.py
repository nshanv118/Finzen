import os
import requests
import json

def get_mistral_response(messages, model="mistral-large-latest", temperature=0.4):
    """Fallback to direct REST API calls for better reliability in different environments."""
    api_key = os.getenv(OQ6tR5WAmMOXjMHSfj0JJwtdGRgkqxaB)
    if not api_key:
        return "⚠️ Error: MISTRAL_API_KEY is missing."
    
    url = "https://api.mistral.ai/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        return data['choices'][0]['message']['content']
    except Exception as e:
        print(f"Mistral API Error: {e}")
        return "I'm having a quick moment to think. Please ask again in a second!"

def get_ai_insights(user_context: str, question: str = "Please provide financial insights based on my spending data.") -> str:
    """Provides personalized financial advice using Mistral AI."""
    system_instruction = """
    You are 'FinZen', a world-class financial advisor for university students.
    Your mission is to help students achieve 'Financial Zen' through smart budgeting, saving, and responsible spending.
    
    GUIDELINES:
    - BE ACTIONABLE: Don't just give theory. Tell them *exactly* what to do (e.g., 'Move ₹500 to your Pocket').
    - BE RELATABLE: Use student-friendly language (canteen, subscriptions, maggi, exams).
    - SDG ALIGNMENT: Encourage sustainable consumption (SDG 12) and financial growth (SDG 8).
    - TONE: Professional but friendly, like a senior who has their life together.
    
    RULES:
    1. Only discuss finances, budgeting, and student-related money topics.
    2. If asked anything else, stay in character but politely decline.
    3. Keep responses under 120 words.
    4. Use bold text for key numbers or actions.
    """
    
    prompt = f"""
    [User Financial Context]
    {user_context}
    
    [User Message]
    {question}
    """
    
    messages = [
        {"role": "system", "content": system_instruction},
        {"role": "user", "content": prompt}
    ]
    
    return get_mistral_response(messages)

def classify_merchant(merchant_name: str) -> str:
    """Classifies unknown merchants using Mistral AI's classification capabilities."""
    system_instruction = """
    Classify the merchant name into EXACTLY ONE of these categories:
    food, transport, shopping, entertainment, education, groceries, electronics, other.
    Reply with ONLY the lowercase category name. No punctuation.
    """
    
    messages = [
        {"role": "system", "content": system_instruction},
        {"role": "user", "content": f"Classify: {merchant_name}"}
    ]
    
    result = get_mistral_response(messages, model="mistral-small-latest", temperature=0.1).strip().lower()
    
    valid_categories = ['food', 'transport', 'shopping', 'entertainment', 'education', 'groceries', 'electronics', 'other']
    return result if result in valid_categories else "other"
