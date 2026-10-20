import type { TermCount } from "@/lib/openfda/types";

const numberFormat = new Intl.NumberFormat("en-GB");

export function ReactionBars({ reactions }: { reactions: TermCount[] }) {
  if (reactions.length === 0) {
    return <p className="text-sm text-slate">No reactions were recorded for this search.</p>;
  }

  const max = Math.max(...reactions.map((r) => r.count));
  const mentionsNos = reactions.some((r) => /\bNOS\b/.test(r.term));

  return (
    <>
      <ol className="space-y-2.5">
        {reactions.map((reaction) => (
          <li key={reaction.term}>
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="truncate">{reaction.term}</span>
              <span className="shrink-0 text-slate">{numberFormat.format(reaction.count)}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-bar-soft" aria-hidden="true">
              <div
                className="h-2 rounded-full bg-bar"
                style={{ width: `${Math.max(2, (reaction.count / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
      {mentionsNos ? (
        <p className="mt-3 text-xs text-slate">NOS means &ldquo;not otherwise specified&rdquo;.</p>
      ) : null}
    </>
  );
}
