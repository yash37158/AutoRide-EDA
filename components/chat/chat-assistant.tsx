"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Send, Bot, User, Sparkles, AlertCircle } from "lucide-react"
import { useAutoRideStore } from "@/lib/store"

interface Message {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
  fallback?: boolean
  error?: boolean
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
    "What's the optimal taxi distribution strategy?",
    "How can we improve fleet efficiency?",
  ]

  const getFleetContext = () => {
    const idleCount = Object.values(vehicles).filter((v) => v.status === "IDLE").length
    const enrouteCount = Object.values(vehicles).filter((v) => v.status === "ENROUTE").length
    
    return {
      fleetStatus: {
        totalTaxis: Object.keys(vehicles).length,
        idleTaxis: idleCount,
        enrouteTaxis: enrouteCount,
        activeRides: metrics.activeRides,
        avgEta: metrics.avgEta,
        surgeMultiplier: metrics.surgeMultiplier
      },
      currentRide: currentRide ? {
        status: currentRide.status,
        pickup: currentRide.pickup,
        dropoff: currentRide.dropoff
      } : null,
      timestamp: Date.now()
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

    try {
      // Get current fleet context
      const fleetContext = getFleetContext()
      
      // Call Gemini AI service
      const response = await fetch('http://localhost:3003/chat/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: messageText,
          context: fleetContext
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const aiResponse = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: aiResponse.answer,
        timestamp: new Date(),
        fallback: aiResponse.fallback,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("AI Chat error:", error)
      
      // Fallback to rule-based response
      const { answer, fallback } = generateFallbackAnswer(messageText)
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: answer,
        timestamp: new Date(),
        fallback: true,
        error: true,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Fallback rule-based responses when AI fails
  const generateFallbackAnswer = (question: string): { answer: string; fallback: boolean } => {
    const lowerQuestion = question.toLowerCase()

    if (lowerQuestion.includes("how many rides") || lowerQuestion.includes("active")) {
      return {
        answer: `There are currently ${metrics.activeRides} active rides in the system. The fleet is operating efficiently with real-time dispatch optimization.`,
        fallback: true,
      }
    }

    if (lowerQuestion.includes("average") && lowerQuestion.includes("eta")) {
      return {
        answer: `The current average ETA is ${metrics.avgEta} minutes. This is calculated across all active rides and updated in real-time.`,
        fallback: true,
      }
    }

    if (lowerQuestion.includes("idle")) {
      const idleCount = Object.values(vehicles).filter((v) => v.status === "IDLE").length
      return {
        answer: `There are ${idleCount} idle taxis available and ready for dispatch. Our AI system optimally positions them based on demand patterns.`,
        fallback: true,
      }
    }

    if (lowerQuestion.includes("surge")) {
      return {
        answer: `Surge pricing is activated when demand exceeds supply in specific areas. Our dynamic pricing algorithm helps balance the fleet distribution.`,
        fallback: true,
      }
    }

    return {
      answer: `I'm experiencing technical difficulties with my AI service. I can help with basic fleet status questions, but for detailed insights, please try again later.`,
      fallback: true,
    }
  }

  return (
    <Card className="h-full flex flex-col border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          AI Fleet Assistant
          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
            Gemini AI
          </Badge>
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
                      <div className="flex gap-2 mt-2">
                        {message.fallback && (
                          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                            {message.error ? "Fallback (AI Error)" : "Rule-based response"}
                          </Badge>
                        )}
                        {message.error && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            AI Service Error
                          </Badge>
                          )}
                      </div>
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
                <span className="text-xs text-slate-500">Gemini AI thinking...</span>
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
