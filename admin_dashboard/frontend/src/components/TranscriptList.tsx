import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { TranscriptMessage } from '../types/api';

// Case transcripts can run to hundreds of messages for long-running sessions;
// windowing keeps the split-screen view responsive instead of mounting every
// bubble at once.
export function TranscriptList({
  messages,
  botReasoningText,
}: {
  messages: TranscriptMessage[];
  /** Shown as a callout near the trigger message, per case_detail_hand_off_review's "Bot's Reasoning" note. */
  botReasoningText?: string;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 96,
    overscan: 8,
  });

  return (
    <div ref={parentRef} className="h-full overflow-y-auto bg-background/50 px-4 py-4">
      <div
        style={{
          height: virtualizer.getTotalSize(),
          position: 'relative',
          width: '100%',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const msg = messages[virtualRow.index];
          const isBot = msg.sender === 'bot';
          const isTrigger = msg.is_trigger_message;
          return (
            <div
              key={msg.id}
              ref={virtualizer.measureElement}
              data-index={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className={isTrigger ? 'pb-14' : 'pb-4'}
            >
              <div className={`flex max-w-[85%] gap-2 ${isBot ? '' : 'ml-auto flex-row-reverse'}`}>
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    isBot
                      ? 'border border-outline-variant bg-surface-container-highest'
                      : 'bg-primary'
                  }`}
                >
                  {isBot ? (
                    <span className="material-symbols-outlined text-[16px] text-on-surface">
                      smart_toy
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-on-primary">P</span>
                  )}
                </div>
                <div className={`flex min-w-0 flex-col gap-1 ${isBot ? '' : 'items-end'}`}>
                  <span
                    className={`flex items-center gap-1 px-1 text-[11px] font-medium ${
                      isTrigger ? 'text-error' : 'text-on-surface-variant'
                    }`}
                  >
                    {isTrigger && <span className="material-symbols-outlined text-[12px]">warning</span>}
                    {isBot ? 'Bot' : 'Player'} · {new Date(msg.sent_at).toLocaleTimeString('en-IN')}
                  </span>
                  <div className="relative">
                    <div
                      className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                        isTrigger
                          ? 'border-2 border-error bg-error-container text-on-error-container'
                          : isBot
                            ? 'rounded-tl-none border border-surface-variant bg-surface-container-low text-on-surface'
                            : 'rounded-tr-none bg-surface-container text-on-surface'
                      }`}
                    >
                      {msg.message_text}
                    </div>
                    {isTrigger && botReasoningText && (
                      <div className="absolute right-0 top-full z-10 mt-2 flex w-72 max-w-[80vw] gap-2 rounded-lg border border-outline-variant bg-surface-container-highest p-2.5 shadow-md">
                        <span className="material-symbols-outlined mt-0.5 text-[16px] text-error">
                          psychology
                        </span>
                        <p className="text-[11px] leading-tight text-on-surface">
                          <span className="mb-0.5 block font-bold text-on-surface-variant">
                            Bot's Reasoning:
                          </span>
                          {botReasoningText}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
