
"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { 
  MessageSquare, 
  Plus, 
  ArrowLeft, 
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Loader2
} from "lucide-react";
import type { Conversation, ConversationStatus } from "../lib/types";
import { canSendMessages, getStatusLabel } from "../lib/types";

interface ConversationsListProps {
  identification?: string;
  onSelectConversation: (conversation: Conversation) => void;
  onNewConversation: () => void;
  onBack?: () => void;
  activeSessionId?: string;
}

function groupByDate(conversations: Conversation[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const groups: {
    today: Conversation[];
    yesterday: Conversation[];
    lastWeek: Conversation[];
    older: Conversation[];
  } = {
    today: [],
    yesterday: [],
    lastWeek: [],
    older: [],
  };

  for (const conv of conversations) {
    const date = new Date(conv.createdAt);
    if (date >= today) {
      groups.today.push(conv);
    } else if (date >= yesterday) {
      groups.yesterday.push(conv);
    } else if (date >= lastWeek) {
      groups.lastWeek.push(conv);
    } else {
      groups.older.push(conv);
    }
  }

  return groups;
}

function StatusIcon({ status }: { status: ConversationStatus }) {
  switch (status) {
    case "active":
      return <MessageSquare className="w-3.5 h-3.5 text-green-500" />;
    case "paused":
      return <Clock className="w-3.5 h-3.5 text-yellow-500" />;
    case "closed":
      return <CheckCircle className="w-3.5 h-3.5 text-gray-400" />;
    case "handed_over":
    case "waiting_specialist":
      return <User className="w-3.5 h-3.5 text-blue-500" />;
    default:
      return <AlertCircle className="w-3.5 h-3.5 text-gray-400" />;
  }
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
}: {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
}) {
  const canInteract = canSendMessages(conversation.status);
  
  const date = new Date(conversation.updatedAt);
  const timeStr = date.toLocaleTimeString("es-VE", { 
    hour: "2-digit", 
    minute: "2-digit" 
  });

  const title = conversation.summary 
    ? conversation.summary.split("|")[0].trim().substring(0, 50)
    : `Conversación ${conversation.sessionId.slice(-6)}`;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
        "hover:bg-gray-50",
        isActive && "bg-gray-100",
        !canInteract && "opacity-60"
      )}
    >
      <div className="shrink-0 mt-0.5">
        <StatusIcon status={conversation.status} />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium truncate",
          isActive ? "text-black" : "text-gray-700"
        )}>
          {conversation.contract && (
            <span className="text-blue-600 font-bold mr-1">#{conversation.contract}</span>
          )}
          {title}
        </p>
        {conversation.sector && (
          <p className="text-[10px] text-gray-400 truncate -mt-0.5 mb-1">
            {conversation.sector}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-gray-400">
            {timeStr}
          </span>
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-full",
            conversation.status === "active" && "bg-green-100 text-green-700",
            conversation.status === "paused" && "bg-yellow-100 text-yellow-700",
            conversation.status === "closed" && "bg-gray-100 text-gray-600",
            (conversation.status === "handed_over" || conversation.status === "waiting_specialist") 
              && "bg-blue-100 text-blue-700"
          )}>
            {getStatusLabel(conversation.status)}
          </span>
          {conversation.glpiTicketId && (
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
              Ticket #{conversation.glpiTicketId}
            </span>
          )}
          {conversation.messageCount !== undefined && (
            <span className="text-[10px] text-gray-400">
              {conversation.messageCount} msgs
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function ConversationGroup({
  title,
  conversations,
  activeSessionId,
  onSelect,
}: {
  title: string;
  conversations: Conversation[];
  activeSessionId?: string;
  onSelect: (conv: Conversation) => void;
}) {
  if (conversations.length === 0) return null;

  return (
    <div className="mb-4">
      <h4 className="px-3 py-1 text-[11px] font-medium text-gray-400 uppercase tracking-wide">
        {title}
      </h4>
      <div className="space-y-1">
        {conversations.map((conv) => (
          <ConversationItem
            key={conv.sessionId}
            conversation={conv}
            isActive={conv.sessionId === activeSessionId}
            onSelect={() => onSelect(conv)}
          />
        ))}
      </div>
    </div>
  );
}

export function ConversationsList({
  identification,
  onSelectConversation,
  onNewConversation,
  onBack,
  activeSessionId,
}: ConversationsListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    if (!identification) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/assistant/conversations?identification=${encodeURIComponent(identification)}&includeAll=true`
      );
      
      if (!response.ok) {
        throw new Error("Error al cargar conversaciones");
      }

      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, [identification]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const groupedConversations = groupByDate(conversations);

  return (
    <div className="flex flex-col h-full max-h-full">
      { }
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <h3 className="font-semibold text-sm">Conversaciones</h3>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onNewConversation}
          className="h-8 gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span className="text-xs">Nueva</span>
        </Button>
      </div>

      { }
      <div className="flex-1 overflow-y-auto p-2 pb-16 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
            <p className="text-sm text-gray-500">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadConversations}
              className="mt-2"
            >
              Reintentar
            </Button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <MessageSquare className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">
              No tienes conversaciones previas
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNewConversation}
              className="mt-2"
            >
              Iniciar una nueva
            </Button>
          </div>
        ) : (
          <>
            <ConversationGroup
              title="Hoy"
              conversations={groupedConversations.today}
              activeSessionId={activeSessionId}
              onSelect={onSelectConversation}
            />
            <ConversationGroup
              title="Ayer"
              conversations={groupedConversations.yesterday}
              activeSessionId={activeSessionId}
              onSelect={onSelectConversation}
            />
            <ConversationGroup
              title="Últimos 7 días"
              conversations={groupedConversations.lastWeek}
              activeSessionId={activeSessionId}
              onSelect={onSelectConversation}
            />
            <ConversationGroup
              title="Anteriores"
              conversations={groupedConversations.older}
              activeSessionId={activeSessionId}
              onSelect={onSelectConversation}
            />
          </>
        )}
      </div>
    </div>
  );
}
