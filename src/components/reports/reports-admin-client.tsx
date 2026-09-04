"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import {
  absoluteReportShareUrl,
  createLocalShareToken,
  hasValidGuardianEmail,
  normalizedWhatsAppNumber,
  reportClasses,
  reportTerms,
  sampleReports,
  type StudentReport
} from "@/lib/reports/report-sharing-data";

type LinkState = {
  token: string;
  createdThisSession: boolean;
};

function initialLinks() {
  return Object.fromEntries(
    sampleReports
      .filter((report) => report.status === "released" && report.shareToken)
      .map((report) => [
        report.reportId,
        {
          token: report.shareToken as string,
          createdThisSession: false
        }
      ])
  ) as Record<string, LinkState>;
}

function csvEscape(value: string | number) {
  const text = String(value);

  return /[",\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function reportLinkLine(report: StudentReport, token: string) {
  return `${report.studentName} (${report.admissionNumber}) - ${absoluteReportShareUrl(token)}`;
}

export function ReportsAdminClient() {
  const [selectedClass, setSelectedClass] = useState(reportClasses[0]);
  const [selectedTerm, setSelectedTerm] = useState(reportTerms[0]);
  const [query, setQuery] = useState("");
  const [linksByReportId, setLinksByReportId] = useState<Record<string, LinkState>>(initialLinks);
  const [notice, setNotice] = useState<string | null>(null);

  const scopedReports = useMemo(
    () =>
      sampleReports.filter(
        (report) => report.className === selectedClass && report.term === selectedTerm
      ),
    [selectedClass, selectedTerm]
  );

  const filteredReports = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return scopedReports;
    }

    return scopedReports.filter((report) =>
      `${report.studentName} ${report.admissionNumber}`.toLowerCase().includes(normalized)
    );
  }, [query, scopedReports]);

  const releasedReports = scopedReports.filter((report) => report.status === "released");
  const reportsMissingLinks = releasedReports.filter((report) => !linksByReportId[report.reportId]);
  const linkedReports = scopedReports.filter((report) => linksByReportId[report.reportId]);
  const linksCreatedThisSession = Object.entries(linksByReportId).filter(([reportId, link]) =>
    link.createdThisSession && scopedReports.some((report) => report.reportId === reportId)
  ).length;
  const missingGuardianEmailCount = scopedReports.filter((report) => !hasValidGuardianEmail(report)).length;
  const missingOrInvalidWhatsAppCount = scopedReports.filter((report) => !normalizedWhatsAppNumber(report)).length;

  function createLink(report: StudentReport) {
    if (report.status !== "released" || linksByReportId[report.reportId]) {
      return;
    }

    setLinksByReportId((current) => ({
      ...current,
      [report.reportId]: {
        token: createLocalShareToken(report.reportId),
        createdThisSession: true
      }
    }));
    setNotice(`Created parent link for ${report.studentName}.`);
  }

  function createMissingLinks() {
    if (reportsMissingLinks.length === 0) {
      return;
    }

    setLinksByReportId((current) => {
      const next = { ...current };

      for (const report of reportsMissingLinks) {
        if (!next[report.reportId]) {
          next[report.reportId] = {
            token: createLocalShareToken(report.reportId),
            createdThisSession: true
          };
        }
      }

      return next;
    });
    setNotice(`Created ${reportsMissingLinks.length} missing parent link${reportsMissingLinks.length === 1 ? "" : "s"}.`);
  }

  async function copyLink(report: StudentReport) {
    const link = linksByReportId[report.reportId];

    if (!link) {
      return;
    }

    await navigator.clipboard.writeText(absoluteReportShareUrl(link.token));
    setNotice(`Copied ${report.studentName}'s report link.`);
  }

  async function copyAllLinks() {
    if (linkedReports.length === 0) {
      return;
    }

    await navigator.clipboard.writeText(
      linkedReports
        .map((report) => reportLinkLine(report, linksByReportId[report.reportId].token))
        .join("\n")
    );
    setNotice(`Copied ${linkedReports.length} report link${linkedReports.length === 1 ? "" : "s"}.`);
  }

  function exportLinksCsv() {
    if (linkedReports.length === 0) {
      return;
    }

    const rows = [
      ["Student name", "Admission number", "Class", "Term", "Guardian email", "WhatsApp", "Report link"],
      ...linkedReports.map((report) => [
        report.studentName,
        report.admissionNumber,
        report.className,
        report.term,
        report.guardianEmail ?? "",
        report.guardianWhatsApp ?? "",
        absoluteReportShareUrl(linksByReportId[report.reportId].token)
      ])
    ];
    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selectedClass}-${selectedTerm}-report-links.csv`.replace(/[^a-z0-9.-]+/gi, "-");
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Exported report links CSV.");
  }

  return (
    <div className="space-y-6">
      <section className="hero-panel px-6 py-7 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Report sharing</p>
            <h1 className="mt-3 text-3xl font-semibold text-[color:var(--label)] sm:text-4xl">
              Parent report links
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--label2)]">
              Create and resend parent links only after reports have been released.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[30rem]">
            <label className="grid gap-2 text-sm font-semibold text-[color:var(--label)]">
              Class
              <select
                className="h-11 rounded-[14px] border border-[color:var(--line)] bg-[color:var(--glass-hi)] px-3 text-sm text-[color:var(--label)]"
                value={selectedClass}
                onChange={(event) => setSelectedClass(event.target.value)}
              >
                {reportClasses.map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[color:var(--label)]">
              Term
              <select
                className="h-11 rounded-[14px] border border-[color:var(--line)] bg-[color:var(--glass-hi)] px-3 text-sm text-[color:var(--label)]"
                value={selectedTerm}
                onChange={(event) => setSelectedTerm(event.target.value)}
              >
                {reportTerms.map((term) => (
                  <option key={term} value={term}>
                    {term}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
        <GlassCard padding="sm">
          <p className="eyebrow !text-[color:var(--label3)]">Released reports</p>
          <p className="mt-2 text-2xl font-semibold text-[color:var(--green)]">{releasedReports.length}</p>
        </GlassCard>
        <GlassCard padding="sm">
          <p className="eyebrow !text-[color:var(--label3)]">Links this session</p>
          <p className="mt-2 text-2xl font-semibold text-[color:var(--accent)]">{linksCreatedThisSession}</p>
        </GlassCard>
        <GlassCard padding="sm">
          <p className="eyebrow !text-[color:var(--label3)]">Missing emails</p>
          <p className="mt-2 text-2xl font-semibold text-[color:var(--amber)]">{missingGuardianEmailCount}</p>
        </GlassCard>
        <GlassCard padding="sm">
          <p className="eyebrow !text-[color:var(--label3)]">Bad WhatsApp</p>
          <p className="mt-2 text-2xl font-semibold text-[color:var(--amber)]">{missingOrInvalidWhatsAppCount}</p>
        </GlassCard>
      </section>

      <GlassCard className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="grid gap-2 text-sm font-semibold text-[color:var(--label)]">
            Search student or admission number
            <input
              className="h-11 rounded-[14px] border border-[color:var(--line)] bg-[color:var(--glass-hi)] px-3 text-sm text-[color:var(--label)]"
              placeholder="Amina or THA/2026/001"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="primary"
              disabled={releasedReports.length === 0 || reportsMissingLinks.length === 0}
              className="disabled:cursor-not-allowed disabled:opacity-45"
              onClick={createMissingLinks}
            >
              Create missing links
            </Button>
            <Button
              type="button"
              disabled={linkedReports.length === 0}
              className="disabled:cursor-not-allowed disabled:opacity-45"
              onClick={copyAllLinks}
            >
              Copy all links
            </Button>
            <Button
              type="button"
              disabled={linkedReports.length === 0}
              className="disabled:cursor-not-allowed disabled:opacity-45"
              onClick={exportLinksCsv}
            >
              Export links CSV
            </Button>
          </div>
        </div>

        {notice ? (
          <p className="rounded-[16px] border border-[color:color-mix(in_srgb,var(--green)_34%,transparent)] bg-[color:var(--green-bg)] px-4 py-3 text-sm font-semibold text-[color:var(--green)]">
            {notice}
          </p>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[68rem] border-separate border-spacing-y-2 text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-[color:var(--label3)]">
              <tr>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Guardian</th>
                <th className="px-3 py-2">Link</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => {
                const link = linksByReportId[report.reportId];
                const url = link ? absoluteReportShareUrl(link.token) : "";
                const whatsappNumber = normalizedWhatsAppNumber(report);
                const message = encodeURIComponent(
                  `Hello ${report.guardianName}, ${report.studentName}'s ${report.term} report is ready: ${url}`
                );

                return (
                  <tr key={report.reportId} className="align-top">
                    <td className="rounded-l-[18px] border-y border-l border-[color:var(--line)] bg-[color:var(--glass-hi)] px-3 py-4">
                      <p className="font-semibold text-[color:var(--label)]">{report.studentName}</p>
                      <p className="mt-1 text-xs text-[color:var(--label3)]">{report.admissionNumber}</p>
                    </td>
                    <td className="border-y border-[color:var(--line)] bg-[color:var(--glass-hi)] px-3 py-4">
                      <span className="inline-flex rounded-full border border-[color:var(--line)] px-3 py-1 text-xs font-semibold capitalize text-[color:var(--label2)]">
                        {report.status}
                      </span>
                    </td>
                    <td className="border-y border-[color:var(--line)] bg-[color:var(--glass-hi)] px-3 py-4">
                      <p className="font-semibold text-[color:var(--label)]">{report.guardianName}</p>
                      <p className="mt-1 text-xs text-[color:var(--label3)]">
                        {hasValidGuardianEmail(report) ? report.guardianEmail : "No valid email"}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--label3)]">
                        {whatsappNumber ? `+${whatsappNumber}` : "No valid WhatsApp"}
                      </p>
                    </td>
                    <td className="max-w-[18rem] border-y border-[color:var(--line)] bg-[color:var(--glass-hi)] px-3 py-4">
                      {link ? (
                        <p className="break-all text-xs text-[color:var(--label2)]">{url}</p>
                      ) : (
                        <p className="text-xs text-[color:var(--label3)]">
                          {report.status === "released" ? "No parent link yet" : "Release required before sharing"}
                        </p>
                      )}
                    </td>
                    <td className="rounded-r-[18px] border-y border-r border-[color:var(--line)] bg-[color:var(--glass-hi)] px-3 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={report.status !== "released" || Boolean(link)}
                          className="disabled:cursor-not-allowed disabled:opacity-45"
                          onClick={() => createLink(report)}
                        >
                          Create link
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={!link}
                          className="disabled:cursor-not-allowed disabled:opacity-45"
                          onClick={() => copyLink(report)}
                        >
                          Copy
                        </Button>
                        <Button
                          size="sm"
                          href={link && hasValidGuardianEmail(report) ? `mailto:${report.guardianEmail}?subject=${encodeURIComponent(`${report.studentName}'s report`)}&body=${encodeURIComponent(`Hello ${report.guardianName},\n\n${report.studentName}'s report is ready:\n${url}`)}` : "#"}
                          className={!link || !hasValidGuardianEmail(report) ? "pointer-events-none opacity-45" : undefined}
                        >
                          Email
                        </Button>
                        <Button
                          size="sm"
                          href={link && whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${message}` : "#"}
                          target={link && whatsappNumber ? "_blank" : undefined}
                          rel="noreferrer"
                          className={!link || !whatsappNumber ? "pointer-events-none opacity-45" : undefined}
                        >
                          WhatsApp
                        </Button>
                        <Button
                          size="sm"
                          href={link ? `/r/${encodeURIComponent(link.token)}` : "#"}
                          target={link ? "_blank" : undefined}
                          rel="noreferrer"
                          className={!link ? "pointer-events-none opacity-45" : undefined}
                        >
                          Open
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredReports.length === 0 ? (
          <p className="rounded-[16px] border border-[color:var(--line)] px-4 py-5 text-sm text-[color:var(--label2)]">
            No reports match that search in the selected class and term.
          </p>
        ) : null}
      </GlassCard>
    </div>
  );
}
