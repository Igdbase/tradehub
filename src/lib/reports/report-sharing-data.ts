export type ReportStatus = "draft" | "approved" | "released";

export type SubjectResult = {
  subject: string;
  ca: number;
  exam: number;
  total: number;
  grade: string;
  remark: string;
};

export type StudentReport = {
  reportId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  term: string;
  session: string;
  status: ReportStatus;
  guardianName: string;
  guardianEmail?: string;
  guardianWhatsApp?: string;
  average: number;
  position: string;
  teacherComment: string;
  principalComment: string;
  shareToken?: string;
  subjects: SubjectResult[];
};

export const demoRouteCheckToken = "demo-token-for-route-check-12345678901234567890";

const subjects: SubjectResult[] = [
  { subject: "Mathematics", ca: 28, exam: 58, total: 86, grade: "A", remark: "Excellent" },
  { subject: "English Language", ca: 25, exam: 54, total: 79, grade: "B", remark: "Very good" },
  { subject: "Basic Science", ca: 27, exam: 56, total: 83, grade: "A", remark: "Excellent" },
  { subject: "Business Studies", ca: 24, exam: 50, total: 74, grade: "B", remark: "Good" },
  { subject: "Computer Studies", ca: 29, exam: 60, total: 89, grade: "A", remark: "Excellent" }
];

export const reportClasses = ["JSS 1 Gold", "JSS 2 Silver", "SS 1 Science"];
export const reportTerms = ["First Term", "Second Term", "Third Term"];

export const sampleReports: StudentReport[] = [
  {
    reportId: "rep-adamu-001",
    studentName: "Amina Adamu",
    admissionNumber: "THA/2026/001",
    className: "JSS 1 Gold",
    term: "First Term",
    session: "2026/2027",
    status: "released",
    guardianName: "Mrs. Adamu",
    guardianEmail: "parent.adamu@example.test",
    guardianWhatsApp: "+2348011112222",
    average: 82.2,
    position: "2nd",
    teacherComment: "Amina is attentive and consistent. Keep encouraging her reading routine.",
    principalComment: "Excellent progress this term.",
    shareToken: demoRouteCheckToken,
    subjects
  },
  {
    reportId: "rep-bello-002",
    studentName: "Tunde Bello",
    admissionNumber: "THA/2026/002",
    className: "JSS 1 Gold",
    term: "First Term",
    session: "2026/2027",
    status: "released",
    guardianName: "Mr. Bello",
    guardianWhatsApp: "080BADNUMBER",
    average: 76.4,
    position: "5th",
    teacherComment: "Tunde has improved in class participation and should revise daily.",
    principalComment: "A good result with room for stronger consistency.",
    subjects: subjects.map((subject, index) => ({
      ...subject,
      total: subject.total - (index % 2 === 0 ? 7 : 3),
      exam: subject.exam - (index % 2 === 0 ? 7 : 3),
      grade: subject.total > 80 ? "B" : "C",
      remark: "Good"
    }))
  },
  {
    reportId: "rep-chukwu-003",
    studentName: "Ifeoma Chukwu",
    admissionNumber: "THA/2026/003",
    className: "JSS 1 Gold",
    term: "First Term",
    session: "2026/2027",
    status: "approved",
    guardianName: "Mrs. Chukwu",
    guardianEmail: "ifeoma.guardian@example.test",
    guardianWhatsApp: "+2348022223333",
    average: 80.8,
    position: "3rd",
    teacherComment: "Ifeoma is ready for release after owner approval.",
    principalComment: "Approved report awaiting release.",
    subjects
  },
  {
    reportId: "rep-danjuma-004",
    studentName: "Musa Danjuma",
    admissionNumber: "THA/2026/004",
    className: "JSS 2 Silver",
    term: "First Term",
    session: "2026/2027",
    status: "released",
    guardianName: "Mr. Danjuma",
    guardianEmail: "musa.parent@example.test",
    guardianWhatsApp: "+2348033334444",
    average: 71.6,
    position: "8th",
    teacherComment: "Musa should focus on written assignments and revision.",
    principalComment: "Good effort. More discipline will improve the next result.",
    subjects: subjects.map((subject, index) => ({
      ...subject,
      total: subject.total - 10 - index,
      exam: subject.exam - 10 - index,
      grade: index < 2 ? "B" : "C",
      remark: index < 2 ? "Good" : "Fair"
    }))
  },
  {
    reportId: "rep-ekong-005",
    studentName: "Iniobong Ekong",
    admissionNumber: "THA/2026/005",
    className: "JSS 2 Silver",
    term: "Second Term",
    session: "2026/2027",
    status: "released",
    guardianName: "Mrs. Ekong",
    guardianEmail: "ini.guardian@example.test",
    average: 84.6,
    position: "1st",
    teacherComment: "Iniobong is disciplined and performs strongly across subjects.",
    principalComment: "Outstanding performance.",
    subjects
  }
];

export function reportShareUrl(token: string) {
  return `/r/${encodeURIComponent(token)}`;
}

export function absoluteReportShareUrl(token: string) {
  return `http://localhost:3000${reportShareUrl(token)}`;
}

export function createLocalShareToken(reportId: string) {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replace(/-/g, "").slice(0, 20)
    : `${Date.now()}${Math.random().toString(16).slice(2)}`.slice(0, 20);

  return `local_${reportId}_${suffix}`;
}

export function resolveReportByToken(token: string) {
  const decoded = decodeURIComponent(token);
  const existing = sampleReports.find((report) =>
    report.status === "released" && report.shareToken === decoded
  );

  if (existing) {
    return existing;
  }

  if (decoded.startsWith("local_")) {
    const reportId = decoded.replace(/^local_/, "").split("_")[0];

    return sampleReports.find((report) =>
      report.status === "released" && report.reportId === reportId
    );
  }

  return undefined;
}

export function hasValidGuardianEmail(report: StudentReport) {
  return Boolean(report.guardianEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(report.guardianEmail));
}

export function normalizedWhatsAppNumber(report: StudentReport) {
  const raw = report.guardianWhatsApp?.replace(/[^\d+]/g, "") ?? "";

  if (raw.startsWith("+234") && raw.length === 14) {
    return raw.replace("+", "");
  }

  if (raw.startsWith("234") && raw.length === 13) {
    return raw;
  }

  if (raw.startsWith("0") && raw.length === 11) {
    return `234${raw.slice(1)}`;
  }

  return null;
}
