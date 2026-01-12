"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
        // Headings
        h1: ({ children }) => (
          <h1 className="text-lg font-bold text-slate-900 dark:text-white mt-4 mb-2 first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-bold text-slate-900 dark:text-white mt-3 mb-2 first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-3 mb-1 first:mt-0">
            {children}
          </h3>
        ),
        // Paragraphs
        p: ({ children }) => (
          <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>
        ),
        // Lists
        ul: ({ children }) => (
          <ul className="list-none space-y-1.5 my-2 pl-0">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-none space-y-1.5 my-2 pl-0 counter-reset-item">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="flex items-start gap-2 text-sm">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            </span>
            <span className="flex-1">{children}</span>
          </li>
        ),
        // Code blocks
        code: ({ className, children, ...props }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-primary dark:text-blue-300 text-xs font-mono">
                {children}
              </code>
            );
          }
          return (
            <code
              className={`block p-3 rounded-lg bg-slate-900 dark:bg-slate-950 text-slate-100 text-xs font-mono overflow-x-auto my-2 ${className}`}
              {...props}
            >
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="my-2 rounded-lg overflow-hidden">{children}</pre>
        ),
        // Blockquotes
        blockquote: ({ children }) => (
          <blockquote className="border-l-3 border-primary bg-primary/5 dark:bg-primary/10 pl-3 pr-2 py-2 my-2 rounded-r-lg text-sm italic">
            {children}
          </blockquote>
        ),
        // Links
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 underline underline-offset-2"
          >
            {children}
          </a>
        ),
        // Strong/Bold
        strong: ({ children }) => (
          <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>
        ),
        // Emphasis/Italic
        em: ({ children }) => (
          <em className="italic text-slate-700 dark:text-slate-300">{children}</em>
        ),
        // Tables
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="min-w-full text-xs border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-slate-100 dark:bg-slate-700">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-600">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">{children}</td>
        ),
        // Horizontal rule
        hr: () => <hr className="my-3 border-slate-200 dark:border-slate-700" />,
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  );
}
