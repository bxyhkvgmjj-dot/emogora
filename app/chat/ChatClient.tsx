"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "ai";
  text: string;
};

export default function ChatClient() {
  const mode = "feel"; // temporary default mode

  const modeTitles: Record<string, string> = {
    feel: "Feel & Reflect",
    plan: "Plan & Execute",
    grow: "Grow My Career & Biz",
  };


  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: "Of course. Tell me what’s on your mind. I’m here with you.",
    },
  ]);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const chatRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    setIsTyping(true);

    setTimeout(() => {
      const aiMessage: Message = {
        role: "ai",
        text: getFakeResponse(mode),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 900);
  };

  const getFakeResponse = (mode: string) => {
    if (mode === "feel") {
      return "I hear you. Tell me a bit more — I’m listening.";
    }
    if (mode === "plan") {
      return "Okay. What’s the main goal you want to accomplish today?";
    }
    if (mode === "grow") {
      return "Let’s grow. What’s your current challenge in your career or business?";
    }
    return "I'm here with you.";
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* HEADER */}
      <header className="bg-white shadow px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">
          {modeTitles[mode] ?? "Emogora Chat"} • Chat Space
        </h1>
        <a href="/" className="text-blue-600 hover:underline">
          ← Back
        </a>
      </header>

      {/* CHAT AREA */}
      <div ref={chatRef} className="flex-1 p-6 space-y-4 overflow-y-auto">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`px-4 py-3 rounded-xl max-w-xs ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-800 shadow"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white px-4 py-3 rounded-xl shadow max-w-xs text-gray-500 flex space-x-2">
              <span className="animate-bounce">•</span>
              <span className="animate-bounce delay-150">•</span>
              <span className="animate-bounce delay-300">•</span>
            </div>
          </div>
        )}
      </div>

      {/* INPUT BAR */}
      <div className="bg-white p-4 shadow flex space-x-3 border-t">
        <input
          type="text"
          placeholder="Type your message..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          onClick={sendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
}
