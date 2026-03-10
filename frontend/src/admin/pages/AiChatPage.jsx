import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { useAuth } from "@/auth/context/AuthContext";
import { adminQueryKeys, getAiHistory, sendAiChat } from "../api";
import { AdminButton, AdminCard, AdminPage, PageContent, PageHeader, StatusBadge } from "../components";
import { formatAdminDateTime } from "../utils/dateTime";

function ToolCallBlock({ toolCall, result }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-2 rounded-[var(--admin-radius-md)] border border-[var(--admin-border)] bg-[var(--admin-bg-base)] text-[var(--admin-text-caption)]">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <span className="material-symbols-outlined text-sm text-[var(--admin-text-muted)]">build</span>
        <span className="font-medium text-[var(--admin-text-secondary)]">{toolCall.name}</span>
        {result ? (
          <StatusBadge variant={result.status === "success" ? "success" : "error"} size="sm">
            {result.status}
          </StatusBadge>
        ) : null}
        {result?.duration_ms != null ? (
          <span className="ml-auto text-[var(--admin-text-muted)]">{result.duration_ms}ms</span>
        ) : null}
        <span className="material-symbols-outlined text-sm text-[var(--admin-text-muted)]">
          {expanded ? "expand_less" : "expand_more"}
        </span>
      </button>
      {expanded ? (
        <div className="border-t border-[var(--admin-border)] px-3 py-2">
          <pre className="overflow-x-auto whitespace-pre-wrap text-[var(--admin-text-micro)] text-[var(--admin-text-muted)]">
            {JSON.stringify(toolCall.arguments, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

function ChatBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? "order-2" : "order-1"}`}>
        <div
          className={`rounded-[var(--admin-radius-lg)] px-4 py-3 text-[var(--admin-text-small)] ${
            isUser
              ? "bg-[var(--admin-interactive-primary)] text-white"
              : "bg-[var(--admin-bg-card)] text-[var(--admin-text-primary)] border border-[var(--admin-border)]"
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {message.toolCalls?.length > 0 ? (
          <div className="mt-1">
            {message.toolCalls.map((tc, i) => (
              <ToolCallBlock key={i} toolCall={tc} result={message.toolResults?.[i]} />
            ))}
          </div>
        ) : null}

        {message.model ? (
          <p className="mt-1 text-[var(--admin-text-micro)] text-[var(--admin-text-muted)]">{message.model}</p>
        ) : null}
      </div>
    </div>
  );
}

function ChatTab({ token }) {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  const chatMutation = useMutation({
    mutationFn: (apiMessages) => sendAiChat({ token, messages: apiMessages, conversationId }),
    onSuccess: (data) => {
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          toolCalls: data.toolCalls ?? [],
          toolResults: data.toolResults ?? [],
          model: data.model ?? null,
        },
      ]);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || chatMutation.isPending) {
      return;
    }

    const userMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");

    const apiMessages = nextMessages.map((m) => ({ role: m.role, content: m.content }));
    chatMutation.mutate(apiMessages);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    chatMutation.reset();
  };

  return (
    <div className="flex h-[calc(100vh-16rem)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {conversationId ? (
            <span className="text-[var(--admin-text-caption)] text-[var(--admin-text-muted)]">
              Conversation: <span className="font-mono">{conversationId.slice(0, 8)}…</span>
            </span>
          ) : (
            <span className="text-[var(--admin-text-caption)] text-[var(--admin-text-muted)]">New conversation</span>
          )}
        </div>
        <AdminButton
          variant="ghost"
          size="sm"
          onClick={handleNewConversation}
          icon={<span className="material-symbols-outlined text-base">add</span>}
          iconPosition="left"
        >
          New conversation
        </AdminButton>
      </div>

      <div className="flex-1 overflow-y-auto rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)] bg-[var(--admin-bg-base)] p-4 admin-scrollbar">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined mb-4 text-5xl text-[var(--admin-text-disabled)]">smart_toy</span>
            <p className="text-[var(--admin-text-body)] font-medium text-[var(--admin-text-primary)]">AI Admin Assistant</p>
            <p className="mt-1 max-w-sm text-[var(--admin-text-small)] text-[var(--admin-text-muted)]">
              Ask questions about your platform data, get insights, or request actions.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <ChatBubble key={i} message={msg} />
            ))}
            {chatMutation.isPending ? (
              <div className="flex justify-start mb-4">
                <div className="rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)] bg-[var(--admin-bg-card)] px-4 py-3">
                  <span className="material-symbols-outlined animate-spin text-base text-[var(--admin-interactive-primary)]">progress_activity</span>
                </div>
              </div>
            ) : null}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {chatMutation.error ? (
        <p className="mt-2 text-[var(--admin-text-caption)] text-[var(--admin-status-error)]">{chatMutation.error.message || "Failed to send message."}</p>
      ) : null}

      <div className="mt-4 flex items-end gap-3">
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the AI assistant… (Enter to send, Shift+Enter for new line)"
          className="admin-focus-ring flex-1 resize-none rounded-[var(--admin-radius-md)] border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-4 py-2.5 text-[var(--admin-text-small)] text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-disabled)] outline-none"
          disabled={chatMutation.isPending}
        />
        <AdminButton
          variant="primary"
          onClick={handleSend}
          loading={chatMutation.isPending}
          disabled={!input.trim()}
          icon={<span className="material-symbols-outlined text-base">send</span>}
          iconPosition="right"
        >
          Send
        </AdminButton>
      </div>
    </div>
  );
}

function HistoryTab({ token }) {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const historyQuery = useQuery({
    queryKey: adminQueryKeys.ai.history({ page, pageSize }),
    enabled: Boolean(token),
    queryFn: ({ signal }) => getAiHistory({ token, page, pageSize, signal }),
    placeholderData: (previous) => previous,
  });

  const items = historyQuery.data?.items ?? [];
  const pagination = historyQuery.data?.pagination;

  return (
    <AdminCard title="Tool Call History" noPadding>
      {historyQuery.isPending && !historyQuery.data ? (
        <div className="px-6 py-12 text-center text-[var(--admin-text-small)] text-[var(--admin-text-muted)]">Loading history…</div>
      ) : historyQuery.error ? (
        <div className="px-6 py-12 text-center text-[var(--admin-text-small)] text-[var(--admin-status-error)]">{historyQuery.error.message || "Failed to load history."}</div>
      ) : items.length === 0 ? (
        <div className="px-6 py-12 text-center text-[var(--admin-text-small)] text-[var(--admin-text-muted)]">No tool call history yet.</div>
      ) : (
        <>
          <div className="divide-y divide-[var(--admin-border)]">
            <div className="grid grid-cols-12 gap-2 px-6 py-3 text-[var(--admin-text-caption)] font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider">
              <span className="col-span-3">Date</span>
              <span className="col-span-3">Conversation</span>
              <span className="col-span-3">Tool</span>
              <span className="col-span-2">Status</span>
              <span className="col-span-1 text-right">Duration</span>
            </div>
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-12 items-center gap-2 px-6 py-3">
                <span className="col-span-3 text-[var(--admin-text-caption)] text-[var(--admin-text-muted)]">{formatAdminDateTime(item.created_at)}</span>
                <span className="col-span-3 truncate font-mono text-[var(--admin-text-caption)] text-[var(--admin-text-muted)]">{item.conversation_id?.slice(0, 10)}…</span>
                <span className="col-span-3 truncate text-[var(--admin-text-small)] text-[var(--admin-text-primary)]">{item.tool_name}</span>
                <span className="col-span-2">
                  <StatusBadge variant={item.status === "success" ? "success" : "error"} size="sm">
                    {item.status}
                  </StatusBadge>
                </span>
                <span className="col-span-1 text-right text-[var(--admin-text-caption)] text-[var(--admin-text-muted)]">{item.duration_ms != null ? `${item.duration_ms}ms` : "—"}</span>
              </div>
            ))}
          </div>

          {pagination && pagination.totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-[var(--admin-border)] px-6 py-4">
              <p className="text-[var(--admin-text-caption)] text-[var(--admin-text-muted)]">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </p>
              <div className="flex gap-2">
                <AdminButton variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </AdminButton>
                <AdminButton variant="secondary" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </AdminButton>
              </div>
            </div>
          ) : null}
        </>
      )}
    </AdminCard>
  );
}

export default function AiChatPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("chat");

  return (
    <AdminPage>
      <PageHeader title="AI Assistant" subtitle="Chat with the AI admin assistant and review tool call history" />

      <PageContent>
        <div className="mb-6 flex gap-1 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)] bg-[var(--admin-bg-card)] p-1 w-fit">
          {["chat", "history"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-[var(--admin-radius-md)] px-4 py-2 text-[var(--admin-text-small)] font-medium capitalize transition-all duration-[var(--admin-transition-fast)] ${
                activeTab === tab
                  ? "bg-[var(--admin-interactive-primary)] text-white shadow-[var(--admin-glow-primary)]"
                  : "text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]"
              }`}
            >
              {tab === "chat" ? (
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">chat</span>
                  Chat
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">history</span>
                  History
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "chat" ? <ChatTab token={token} /> : <HistoryTab token={token} />}
      </PageContent>
    </AdminPage>
  );
}
