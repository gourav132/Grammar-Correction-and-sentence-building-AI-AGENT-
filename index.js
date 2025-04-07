// Description: This file contains the code for the AI agent that uses the Google Generative AI to correct grammar and auto-complete sentences.
import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

app.post("/correct-grammar", async (req, res) => {
  const { sentence } = req.body;
  if (!sentence) return res.status(400).json({ error: "Sentence is required" });

  try {
    // const prompt = `Rewrite the sentence with correct grammar and sentence formatting. The sentence is most likely about a web/software developer or their project: ${sentence}`;
    const prompt = `Rewrite the following text with correct grammar, formatting, and structure while maintaining its original meaning: " ${sentence} " [Instruction for the response: just give me 4 options in json format for example for the sentence 'I want to follow up about the degree cerificate i was going'  the response format i need is  [
    {
        "option": "I am writing to follow up on my degree certificate."
    },
    {
        "option": "I'd like to follow up regarding my degree certificate."
    },
    {
        "option": "Following up on the status of my degree certificate."
    },
    {
        "option": "I'm following up on the degree certificate I requested."
    }
]]`;
    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();

    res.json({ correctedSentence: responseText });
  } catch (error) {
    res.status(500).json({ error: "AI model error", details: error.message });
  }
});

app.post("/auto-complete", async (req, res) => {
  const { sentence } = req.body;
  if (!sentence) return res.status(400).json({ error: "Sentence is required" });

  try {
    const prompt = `Complete the following sentence in a meaningful and grammatically correct way: (give 4 suggestions in array of json format which i can directly use in front end  "example: if the sentence is:What are you trying to do , then the response should be formatted like [
    {
        "suggestion": ", exactly?"
    },
    {
        "suggestion": " with this project?"
    },
    {
        "suggestion": " to solve this problem?"
    },
    {
        "suggestion": ", and how can I help?"
    }
    instruction: do not attach the original sentence with the suggested one    ) "${sentence}"`;
    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();

    res.json({ completedSentence: responseText });
  } catch (error) {
    res.status(500).json({ error: "AI model error", details: error.message });
  }
});

// Roleplay AI Conversation with Context Retention
const conversationHistory = {};

app.post("/roleplay", async (req, res) => {
  const { userId, scenario, message } = req.body;
  if (!userId || !scenario || !message) {
    return res
      .status(400)
      .json({ error: "User ID, scenario, and message are required" });
  }

  if (!conversationHistory[userId]) {
    conversationHistory[userId] = [];
  }

  conversationHistory[userId].push({ role: "user", message });

  try {
    const prompt = `You are an AI roleplaying in the scenario: "${scenario}". Keep the conversation engaging, and if needed, subtly correct grammar. Always return JSON like this:
    {
      "response": "AI's conversational reply",
      "correction": "User's message with correct grammar"
    }

    Conversation so far:
    ${JSON.stringify(conversationHistory[userId])}

    User: "${message}"`;

    const result = await model.generateContent(prompt);
    let responseText = await result.response.text();

    // Extract JSON part only
    const jsonMatch = responseText.match(/\{.*\}/s);
    if (!jsonMatch) throw new Error("Invalid JSON response from AI");

    const aiResponse = JSON.parse(jsonMatch[0]);

    // Push AI's response to conversation history
    conversationHistory[userId].push({
      role: "ai",
      message: aiResponse.response,
    });

    res.json({ roleplayResponse: aiResponse });
  } catch (error) {
    res.status(500).json({ error: "AI model error", details: error.message });
  }
});

app.post("/reset-history", async (req, res) => {
  const { userId } = req.body;

  if (userId) {
    if (conversationHistory[userId]) {
      delete conversationHistory[userId];
      return res.json({ message: `History reset for user: ${userId}` });
    } else {
      return res.status(404).json({ error: "User not found" });
    }
  } else {
    // Reset all users' history
    Object.keys(conversationHistory).forEach(
      (key) => delete conversationHistory[key]
    );
    return res.json({ message: "All conversation histories reset" });
  }
});

// Therapist AI Chat Route
const therapistHistory = {};

app.post("/therapist-chat", async (req, res) => {
  const { userId, message } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ error: "User ID and message are required" });
  }

  // Initialize or update conversation history
  if (!therapistHistory[userId]) {
    therapistHistory[userId] = [];
  }

  therapistHistory[userId].push({ role: "user", content: message });

  try {
    // Build conversation context string
    const historyStr = therapistHistory[userId]
      .map((msg) => `${msg.role === "user" ? "User" : "AI"}: ${msg.content}`)
      .join("\n");

    const prompt = `You are a compassionate and supportive AI mental health assistant. Your role is to engage in empathetic, non-judgmental conversations with users who may be experiencing emotional challenges.

Always respond in a calm, thoughtful, and caring tone. Offer emotional support, active listening, and simple coping strategies. Never give medical advice or diagnoses.

If the user is in crisis or at risk of self-harm, encourage them to reach out to a mental health professional or emergency services immediately.

Use the ongoing conversation history below to understand the user’s emotional state and continue the conversation naturally.

Use short, friendly, and comforting replies. Ask gentle questions to help the user reflect.

---

Conversation so far:
${historyStr}

User: ${message}
AI:`;

    const result = await model.generateContent(prompt);
    const aiResponse = (await result.response.text()).trim();

    therapistHistory[userId].push({ role: "ai", content: aiResponse });

    res.json({ therapistResponse: aiResponse });
  } catch (error) {
    res.status(500).json({ error: "AI model error", details: error.message });
  }
});

app.post("/therapist-reset", (req, res) => {
  const { userId } = req.body;

  if (userId) {
    delete therapistHistory[userId];
    return res.json({ message: `Therapist chat history reset for ${userId}` });
  } else {
    Object.keys(therapistHistory).forEach(
      (key) => delete therapistHistory[key]
    );
    return res.json({ message: "All therapist chat histories reset" });
  }
});

app.listen(5000, () => console.log("AI Agent running on port 5000"));
