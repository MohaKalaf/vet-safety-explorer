import type { ReportSummary } from "@/lib/openfda/types";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(isoDate: string | null): string {
  return isoDate ? dateFormat.format(new Date(`${isoDate}T00:00:00Z`)) : "Unknown";
}

export function ReportTable({ reports }: { reports: ReportSummary[] }) {
  if (reports.length === 0) {
    return <p className="text-sm text-slate">No individual reports to show.</p>;
  }

  return (
    <>
      {/* 5 columns don't fit on phones */}
      <ul className="divide-y divide-rule border-y border-rule text-sm sm:hidden">
        {reports.map((report) => (
          <li key={report.id} className="py-3">
            <div className="flex items-baseline justify-between gap-3">
              <span>
                {report.species}, {report.breed}
              </span>
              <SeverityBadge serious={report.serious} />
            </div>
            <p className="mt-1">{reactionText(report)}</p>
            <p className="mt-1 text-slate">
              {formatDate(report.receivedDate)}. Outcome: {report.outcome}
            </p>
          </li>
        ))}
      </ul>

      <table className="hidden w-full text-left text-sm sm:table">
        <thead className="text-slate">
          <tr className="border-b border-rule">
            <th scope="col" className="py-2 pr-4 font-normal">Received</th>
            <th scope="col" className="py-2 pr-4 font-normal">Animal</th>
            <th scope="col" className="py-2 pr-4 font-normal">Reactions</th>
            <th scope="col" className="py-2 pr-4 font-normal">Outcome</th>
            <th scope="col" className="py-2 font-normal">Severity</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id} className="border-b border-rule align-top">
              <td className="py-3 pr-4 whitespace-nowrap">{formatDate(report.receivedDate)}</td>
              <td className="py-3 pr-4">
                {report.species}
                <span className="block text-slate">{report.breed}</span>
              </td>
              <td className="py-3 pr-4">{reactionText(report)}</td>
              <td className="py-3 pr-4">{report.outcome}</td>
              <td className="py-3">
                <SeverityBadge serious={report.serious} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function reactionText(report: ReportSummary) {
  const extra = report.reactions.length - 4;
  return (
    <>
      {report.reactions.slice(0, 4).join(", ") || "None listed"}
      {extra > 0 ? <span className="text-slate"> and {extra} more</span> : null}
    </>
  );
}

function SeverityBadge({ serious }: { serious: boolean }) {
  return serious ? (
    <span className="shrink-0 rounded bg-signal-soft px-1.5 py-0.5 text-signal">Serious</span>
  ) : (
    <span className="shrink-0 text-slate">Not serious</span>
  );
}
