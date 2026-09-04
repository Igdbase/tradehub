import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintReportButton } from "@/components/reports/print-report-button";
import { resolveReportByToken } from "@/lib/reports/report-sharing-data";

type ParentReportPageProps = {
  params: {
    token: string;
  };
};

export const metadata: Metadata = {
  title: "Student Report | TradeHub",
  description: "Parent-facing released student report."
};

export default function ParentReportPage({ params }: ParentReportPageProps) {
  const report = resolveReportByToken(params.token);

  if (!report) {
    notFound();
  }

  return (
    <div className="report-print-page mx-auto w-full max-w-5xl space-y-6">
      <nav className="report-page-nav flex flex-wrap items-center justify-between gap-3">
        <a className="text-sm font-semibold text-[color:var(--label2)]" href="/reports">
          Back to reports
        </a>
        <div className="report-actions">
          <PrintReportButton />
        </div>
      </nav>

      <article className="report-card rounded-[24px] border border-[color:var(--line)] bg-[color:var(--glass-hi)] p-5 shadow-[0_18px_54px_-40px_rgba(0,0,0,0.65)] sm:p-8">
        <header className="grid gap-5 border-b border-[color:var(--line)] pb-6 md:grid-cols-[1fr_auto] md:items-start">
          <div>
            <p className="eyebrow">Released report</p>
            <h1 className="mt-3 text-3xl font-semibold text-[color:var(--label)]">
              TradeHub Academy
            </h1>
            <p className="mt-2 text-sm text-[color:var(--label2)]">
              Parent report for {report.term}, {report.session}
            </p>
          </div>
          <div className="rounded-[18px] border border-[color:var(--line)] bg-[color:var(--glass)] p-4 text-sm">
            <p className="font-semibold text-[color:var(--label)]">{report.studentName}</p>
            <p className="mt-1 text-[color:var(--label2)]">{report.admissionNumber}</p>
            <p className="mt-1 text-[color:var(--label2)]">{report.className}</p>
          </div>
        </header>

        <section className="report-summary-grid mt-6 grid gap-3 sm:grid-cols-4">
          {[
            ["Average", `${report.average}%`],
            ["Position", report.position],
            ["Term", report.term],
            ["Session", report.session]
          ].map(([label, value]) => (
            <div key={label} className="rounded-[18px] border border-[color:var(--line)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                {label}
              </p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--label)]">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-7">
          <h2 className="text-lg font-semibold text-[color:var(--label)]">Subject results</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="report-results-table w-full min-w-[42rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[color:var(--line)] text-xs uppercase tracking-[0.12em] text-[color:var(--label3)]">
                  <th className="py-3 pr-3">Subject</th>
                  <th className="px-3 py-3">CA</th>
                  <th className="px-3 py-3">Exam</th>
                  <th className="px-3 py-3">Total</th>
                  <th className="px-3 py-3">Grade</th>
                  <th className="py-3 pl-3">Remark</th>
                </tr>
              </thead>
              <tbody>
                {report.subjects.map((subject) => (
                  <tr key={subject.subject} className="border-b border-[color:var(--line)]">
                    <td className="py-3 pr-3 font-semibold text-[color:var(--label)]">{subject.subject}</td>
                    <td className="px-3 py-3 text-[color:var(--label2)]">{subject.ca}</td>
                    <td className="px-3 py-3 text-[color:var(--label2)]">{subject.exam}</td>
                    <td className="px-3 py-3 font-semibold text-[color:var(--label)]">{subject.total}</td>
                    <td className="px-3 py-3 text-[color:var(--label2)]">{subject.grade}</td>
                    <td className="py-3 pl-3 text-[color:var(--label2)]">{subject.remark}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="report-comments mt-7 grid gap-4 md:grid-cols-2">
          <div className="rounded-[18px] border border-[color:var(--line)] p-4">
            <p className="text-sm font-semibold text-[color:var(--label)]">Class teacher comment</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">{report.teacherComment}</p>
          </div>
          <div className="rounded-[18px] border border-[color:var(--line)] p-4">
            <p className="text-sm font-semibold text-[color:var(--label)]">Principal comment</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">{report.principalComment}</p>
          </div>
        </section>
      </article>
    </div>
  );
}
