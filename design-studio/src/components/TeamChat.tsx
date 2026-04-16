"use client";

import { useEffect, useState, useRef } from "react";
import {
  isConfigured,
  dbSendMessage,
  dbGetMessages,
  subscribeToChat,
  dbGetTeamMembers,
} from "@/lib/supabase";
import { getProfile } from "@/lib/store";
import type { ChatMessage } from "@/lib/types";

interface Props {
  projectId: string;
}

export default function TeamChat({ projectId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [onlineMembers, setOnlineMembers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const profile = getProfile();

  useEffect(() => {
    if (!isConfigured() || !profile) return;

    // Load existing messages
    dbGetMessages(projectId).then((msgs) => {
      setMessages(msgs as ChatMessage[]);
      scrollToBottom();
    });

    // Load team members
    if (profile.companyId) {
      dbGetTeamMembers(profile.companyId).then((members) => {
        setOnlineMembers(members.map((m) => m.full_name));
      });
    }

    // Subscribe to new messages
    const unsubscribe = subscribeToChat(projectId, (newMsg) => {
      setMessages((prev) => [...prev, newMsg as unknown as ChatMessage]);
      scrollToBottom();
    });

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function scrollToBottom() {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !profile || sending) return;

    setSending(true);
    try {
      await dbSendMessage(projectId, profile.id, input.trim());
      setInput("");
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  }

  if (!isConfigured()) {
    return (
      <div className="card text-center py-12">
        <div className="text-4xl mb-3">💬</div>
        <h3 className="font-semibold text-brand-900 mb-2">Team Chat</h3>
        <p className="text-sm text-brand-600 max-w-sm mx-auto">
          Connect your Supabase database to enable real-time team chat.
          Your designers will be able to discuss projects together in real time.
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="card text-center py-8">
        <p className="text-sm text-brand-600">Sign in to use team chat.</p>
      </div>
    );
  }

  return (
    <div className="card flex flex-col" style={{ height: "500px" }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-brand-900/5 pb-3 mb-3">
        <div>
          <h3 className="font-semibold text-brand-900">Team Chat</h3>
          <p className="text-xs text-brand-600">
            {onlineMembers.length} team member{onlineMembers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex -space-x-1">
          {onlineMembers.slice(0, 5).map((name, i) => (
            <div
              key={i}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-amber/20 text-[10px] font-bold text-amber-dark border-2 border-white"
              title={name}
            >
              {name.charAt(0).toUpperCase()}
            </div>
          ))}
          {onlineMembers.length > 5 && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-900/10 text-[10px] font-medium text-brand-600 border-2 border-white">
              +{onlineMembers.length - 5}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-brand-600/60">
            No messages yet. Start a conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id === profile.id;
            const senderName = msg.profiles?.full_name ?? "Unknown";
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div className="text-[10px] text-brand-600/60 mb-0.5 px-1">
                  {isMe ? "You" : senderName} &middot;{" "}
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    isMe
                      ? "bg-brand-900 text-white rounded-br-sm"
                      : "bg-brand-900/5 text-brand-900 rounded-bl-sm"
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="mt-3 flex gap-2 border-t border-brand-900/5 pt-3">
        <input
          className="input flex-1"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
        />
        <button
          type="submit"
          className="btn-primary btn-sm"
          disabled={!input.trim() || sending}
        >
          Send
        </button>
      </form>
    </div>
  );
}
