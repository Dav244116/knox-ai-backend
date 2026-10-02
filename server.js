"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();

const PORT = process.env.PORT || 8080;
const FRONTEND_URL = process.env.FRONTEND_URL || "*";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-6-luna";

if (!process.env.OPENAI_API_KEY) {
  console.warn("WARNING: OPENAI_API_KEY is not configured.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// --------------------------------------------------
// Middleware
// --------------------------------------------------

app.use(
  cors({
    origin: FRONTEND_URL === "*" ? true : FRONTEND_URL,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json({ limit: "2mb" }));

// --------------------------------------------------
// Health check
// --------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    success: true,
    name: "KNOX AI Backend",
    message: "KNOX AI backend is running 🚀"
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "online"
  });
});

// --------------------------------------------------
// AI Chat
// --------------------------------------------------

app.post("/api/chat", async (req, res) => {
  try {
    const { message, messages } = req.body || {};

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "OPENAI_API_KEY is not configured on the server."
      });
    }

    let input = [];

    // Support a simple single-message request
    if (typeof message === "string" && message.trim()) {
      input.push({
        role: "user",
        content: message.trim()
      });
    }

    // Also support conversation history from the frontend
    if (Array.isArray(messages) && messages.length > 0) {
      input = messages
        .filter(
          (item) =>
            item &&
            typeof item.role === "string" &&
            typeof item.content === "string" &&
            ["user", "assistant"].includes(item.role)
        )
        .slice(-20)
        .map((item) => ({
          role: item.role,
          content: item.content
        }));
    }

    if (input.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Please provide a message."
      });
    }

    const response = await openai.responses.create({
      model: OPENAI_MODEL,
      instructions:
        "You are KNOX AI, a helpful AI assistant created for Knox The Great. " +
        "Be clear, useful, friendly, and concise. " +
        "When explaining technical topics, give practical step-by-step guidance. " +
        "Do not claim to have performed actions that you did not actually perform.",
      input
    });

    return res.json({
      success: true,
      reply: response.output_text || "I couldn't generate a response.",
      responseId: response.id
    });
  } catch (error) {
    console.error("KNOX AI ERROR:", error);

    return res.status(500).json({
      success: false,
      error: "KNOX AI could not process your request."
    });
  }
});

// --------------------------------------------------
// 404
// --------------------------------------------------

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found."
  });
});

// --------------------------------------------------
// Error handler
// --------------------------------------------------

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);

  res.status(500).json({
    success: false,
    error: "Internal server error."
  });
});

// --------------------------------------------------
// Start server
// --------------------------------------------------

app.listen(PORT, "0.0.0.0", () => {
  console.log(`KNOX AI backend running on port ${PORT}`);
});
