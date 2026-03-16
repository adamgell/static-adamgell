import { useState } from "react";
import CommandBlock from "./CommandBlock";

interface AppVariant {
  architecture?: string;
  installerType?: string;
  silentInstall?: string;
  silentUninstall?: string;
  repair?: string;
  logInstall?: string;
  logUninstall?: string;
  downloadUrl?: string;
  psScriptUrl?: string;
  detectionScriptUrl?: string;
}

interface AppRecord {
  slug: string;
  title: string;
  vendor?: string;
  sourceUrl: string;
  lastScraped: string;
  variants: AppVariant[];
  psadtScript?: string | null;
}

interface Props {
  app: AppRecord;
}

export default function AppCard({ app }: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [showScript, setShowScript] = useState(false);

  const variant = app.variants[selectedIdx];
  if (!variant) return null;

  const hasMultiple = app.variants.length > 1;

  return (
    <article className="border border-slate-800 rounded-lg bg-slate-950/50 overflow-hidden hover:border-slate-700 transition-colors">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2 px-4 pt-4 pb-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-100 leading-tight">
            {app.title}
          </h2>
          {app.vendor && (
            <span className="text-xs text-slate-500">{app.vendor}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {app.psadtScript && (
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-purple-900/50 text-purple-300 border border-purple-800">
              PSADT
            </span>
          )}
          {hasMultiple && (
            <div className="flex gap-1">
              {app.variants.map((v, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedIdx(i)}
                  className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                    i === selectedIdx
                      ? "bg-slate-700 border-slate-600 text-white"
                      : "border-slate-800 text-slate-400 hover:border-slate-600 hover:text-white"
                  }`}
                >
                  {v.architecture || `Variant ${i + 1}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Commands */}
      <div className="px-4 pb-3">
        <CommandBlock label="Silent Install" command={variant.silentInstall} />
        <CommandBlock label="Silent Uninstall" command={variant.silentUninstall} />
        {variant.repair && (
          <CommandBlock label="Repair" command={variant.repair} />
        )}
      </div>

      {/* Expandable section */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-800 pt-3 space-y-3">
          {variant.logInstall && (
            <CommandBlock label="Install with Logging" command={variant.logInstall} />
          )}
          {variant.logUninstall && (
            <CommandBlock label="Uninstall with Logging" command={variant.logUninstall} />
          )}

          {app.psadtScript && (
            <div>
              <button
                onClick={() => setShowScript((s) => !s)}
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                {showScript ? "▲ Hide" : "▼ Show"} PSADT Deploy-Application.ps1
              </button>
              {showScript && (
                <div className="relative mt-2">
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(app.psadtScript!)
                    }
                    className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 hover:text-white hover:bg-slate-600 transition-colors z-10"
                  >
                    Copy Script
                  </button>
                  <pre className="bg-slate-900 border border-slate-800 rounded-md p-3 text-xs text-slate-300 font-mono overflow-x-auto max-h-80 overflow-y-auto">
                    {app.psadtScript}
                  </pre>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3 text-sm">
            {variant.downloadUrl && (
              <a
                href={variant.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white transition-colors"
              >
                ↗ Download
              </a>
            )}
            {variant.psScriptUrl && (
              <a
                href={variant.psScriptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white transition-colors"
              >
                📜 PS Script
              </a>
            )}
            {variant.detectionScriptUrl && (
              <a
                href={variant.detectionScriptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white transition-colors"
              >
                🔍 Detection Script
              </a>
            )}
            <a
              href={app.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white transition-colors"
            >
              📖 Source Article
            </a>
          </div>

          <p className="text-xs text-slate-600">
            Last updated:{" "}
            {new Date(app.lastScraped).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Toggle */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-xs text-slate-500 hover:text-slate-300 py-2 border-t border-slate-800 transition-colors"
      >
        {expanded
          ? "▲ Less"
          : `▼ More${app.psadtScript ? " · PSADT Script" : ""}${variant.downloadUrl ? " · Links" : ""}`}
      </button>
    </article>
  );
}
