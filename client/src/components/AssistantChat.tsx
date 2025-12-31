import { useEffect, useRef, useState } from "react";
import {
  Bot,
  BotMessageSquare,
  ChevronDown,
  Minus,
  Minimize2,
  Maximize2,
  SendHorizontal,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAssistantContext } from "@/context/assistant-context";
import { useLocation } from "wouter";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatBlock =
  | { type: "p"; content: string }
  | { type: "h1" | "h2" | "h3"; content: string }
  | { type: "quote"; content: string }
  | { type: "code"; content: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

const buildChatBlocks = (content: string): ChatBlock[] => {
  const lines = content.split(/\r?\n/);
  const blocks: ChatBlock[] = [];
  let paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ type: "p", content: paragraph.join(" ") });
    paragraph = [];
  };

  const flushList = () => {
    if (!listType || !listItems.length) {
      listType = null;
      listItems = [];
      return;
    }
    blocks.push({ type: listType, items: listItems });
    listType = null;
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const isFence = line.startsWith("```");
    if (isFence) {
      if (!inCodeBlock) {
        flushParagraph();
        flushList();
        inCodeBlock = true;
        codeLines = [];
      } else {
        blocks.push({ type: "code", content: codeLines.join("\n") });
        inCodeBlock = false;
        codeLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(rawLine);
      continue;
    }
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.+)/.exec(line);
    const quoteMatch = /^>\s+(.+)/.exec(line);
    const ulMatch = /^[-*]\s+(.+)/.exec(line);
    const olMatch = /^\d+\.\s+(.+)/.exec(line);

    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      blocks.push({
        type: level === 1 ? "h1" : level === 2 ? "h2" : "h3",
        content,
      });
      continue;
    }

    if (quoteMatch) {
      flushParagraph();
      flushList();
      blocks.push({ type: "quote", content: quoteMatch[1] });
      continue;
    }

    if (ulMatch) {
      flushParagraph();
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      listItems.push(ulMatch[1]);
      continue;
    }

    if (olMatch) {
      flushParagraph();
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }
      listItems.push(olMatch[1]);
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  if (inCodeBlock && codeLines.length) {
    blocks.push({ type: "code", content: codeLines.join("\n") });
  }

  return blocks;
};

const renderAssistantContent = (content: string) => {
  const blocks = buildChatBlocks(content);
  return blocks.map((block, idx) => {
    const withInlineMarkup = (text: string) =>
      text
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a href=\"$2\" class=\"underline\">$1</a>");
    if (block.type === "h1" || block.type === "h2" || block.type === "h3") {
      const size =
        block.type === "h1"
          ? "text-sm font-semibold"
          : block.type === "h2"
          ? "text-xs font-semibold"
          : "text-xs font-medium";
      return (
        <div
          key={`${block.type}-${idx}`}
          className={`${size} text-foreground`}
          dangerouslySetInnerHTML={{ __html: withInlineMarkup(block.content) }}
        />
      );
    }
    if (block.type === "quote") {
      return (
        <blockquote
          key={`quote-${idx}`}
          className="border-l-2 border-muted-foreground/40 pl-3 text-xs text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: withInlineMarkup(block.content) }}
        />
      );
    }
    if (block.type === "code") {
      return (
        <pre
          key={`code-${idx}`}
          className="rounded-md bg-muted px-3 py-2 text-[11px] text-foreground overflow-x-auto"
        >
          <code>{block.content}</code>
        </pre>
      );
    }
    if (block.type === "p") {
      return (
        <p
          key={`p-${idx}`}
          className="text-xs leading-relaxed text-foreground break-words"
          dangerouslySetInnerHTML={{
            __html: withInlineMarkup(block.content),
          }}
        />
      );
    }
    if (block.type === "ul") {
      return (
        <ul
          key={`ul-${idx}`}
          className="list-disc list-inside space-y-1 text-xs text-foreground"
        >
          {block.items.map((item, itemIdx) => (
            <li
              key={`ul-${idx}-${itemIdx}`}
              dangerouslySetInnerHTML={{ __html: withInlineMarkup(item) }}
              className="break-words"
            />
          ))}
        </ul>
      );
    }
    return (
      <ul key={`ol-${idx}`} className="list-none space-y-1 text-xs text-foreground">
        {block.items.map((item, itemIdx) => (
          <li key={`ol-${idx}-${itemIdx}`} className="flex gap-2 break-words">
            <span className="text-muted-foreground">-</span>
            <span
              className="flex-1"
              dangerouslySetInnerHTML={{ __html: withInlineMarkup(item) }}
            />
          </li>
        ))}
      </ul>
    );
  });
};

export function AssistantChat() {
  const { page, context } = useAssistantContext();
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [assistantMuted, setAssistantMuted] = useState(false);
  const [assistantVolume, setAssistantVolume] = useState(60);
  const [assistantSound, setAssistantSound] = useState("soft-chime");
  const [isExpanded, setIsExpanded] = useState(false);
  const initialMessages: ChatMessage[] = [
    {
      role: "assistant",
      content:
        "Hi! I can help explain features or summarize simulation results. Ask me anything about MatSim.",
    },
  ];
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ASSISTANT_SOUND_KEYS = {
    mute: "matsim.assistant.mute",
    volume: "matsim.assistant.volume",
    sound: "matsim.assistant.sound",
  };

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  };

  useEffect(() => {
    if (!isOpen) return;
    scrollToBottom("smooth");
  }, [messages, isLoading, isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  useEffect(() => {
    const applySettings = () => {
      const savedMute = localStorage.getItem(ASSISTANT_SOUND_KEYS.mute);
      const savedVolume = localStorage.getItem(ASSISTANT_SOUND_KEYS.volume);
      const savedSound = localStorage.getItem(ASSISTANT_SOUND_KEYS.sound);
      setAssistantMuted(savedMute === "true");
      if (savedVolume != null) {
        const parsed = Number(savedVolume);
        if (!Number.isNaN(parsed)) setAssistantVolume(parsed);
      }
      if (savedSound) setAssistantSound(savedSound);
    };
    applySettings();
    const handler = () => applySettings();
    window.addEventListener("matsim-assistant-settings", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("matsim-assistant-settings", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 24;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
    setShowScrollToBottom((prev) => {
      const next = !atBottom;
      return prev === next ? prev : next;
    });
  };

  const handleSend = async (override?: string) => {
    const trimmed = (override ?? input).trim();
    if (!trimmed || isLoading) return;
    const nextMessages = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          page,
          context,
        }),
      });
      const data = await res.json();
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: data?.answer || "I couldn't generate a response right now.",
        },
      ]);
      playChime();
    } catch (error) {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: "Sorry, I hit an error. Please try again.",
        },
      ]);
      playChime();
    } finally {
      setIsLoading(false);
    }
  };
  const handleClose = () => {
    setIsOpen(false);
    setMessages(initialMessages);
    setInput("");
    setIsLoading(false);
  };

  const playChime = () => {
    if (assistantMuted || assistantVolume <= 0) return;
    const volume = Math.max(0, Math.min(1, assistantVolume / 100));
    const ctx = audioContextRef.current ?? new AudioContext();
    audioContextRef.current = ctx;
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const now = ctx.currentTime;

    const playOsc = (
      type: OscillatorType,
      freq: number,
      duration: number,
      gainValue: number,
      freqEnd?: number
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (freqEnd != null) {
        osc.frequency.exponentialRampToValueAtTime(
          freqEnd,
          now + duration
        );
      }
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(gainValue, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + duration + 0.02);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    };

    const playNoise = (duration: number, gainValue: number) => {
      const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i += 1) {
        data[i] = (Math.random() * 2 - 1) * 0.4;
      }
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(gainValue, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      source.stop(now + duration + 0.02);
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
      };
    };

    const level = Math.max(0.03, volume * 0.25);
    switch (assistantSound) {
      case "bubble-pop":
        playOsc("triangle", 700, 0.12, level * 0.6, 220);
        break;
      case "paper-tick":
        playNoise(0.06, level * 0.35);
        break;
      case "soft-bell":
        playOsc("sine", 660, 0.45, level * 0.55);
        playOsc("triangle", 990, 0.35, level * 0.35);
        break;
      case "synth-ping":
        playOsc("square", 780, 0.18, level * 0.5);
        break;
      case "soft-chime":
      default:
        playOsc("sine", 880, 0.3, level * 0.55);
        playOsc("sine", 1320, 0.22, level * 0.35);
        break;
    }
  };

  const pageKey = page.startsWith("/") ? page.slice(1) : page;
  const normalizedPage = pageKey.toLowerCase();
  const quickPrompts = (() => {
    if (
      normalizedPage.startsWith("compare-simulations") ||
      normalizedPage === "compare-simulations"
    ) {
      return [
        "Compare the selected simulations.",
        "Explain the results comparison and weights.",
        "How should I interpret the heatmap?",
        "What does the 3D metrics space show?",
        "How do the overlay curves help?",
      ];
    }
    if (normalizedPage === "simulation-detail" || normalizedPage.startsWith("simulations/")) {
      return [
        "Summarize this run and the key metrics.",
        "What does the stress-strain chart show?",
        "How do I use the 3D results viewer playback?",
        "What is an iso-surface vs a slice?",
      ];
    }
    if (normalizedPage === "materials" || normalizedPage.startsWith("materials")) {
      return [
        "How should I compare materials using the charts?",
        "What does the thermal expansion chart tell me?",
        "What does the stress-strain curve represent?",
      ];
    }
    if (normalizedPage === "geometries" || normalizedPage.startsWith("geometries")) {
      return [
        "What should I check when choosing a geometry?",
        "What does the STL preview represent?",
        "How do geometry size and shape affect results?",
      ];
    }
    if (normalizedPage === "create-simulation" || normalizedPage === "simulations/create") {
      return [
        "What are the required inputs to run a simulation?",
        "How do boundary conditions work on faces?",
        "What does damping ratio control?",
      ];
    }
    if (normalizedPage === "material-detail") {
      return [
        "Summarize this material's key properties.",
        "How do I interpret the stress-strain chart?",
        "How does thermal expansion impact tests?",
      ];
    }
    if (normalizedPage === "compare-materials") {
      return [
        "Compare selected materials and key differences.",
        "How do I read the thermal expansion overlay?",
        "Which material is stiffer based on the curves?",
      ];
    }
    if (normalizedPage.startsWith("simulations")) {
      return [
        "How do I use the filters and sorting on this page?",
        "What do the simulation statuses mean?",
        "How do I rerun or edit a simulation?",
      ];
    }
    if (normalizedPage === "" || normalizedPage === "dashboard") {
      return [
        "What can I do from the dashboard?",
        "How do I start a new simulation?",
        "What do the status tiles mean?",
      ];
    }
    return ["What can I do on this page?"];
  })();

  return (
    <>
      <div
        className={`fixed bottom-5 right-5 z-50 ${
          isOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div
          className={`${
            isExpanded
              ? "w-[560px] max-w-[95vw]"
              : "w-[400px] max-w-[90vw]"
          } rounded-2xl border border-border bg-white/75 dark:bg-slate-950/70 backdrop-blur-sm dark:backdrop-blur-md shadow-xl overflow-hidden relative transition-all duration-200 ease-out origin-bottom-right ${
            isOpen
              ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
              : "opacity-0 scale-50 translate-y-3 pointer-events-none"
          }`}
          // aria-hidden={!isOpen}
        >
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div className="text-sm flex items-center gap-2 font-semibold text-foreground">
                <BotMessageSquare className="h-4 w-4 text-primary" />
                <span>MatSim Assistant</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="text-muted-foreground p-1 rounded-sm hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors"
                  onClick={() => setIsOpen(false)}
                  aria-label="Minimize assistant"
                  title="Minimize"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="text-muted-foreground p-1 rounded-sm hover:text-orange-500 hover:bg-orange-500/10 transition-colors"
                  onClick={() => setIsExpanded((prev) => !prev)}
                  aria-label={isExpanded ? "Restore assistant size" : "Expand assistant"}
                  title={isExpanded ? "Restore" : "Expand"}
                >
                  {isExpanded ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  className="text-muted-foreground p-1 rounded-sm hover:text-destructive hover:bg-destructive/15 transition-colors"
                  onClick={handleClose}
                  aria-label="Close assistant"
                  title="End Chat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div
              ref={scrollContainerRef}
              className={`${
                isExpanded ? "max-h-[520px]" : "max-h-[360px]"
              } overflow-y-auto space-y-3 px-4 pt-8 text-sm relative`}
              onScroll={handleScroll}
            >
              {messages.map((message, index) => {
                const isAssistant = message.role === "assistant";
                return (
                  <div
                    key={`${message.role}-${index}`}
                    className={`flex w-full items-end gap-2 ${
                      isAssistant ? "justify-start" : "justify-end"
                    }`}
                  >
                    {isAssistant && (
                      <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                        <BotMessageSquare className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <div
                      className={
                        isAssistant
                          ? "max-w-[75%] rounded-xl rounded-bl-none bg-primary/10 px-4 py-3 -translate-y-[20px] text-foreground text-xs space-y-2"
                          : "max-w-[75%] rounded-xl rounded-br-none bg-muted/50 px-4 py-3 -translate-y-[20px] text-foreground text-xs"
                      }
                    >
                      {isAssistant
                        ? renderAssistantContent(message.content)
                        : message.content}
                    </div>
                    {!isAssistant && (
                      <div className="h-7 w-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                        <User className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex w-full items-end gap-2 justify-start">
                  <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center translate-y-4">
                    <BotMessageSquare className="h-3.5 w-3.5" />
                  </div>
                  <div className="max-w-[75%] rounded-xl rounded-bl-sm bg-primary/10 px-4 py-3 text-foreground text-xs">
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-foreground/60 animate-pulse" />
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-foreground/60 animate-pulse"
                        style={{ animationDelay: "0.15s" }}
                      />
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-foreground/60 animate-pulse"
                        style={{ animationDelay: "0.3s" }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div
                ref={messagesEndRef}
              />
            </div>
            {showScrollToBottom && (
              <div className="flex justify-center absolute w-full -translate-y-8">
                <button
                  type="button"
                  className="h-8 w-8 rounded-full border border-border bg-primary/10 shadow-sm text-muted-foreground hover:text-foreground hover:border-primary/40 absolute right-[22px]"
                  onClick={() => scrollToBottom("smooth")}
                  aria-label="Scroll to latest message"
                  title="Go to latest chat"
                >
                  <ChevronDown className="h-4 w-4 mx-auto" />
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-2 px-4 py-3">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="rounded-full border border-border bg-background px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors disabled:hover:text-muted-foreground disabled:hover:bg-background disabled:hover:border-border disabled:opacity-70 disabled:cursor-not-allowed"
                  onClick={() => handleSend(prompt)}
                  disabled={isLoading}
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 border-t border-border px-3 py-3">
              <Input
                placeholder="Ask about this page or results..."
                className="text-xs placeholder:text-xs"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSend();
                }}
              />
              <Button 
                size="icon" 
                onClick={() => handleSend()} 
                disabled={isLoading || !input}
                className={`opacity-90 hover:opacity-100 disabled:pointer-events-auto disabled:hover:opacity-50 disabled:cursor-not-allowed ${!isOpen ? "!pointer-events-none" : ""}`}
              >
                <SendHorizontal className="h-4 w-4" />
              </Button>
            </div>
        </div>
      </div>
      <div className="fixed bottom-5 right-5 z-50">
        <div
          className={`absolute bottom-0 right-0 transition-all duration-200 ease-out ${
            isOpen
              ? "opacity-0 scale-80 translate-y-2 translate-x-2 pointer-events-none"
              : "opacity-100 scale-100 translate-y-0 translate-x-0 pointer-events-auto"
          }`}
        >
          <div className="relative group">
            <Button
              className="rounded-full h-12 w-12 shadow-lg"
              onClick={() => setIsOpen(true)}
            >
              <BotMessageSquare className="!h-6 !w-6" />
            </Button>
            <span className="pointer-events-none absolute bottom-full -left-5 mb-3 w-max -translate-x-1/2 translate-y-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <span className="relative rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">
                MatSim Assistant
                <span className="absolute right-2.5 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-slate-900" />
              </span>
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
