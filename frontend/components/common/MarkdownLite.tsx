"use client";

import { Fragment, type ReactNode } from "react";

type MarkdownLiteProps = {
  content: string;
  className?: string;
  density?: "default" | "compact";
};

type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "list"; items: string[] }
  | { type: "paragraph"; text: string };

export function MarkdownLite({
  content,
  className,
  density = "default",
}: MarkdownLiteProps) {
  const blocks = parseMarkdown(content);
  const compact = density === "compact";

  return (
    <div className={className}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const headingClass = compact
            ? block.level === 1
              ? "text-[13px] font-semibold leading-5 text-[color:var(--cs-heading)]"
              : block.level === 2
                ? "text-[12px] font-semibold leading-5 text-[color:var(--cs-heading)]"
                : "text-[12px] font-semibold leading-5 text-[color:var(--cs-heading)]"
            : block.level === 1
              ? "text-[1.15rem] font-semibold leading-8 text-[color:var(--cs-heading)]"
              : block.level === 2
                ? "text-[1.05rem] font-semibold leading-7 text-[color:var(--cs-heading)]"
                : "text-[0.98rem] font-semibold leading-6 text-[color:var(--cs-heading)]";

          const Tag = block.level === 1 ? "h3" : block.level === 2 ? "h4" : "h5";
          return (
            <Tag key={`heading-${index}`} className={headingClass}>
              {renderInline(block.text)}
            </Tag>
          );
        }

        if (block.type === "list") {
          return (
            <ul
              key={`list-${index}`}
              className={[
                "space-y-1 pl-4 text-[color:var(--cs-text)]",
                compact ? "text-[11px] leading-5" : "text-[15px] leading-7",
              ].join(" ")}
            >
              {block.items.map((item, itemIndex) => (
                <li key={`item-${itemIndex}`} className="list-disc">
                  {renderInline(item)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p
            key={`paragraph-${index}`}
            className={[
              "text-[color:var(--cs-text)]",
              compact ? "text-[11px] leading-5" : "text-[15px] leading-7",
            ].join(" ")}
          >
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}

function parseMarkdown(content: string): Block[] {
  const normalized = normalizeAgentMarkdown(content);
  if (!normalized) return [];

  const lines = normalized.split("\n");
  const blocks: Block[] = [];
  let listItems: string[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    blocks.push({
      type: "paragraph",
      text: paragraphLines.join("\n"),
    });
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    blocks.push({ type: "list", items: [...listItems] });
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      flushParagraph();
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      flushParagraph();
      blocks.push({
        type: "heading",
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2],
      });
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      listItems.push(line.replace(/^[-*]\s+/, ""));
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushList();
  flushParagraph();
  return blocks;
}

function normalizeAgentMarkdown(content: string) {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/([^\n])\s+(#{1,3}\s+)/g, "$1\n$2")
    .replace(/(#{1,3}\s+[^\n]+)\s+(-\s+)/g, "$1\n$2")
    .replace(/([.!?])\s+(-\s+)/g, "$1\n$2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\n)/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part === "\n") {
      return <br key={`br-${index}`} />;
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong
          key={`strong-${index}`}
          className="font-semibold text-[color:var(--cs-heading)]"
        >
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={`code-${index}`}
          className="rounded bg-[color:rgba(13,71,161,0.08)] px-1 py-0.5 text-[0.92em] text-[color:var(--cs-primary)]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return <Fragment key={`text-${index}`}>{part}</Fragment>;
  });
}
