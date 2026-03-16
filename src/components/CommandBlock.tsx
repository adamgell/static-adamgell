import { useState } from "react";

interface Props {
  label: string;
  command: string | null | undefined;
}

export default function CommandBlock({ label, command }: Props) {
  const [copied, setCopied] = useState(false);

  if (!command) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(command!);
    } catch {
      const el = document.createElement("textarea");
      el.value = command!;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mb-2">
      {label && (
        <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
          {label}
        </span>
      )}
      <div className="flex items-center gap-2 bg-slate-900 rounded-md px-3 py-2 border border-slate-800">
        <code className="flex-1 font-mono text-sm text-slate-200 break-all">
          {command}
        </code>
        <button
          onClick={handleCopy}
          title="Copy to clipboard"
          className={`shrink-0 text-xs px-2 py-1 rounded transition-colors ${
            copied
              ? "text-green-400 bg-green-900/30"
              : "text-slate-400 hover:text-white hover:bg-slate-700"
          }`}
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
