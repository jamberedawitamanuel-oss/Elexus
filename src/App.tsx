import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { 
  Send, 
  Sparkles, 
  User, 
  Bot, 
  Loader2, 
  Plus, 
  Settings, 
  History,
  ChevronRight,
  Mic,
  Volume2,
  VolumeX,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { cn } from './lib/utils';

// --- Types ---
interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

// --- Constants ---
const SYSTEM_INSTRUCTION = `You are Elexus, a sophisticated and highly intelligent AI assistant. 
Your personality is refined, helpful, and forward-thinking. 
You provide concise yet deep insights. 
You are knowledgeable across all domains but remain humble and precise.
Always maintain a professional yet approachable tone.
Use markdown for formatting when appropriate.`;

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId);

  // Initialize with a new session if none exist
  useEffect(() => {
    if (sessions.length === 0) {
      createNewSession();
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Conversation',
      messages: [],
      createdAt: new Date(),
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      const remaining = sessions.filter(s => s.id !== id);
      if (remaining.length > 0) {
        setCurrentSessionId(remaining[0].id);
      } else {
        createNewSession();
      }
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !currentSessionId) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    // Update session with user message
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          messages: [...s.messages, userMessage],
          title: s.messages.length === 0 ? userMessage.content.slice(0, 30) + (userMessage.content.length > 30 ? '...' : '') : s.title
        };
      }
      return s;
    }));

    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const history = currentSession?.messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      })) || [];

      const chat = ai.chats.create({
        model: "gemini-3.1-pro-preview",
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
        history: history
      });

      const botMessageId = crypto.randomUUID();
      const botMessage: Message = {
        id: botMessageId,
        role: 'bot',
        content: '',
        timestamp: new Date(),
      };

      // Add empty bot message first
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          return { ...s, messages: [...s.messages, botMessage] };
        }
        return s;
      }));

      const result = await chat.sendMessageStream({ message: userMessage.content });
      
      let fullContent = '';
      for await (const chunk of result) {
        const chunkText = chunk.text;
        if (chunkText) {
          fullContent += chunkText;
          setSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
              return {
                ...s,
                messages: s.messages.map(m => 
                  m.id === botMessageId ? { ...m, content: fullContent } : m
                )
              };
            }
            return s;
          }));
        }
      }
    } catch (error) {
      console.error("Error calling Gemini:", error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'bot',
        content: "I encountered an error while processing your request. Please try again.",
        timestamp: new Date(),
      };
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          return { ...s, messages: [...s.messages, errorMessage] };
        }
        return s;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const TypingIndicator = () => (
    <div className="flex gap-1 items-center px-2 py-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
          }}
          className="w-1 h-1 bg-orange-500 rounded-full"
        />
      ))}
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-[#0a0502] text-white/90 selection:bg-orange-500/30">
      <div className="atmosphere" />

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="w-72 flex-shrink-0 glass border-r border-white/5 flex flex-col z-20"
          >
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center shadow-[0_0_15px_rgba(234,88,12,0.4)]">
                  <Sparkles size={18} className="text-white" />
                </div>
                <span className="font-semibold text-xl tracking-tight">Elexus</span>
              </div>
              <button 
                onClick={createNewSession}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="New Chat"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 space-y-2">
              <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-white/40 font-semibold">
                Recent Conversations
              </div>
              {sessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => setCurrentSessionId(session.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl transition-all duration-200 group flex items-center justify-between",
                    currentSessionId === session.id 
                      ? "bg-white/10 text-white shadow-sm" 
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <History size={16} className="flex-shrink-0 opacity-50" />
                    <span className="truncate text-sm font-medium">{session.title}</span>
                  </div>
                  <Trash2 
                    size={14} 
                    className="opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity flex-shrink-0"
                    onClick={(e) => deleteSession(session.id, e)}
                  />
                </button>
              ))}
            </div>

            <div className="p-4 border-t border-white/5 space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/5 rounded-lg text-sm text-white/60 transition-colors">
                <Settings size={18} />
                <span>Settings</span>
              </button>
              <div className="px-4 py-2 flex items-center justify-between text-[10px] text-white/30 uppercase tracking-widest">
                <span>v1.0.4 Platinum</span>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 z-10">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60"
          >
            <ChevronRight className={cn("transition-transform duration-300", isSidebarOpen && "rotate-180")} />
          </button>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsAudioEnabled(!isAudioEnabled)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60"
            >
              {isAudioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
              <User size={16} className="text-white/60" />
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 scrollbar-hide">
          <div className="max-w-3xl mx-auto w-full">
            {currentSession?.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center mt-20 text-center space-y-6">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-[0_0_50px_rgba(234,88,12,0.3)]"
                >
                  <Sparkles size={40} className="text-white" />
                </motion.div>
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold tracking-tight text-white">How can I assist you today?</h1>
                  <p className="text-white/40 max-w-md mx-auto">
                    I am Elexus, your advanced intelligence partner. Ask me anything from complex coding to creative writing.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full max-w-lg pt-8">
                  {[
                    "Explain quantum computing",
                    "Write a sci-fi short story",
                    "Help me debug React code",
                    "Plan a trip to Tokyo"
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(suggestion)}
                      className="p-4 text-left glass hover:bg-white/10 rounded-2xl text-sm text-white/60 hover:text-white transition-all border border-white/5"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-10">
                {currentSession?.messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className={cn(
                      "flex gap-6",
                      message.role === 'user' ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center border",
                      message.role === 'user' 
                        ? "bg-white/5 border-white/10" 
                        : "bg-orange-600/20 border-orange-600/30"
                    )}>
                      {message.role === 'user' ? <User size={18} /> : <Bot size={18} className="text-orange-500" />}
                    </div>
                    <div className={cn(
                      "max-w-[80%] space-y-2",
                      message.role === 'user' ? "text-right" : "text-left"
                    )}>
                      <div className={cn(
                        "px-6 py-4 rounded-2xl inline-block",
                        message.role === 'user' 
                          ? "bg-white/5 text-white/90 rounded-tr-none" 
                          : "glass text-white/90 rounded-tl-none border border-white/5"
                      )}>
                        <div className="markdown-body">
                          {message.content ? (
                            <Markdown>{message.content}</Markdown>
                          ) : (
                            <TypingIndicator />
                          )}
                        </div>
                      </div>
                      <div className="text-[10px] text-white/20 uppercase tracking-widest px-2">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-6 z-10">
          <div className="max-w-3xl mx-auto relative">
            <AnimatePresence>
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute -top-8 left-6 flex items-center gap-2 text-[10px] text-orange-500 uppercase tracking-widest font-semibold"
                >
                  <TypingIndicator />
                  <span>Elexus is typing...</span>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="glass rounded-3xl p-2 border border-white/10 shadow-2xl">
              <div className="flex items-end gap-2 px-2">
                <button className="p-3 text-white/40 hover:text-white transition-colors">
                  <Mic size={20} />
                </button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message Elexus..."
                  rows={1}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder:text-white/20 py-3 resize-none max-h-60 scrollbar-hide"
                  style={{ height: 'auto' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${target.scrollHeight}px`;
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "p-3 rounded-2xl transition-all duration-300 mb-1",
                    input.trim() && !isLoading
                      ? "bg-orange-600 text-white shadow-[0_0_20px_rgba(234,88,12,0.4)]"
                      : "bg-white/5 text-white/20 cursor-not-allowed"
                  )}
                >
                  {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
              </div>
            </div>
            <div className="text-center mt-3 text-[10px] text-white/20 uppercase tracking-[0.2em]">
              Powered by Gemini 3.1 Pro • Encrypted Session
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
