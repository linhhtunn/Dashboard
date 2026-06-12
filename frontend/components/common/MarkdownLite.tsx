"use client";

import { Fragment, type ReactNode } from "react";

type MarkdownLiteProps = {
  content: string;
  className?: string;
};

type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "list"; items: string[] }
  | { type: "paragraph"; text: string };

export function MarkdownLite({ content, className }: MarkdownLiteProps) {
  const blocks = parseMarkdown(content);

  return (
    <div className={className}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const headingClass =
            block.level === 1
              ? "text-[1.15rem] font-semibold leading-8 text-[color:var(--cs-heading)]"
              : block.level === 2
                ? "text-[1.05rem] font-semibold leading-8 text-[color:var(--cs-heading)]"
                : "text-[0.98rem] font-semibold leading-7 text-[color:var(--cs-heading)]";

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
              className="space-y-2 pl-5 text-[16px] leading-7 text-[color:var(--cs-text)]"
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
            className="text-[16px] leading-7 text-[color:var(--cs-text)]"
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

  const chunks = normalized.split(/\n{2,}/);
  const blocks: Block[] = [];

  for (const chunk of chunks) {
    const lines = chunk
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) continue;

    if (lines.every((line) => /^[-*]\s+/.test(line))) {
      blocks.push({
        type: "list",
        items: lines.map((line) => line.replace(/^[-*]\s+/, "")),
      });
      continue;
    }

    const headingMatch = lines[0]?.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2],
      });

      const remaining = lines.slice(1);
      if (remaining.length > 0) {
        if (remaining.every((line) => /^[-*]\s+/.test(line))) {
          blocks.push({
            type: "list",
            items: remaining.map((line) => line.replace(/^[-*]\s+/, "")),
          });
        } else {
          blocks.push({
            type: "paragraph",
            text: remaining.join("\n"),
          });
        }
      }
      continue;
    }

    blocks.push({
      type: "paragraph",
      text: lines.join("\n"),
    });
  }

  return blocks;
}

function normalizeAgentMarkdown(content: string) {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/\s+(#{1,3}\s+)/g, "\n\n$1")
    .replace(/([.!?])\s+(#{1,3}\s+)/g, "$1\n\n$2")
    .replace(/\s+(-\s+\*\*)/g, "\n$1")
    .replace(/\s+(-\s+)/g, "\n$1")
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
          className="rounded bg-[color:rgba(13,71,161,0.08)] px-1.5 py-0.5 text-[0.92em] text-[color:var(--cs-primary)]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return <Fragment key={`text-${index}`}>{part}</Fragment>;
  });
}
