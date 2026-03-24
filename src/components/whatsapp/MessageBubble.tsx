"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  FileText,
  Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageActionBar } from "./MessageActionBar";
import {
  SaveToProcessModal,
  CreateNoteModal,
  SaveToDriveModal,
} from "./MessageActionModals";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MessageBubbleMessage {
  id: number;
  direction: string;
  type: string;
  content: string | null;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  mediaFilename: string | null;
  status: string;
  createdAt: Date;
}

export interface MessageBubbleProps {
  message: MessageBubbleMessage;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onReply: (msg: MessageBubbleMessage) => void;
  onCopy: (text: string) => void;
  searchQuery?: string;
  highlightMatch?: (text: string, query: string) => React.ReactNode;
  isNew?: boolean;
  // Action bar props
  isFavorite?: boolean;
  assistidoId?: number | null;
  processoId?: number | null;
  contactId?: number;
  onSaveToProcess?: (msg: MessageBubbleMessage) => void;
  onCreateNote?: (msg: MessageBubbleMessage) => void;
  onSaveToDrive?: (msg: MessageBubbleMessage) => void;
  onToggleFavorite?: (msg: MessageBubbleMessage) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return <Clock className="h-3 w-3 text-zinc-400" />;
    case "sent":
      return <Check className="h-3 w-3 text-zinc-400" />;
    case "delivered":
      return <CheckCheck className="h-3 w-3 text-zinc-400" />;
    case "read":
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    case "error":
      return <AlertCircle className="h-3 w-3 text-red-500" />;
    default:
      return null;
  }
}

function renderText(
  text: string,
  searchQuery?: string,
  highlightMatch?: (text: string, query: string) => React.ReactNode,
) {
  if (searchQuery && highlightMatch) {
    return highlightMatch(text, searchQuery);
  }
  return text;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Quoted reply block shown above the message text */
function ReplyQuote({
  quotedText,
  isOutbound,
  searchQuery,
  highlightMatch,
}: {
  quotedText: string;
  isOutbound: boolean;
  searchQuery?: string;
  highlightMatch?: (text: string, query: string) => React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mb-1.5 px-2.5 py-1.5 rounded-lg border-l-[3px] text-xs",
        isOutbound
          ? "bg-emerald-100/60 dark:bg-emerald-900/20 border-emerald-500 text-zinc-600 dark:text-zinc-400"
          : "bg-zinc-100/70 dark:bg-zinc-800/50 border-zinc-400 text-zinc-600 dark:text-zinc-400",
      )}
    >
      <p className="line-clamp-2 whitespace-pre-wrap">
        {renderText(quotedText, searchQuery, highlightMatch)}
      </p>
    </div>
  );
}

/** Inline timestamp + delivery status at the bottom-right of the bubble */
function TimestampRow({
  time,
  isOutbound,
  status,
}: {
  time: string;
  isOutbound: boolean;
  status: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 float-right ml-2 mt-1 translate-y-0.5">
      <span className="text-[10px] leading-none text-zinc-400 tabular-nums">
        {time}
      </span>
      {isOutbound && <StatusIcon status={status} />}
    </span>
  );
}

/** Media renderers */
function MediaImage({ url }: { url: string }) {
  return (
    <img
      src={url}
      alt="Imagem"
      className="max-w-full rounded-xl mb-1.5 cursor-pointer hover:opacity-95 transition-opacity"
      loading="lazy"
    />
  );
}

function MediaDocument({
  filename,
  mimeType,
  url,
}: {
  filename: string | null;
  mimeType: string | null;
  url: string | null;
}) {
  return (
    <a
      href={url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 p-2.5 bg-zinc-100/80 dark:bg-zinc-800/50 rounded-xl mb-1.5 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer"
    >
      <div className="h-10 w-10 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center shrink-0">
        <FileText className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-zinc-900 dark:text-zinc-100">
          {filename || "Documento"}
        </p>
        <p className="text-[11px] text-zinc-400">{mimeType || "document"}</p>
      </div>
    </a>
  );
}

function MediaAudio({ url }: { url: string | null }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-zinc-100/80 dark:bg-zinc-800/50 rounded-xl mb-1.5">
      <Mic className="h-5 w-5 text-zinc-400 shrink-0" />
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio controls src={url || undefined} className="h-8 flex-1 max-w-[200px]" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// MessageBubble
// ---------------------------------------------------------------------------

export function MessageBubble({
  message: msg,
  isSelectionMode,
  isSelected,
  onToggleSelect,
  onReply,
  onCopy,
  searchQuery,
  highlightMatch,
  isNew,
  isFavorite = false,
  assistidoId = null,
  processoId = null,
  contactId,
  onSaveToProcess,
  onCreateNote,
  onSaveToDrive,
  onToggleFavorite,
}: MessageBubbleProps) {
  const isOutbound = msg.direction === "outbound";
  const time = format(new Date(msg.createdAt), "HH:mm");

  // Modal state
  const [showSaveToProcess, setShowSaveToProcess] = useState(false);
  const [showCreateNote, setShowCreateNote] = useState(false);
  const [showSaveToDrive, setShowSaveToDrive] = useState(false);

  // Parse quoted content ("> " prefix lines)
  const hasQuote = msg.content?.startsWith("> ");
  let quotedText = "";
  let replyText = msg.content || "";

  if (hasQuote && msg.content) {
    const lines = msg.content.split("\n");
    const quoteLines: string[] = [];
    let restIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2));
      } else if (lines[i].trim() === "" && quoteLines.length > 0) {
        restIndex = i + 1;
        break;
      } else {
        restIndex = i;
        break;
      }
    }
    quotedText = quoteLines.join("\n");
    replyText = lines.slice(restIndex).join("\n");
  }

  const hasMedia = msg.type !== "text" && !!(msg.mediaUrl || msg.type === "document");
  const hasContent = !!msg.content;

  // Label for non-text messages that have no renderable content or media URL
  const typeLabel: Record<string, string> = {
    sticker: "[Sticker]",
    image: "[Imagem]",
    audio: "[Áudio]",
    video: "[Vídeo]",
    document: "[Documento]",
    location: "[Localização]",
    contact: "[Contato]",
    reaction: "[Reação]",
    poll: "[Enquete]",
  };
  const fallbackTypeLabel =
    !hasContent && !hasMedia && msg.type !== "text"
      ? (typeLabel[msg.type] ?? `[${msg.type}]`)
      : null;

  return (
    <div
      className={cn(
        "flex mb-1.5 items-start",
        isOutbound ? "justify-end" : "justify-start",
        isSelectionMode && "cursor-pointer",
        isNew && "animate-message-in",
      )}
      onClick={isSelectionMode ? () => onToggleSelect(msg.id) : undefined}
    >
      {/* Selection checkbox */}
      {isSelectionMode && (
        <div
          className={cn(
            "flex items-center justify-center w-7 shrink-0 mt-1",
            isOutbound ? "order-last ml-1" : "order-first mr-1",
          )}
        >
          <div
            className={cn(
              "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-200",
              isSelected
                ? "bg-emerald-500 border-emerald-500 animate-scale-in"
                : "border-zinc-300 dark:border-zinc-600",
            )}
          >
            {isSelected && <Check className="h-3 w-3 text-white" />}
          </div>
        </div>
      )}

      {/* Wrapper for hover actions */}
      <div
        className={cn(
          "group/msg relative max-w-[70%] flex",
          isOutbound ? "flex-row" : "flex-row-reverse",
          isSelected && "ring-2 ring-emerald-500/50 rounded-2xl",
        )}
      >
        {/* Hover action bar — replaces old inline reply/copy buttons */}
        {!isSelectionMode && (
          <MessageActionBar
            isFavorite={isFavorite}
            hasMedia={hasMedia}
            onSaveToProcess={() => {
              if (onSaveToProcess) {
                onSaveToProcess(msg);
              } else {
                setShowSaveToProcess(true);
              }
            }}
            onCreateNote={() => {
              if (onCreateNote) {
                onCreateNote(msg);
              } else {
                setShowCreateNote(true);
              }
            }}
            onSaveToDrive={() => {
              if (onSaveToDrive) {
                onSaveToDrive(msg);
              } else {
                setShowSaveToDrive(true);
              }
            }}
            onToggleFavorite={() => onToggleFavorite?.(msg)}
            onCopy={() => { if (msg.content) onCopy(msg.content); }}
            onReply={() => onReply(msg)}
            onShowDetails={() => {}}
          />
        )}

        {/* Message bubble */}
        <div
          className={cn(
            "rounded-2xl px-3 py-1.5 shadow-sm",
            isOutbound
              ? "rounded-tr-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100/80 dark:border-emerald-900/30"
              : "rounded-tl-md bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-800/80",
          )}
        >
          {/* Reply quote */}
          {hasQuote && quotedText && (
            <ReplyQuote
              quotedText={quotedText}
              isOutbound={isOutbound}
              searchQuery={searchQuery}
              highlightMatch={highlightMatch}
            />
          )}

          {/* Media */}
          {msg.type === "image" && msg.mediaUrl && (
            <MediaImage url={msg.mediaUrl} />
          )}
          {msg.type === "document" && (
            <MediaDocument
              filename={msg.mediaFilename}
              mimeType={msg.mediaMimeType}
              url={msg.mediaUrl}
            />
          )}
          {msg.type === "audio" && <MediaAudio url={msg.mediaUrl} />}

          {/* Text content */}
          {hasContent && !hasQuote && (
            <p className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap break-words">
              {renderText(msg.content!, searchQuery, highlightMatch)}
              <TimestampRow time={time} isOutbound={isOutbound} status={msg.status} />
            </p>
          )}

          {/* Reply text (after quote) */}
          {hasQuote && replyText && (
            <p className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap break-words">
              {renderText(replyText, searchQuery, highlightMatch)}
              <TimestampRow time={time} isOutbound={isOutbound} status={msg.status} />
            </p>
          )}

          {/* Fallback label for stickers/unrenderable media types */}
          {fallbackTypeLabel && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">
              {fallbackTypeLabel}
              <TimestampRow time={time} isOutbound={isOutbound} status={msg.status} />
            </p>
          )}

          {/* Timestamp only (for media-only messages or edge cases) */}
          {(!hasContent || (hasQuote && !replyText)) && !fallbackTypeLabel && (
            <div className="flex items-center justify-end gap-1 mt-0.5">
              <span className="text-[10px] text-zinc-400 tabular-nums">{time}</span>
              {isOutbound && <StatusIcon status={msg.status} />}
            </div>
          )}
        </div>
      </div>

      {/* Action modals (rendered inline to keep state scoped per message) */}
      {!isSelectionMode && (
        <>
          <SaveToProcessModal
            open={showSaveToProcess}
            onOpenChange={setShowSaveToProcess}
            messageId={msg.id}
            messageText={msg.content}
            assistidoId={assistidoId}
            processoId={processoId}
          />
          <CreateNoteModal
            open={showCreateNote}
            onOpenChange={setShowCreateNote}
            messageId={msg.id}
            messageText={msg.content}
            assistidoId={assistidoId}
            processoId={processoId}
          />
          <SaveToDriveModal
            open={showSaveToDrive}
            onOpenChange={setShowSaveToDrive}
            contactId={contactId ?? 0}
            messageIds={[msg.id]}
            mediaFilename={msg.mediaFilename}
          />
        </>
      )}
    </div>
  );
}
