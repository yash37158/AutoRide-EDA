"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Send, Bot, User, Sparkles } from "lucide-react"
import { useAutoRideStore } from "@/lib/store"

interface Message {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
  fallback?: boolean
}

export function ChatAssistant() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { vehicles, metrics, currentRide } = useAutoRideStore()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const suggestedQuestions = [
    "How many rides are active?",
    "What's the average ETA?",
    "How many taxis are idle?",
    "Why is surge pricing active?",
  ]

  const generateAnswer = (question: string): { answer: string; fallback: boolean } => {
    const lowerQuestion = question.toLowerCase()

    if (lowerQuestion.includes("how many rides") || lowerQuestion.includes("active")) {
      return {
        answer: `There are currently ${metrics.activeRides} active rides in the system. The fleet is operating efficiently with real-time dispatch optimization.`,
        fallback: false,
      }
    }

    if (lowerQuestion.includes("average") && lowerQuestion.includes("eta")) {
      return {
        answer: `The current average ETA is ${metrics.avgEta} minutes. This is calculated across all active rides and updated in real-time.`,
        fallback: false,
      }
    }

    if (lowerQuestion.includes("idle")) {
      const idleCount = Object.values(vehicles).filter((v) => v.status === "IDLE").length
      return {
        answer: `There are ${idleCount} idle taxis available and ready for dispatch. Our AI system optimally positions them based on demand patterns.`,
        fallback: false,
      }
    }

    if (lowerQuestion.includes("surge")) {
      return {
        answer: `Surge pricing is activated when demand exceeds supply in specific areas. Our dynamic pricing algorithm helps balance the fleet distribution.`,
        fallback: false,
      }
    }

    return {
      answer: `I can help with fleet status, ride information, and pricing questions. Try asking about active rides, ETAs, or taxi availability for detailed insights.`,
      fallback: true,
    }
  }

  const handleSendMessage = async (question?: string) => {
    const messageText = question || input
    if (!messageText.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: messageText,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    setTimeout(
      () => {
        const { answer, fallback } = generateAnswer(messageText)

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: answer,
          timestamp: new Date(),
          fallback,
        }

        setMessages((prev) => [...prev, assistantMessage])
        setIsLoading(false)
      },
      1000 + Math.random() * 1000,
    )
  }

  return (
    <Card className="h-full flex flex-col border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          AI Fleet Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pr-2">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-slate-600 mb-6 font-medium">Ask me anything about the fleet!</p>
              <div className="space-y-2">
                {suggestedQuestions.map((question) => (
                  <Button
                    key={question}
                    variant="outline"
                    size="sm"
                    className="text-xs block w-full bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 hover:from-purple-100 hover:to-indigo-100 hover:border-purple-300 transition-all duration-200"
                    onClick={() => handleSendMessage(question)}
                  >
                    <Sparkles className="h-3 w-3 mr-2" />
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                    message.type === "user"
                      ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                      : "bg-white border border-slate-200"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {message.type === "assistant" && <Bot className="h-4 w-4 mt-0.5 text-purple-600 flex-shrink-0" />}
                    {message.type === "user" && <User className="h-4 w-4 mt-0.5 text-white flex-shrink-0" />}
                    <div className="flex-1">
                      <p
                        className={`text-sm leading-relaxed ${message.type === "user" ? "text-white" : "text-slate-700"}`}
                      >
                        {message.content}
                      </p>
                      {message.fallback && (
                        <Badge variant="secondary" className="mt-2 text-xs bg-amber-100 text-amber-800">
                          Rule-based response
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                <Bot className="h-4 w-4 text-purple-600" />
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <div
                    className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Enhanced Input */}
        <div className="flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <Input
            placeholder="Ask about fleet status, rides, or pricing..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            disabled={isLoading}
            className="border-0 bg-white shadow-sm focus:ring-2 focus:ring-purple-500/20"
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || isLoading}
            className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
