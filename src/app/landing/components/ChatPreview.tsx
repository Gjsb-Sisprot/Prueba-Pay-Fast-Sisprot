import { Bot } from "lucide-react";
import { CHAT_MESSAGES } from "../data/landing-data";

export function ChatPreview() {
  return (
    <div className="relative">
      <div className="bg-white rounded-2xl shadow-2xl p-4 max-w-sm mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">
              Asistente Sisprot
            </p>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              En línea
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="py-4 space-y-3">
          {CHAT_MESSAGES.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${
                msg.sender === "user" ? "justify-end" : ""
              }`}
            >
              {msg.sender === "bot" && (
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-gray-600" />
                </div>
              )}
              <div
                className={`${
                  msg.sender === "user"
                    ? "bg-black text-white rounded-2xl rounded-tr-none"
                    : "bg-gray-100 rounded-2xl rounded-tl-none text-gray-800"
                } px-4 py-2 max-w-[80%]`}
              >
                <p className="text-sm">{msg.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="pt-2 border-t border-gray-100">
          <div className="bg-gray-50 rounded-full px-4 py-3 text-sm text-gray-400">
            Escribe tu mensaje...
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute -top-4 -right-4 w-20 h-20 bg-primary/20 rounded-full blur-xl" />
      <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-yellow-400/20 rounded-full blur-xl" />
    </div>
  );
}
