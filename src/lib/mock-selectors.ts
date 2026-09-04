import {
  defaultWorkspaceHandle,
  mockApplications,
  mockAuditEvents,
  mockCalendarPnlDays,
  mockCourses,
  mockDisputes,
  mockInfluencerProfiles,
  mockJournalInsights,
  mockJournalTrades,
  mockLessonProgress,
  mockMonthlyRevenue,
  mockOnboardingProgress,
  mockPaymentIntents,
  mockRiskFlags,
  mockSignals,
  mockStudents,
  mockSubscriptionPlans,
  mockSuperAdminProfile,
  mockWorkspaceRevenueSnapshots,
  mockWorkspaces
} from "@/data/index";
import type {
  ApplicationStatus,
  JournalStats,
  JournalTrade,
  PaymentIntent,
  WorkspaceApplication
} from "@/types/tradehub";

export function formatCurrencyNgn(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatCurrencyUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

export function getWorkspaceByHandle(handle: string) {
  return mockWorkspaces.find((workspace) => workspace.handle === handle.toLowerCase());
}

export function getWorkspaceById(workspaceId: string) {
  return mockWorkspaces.find((workspace) => workspace.workspaceId === workspaceId);
}

export function getDefaultWorkspace() {
  return getWorkspaceByHandle(defaultWorkspaceHandle) ?? mockWorkspaces[0];
}

export function getStudentsByWorkspace(workspaceId: string) {
  return mockStudents.filter((student) => student.workspaceId === workspaceId);
}

export function getCoursesByWorkspace(workspaceId: string) {
  return mockCourses.filter((course) => course.workspaceId === workspaceId);
}

export function getSignalsByWorkspace(workspaceId: string) {
  return mockSignals.filter((signal) => signal.workspaceId === workspaceId);
}

export function getLatestSignals(workspaceId: string, limit = 3) {
  return getSignalsByWorkspace(workspaceId)
    .slice()
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, limit);
}

export function getApplicationsByWorkspace(workspaceId: string) {
  return mockApplications.filter((application) => application.workspaceId === workspaceId);
}

export function groupApplicationsByStatus() {
  return mockApplications.reduce<Record<ApplicationStatus, WorkspaceApplication[]>>(
    (groups, application) => {
      groups[application.status].push(application);
      return groups;
    },
    {
      new: [],
      vetting: [],
      approved: [],
      rejected: [],
      workspace_created: [],
      activated: []
    }
  );
}

export function getOnboardingProgressByWorkspace(workspaceId: string) {
  return mockOnboardingProgress.find((progress) => progress.workspaceId === workspaceId);
}

export function getStudentById(studentId: string) {
  return mockStudents.find((student) => student.userId === studentId);
}

export function getPaymentsByWorkspace(workspaceId: string) {
  return mockPaymentIntents.filter((payment) => payment.workspaceId === workspaceId);
}

export function getPlanByTierId(tierId: string) {
  return mockSubscriptionPlans.find((plan) => plan.tierId === tierId);
}

export function calculatePlatformSplit(payment: PaymentIntent) {
  const platformAmountNgn =
    payment.split.platformAmountNgn ?? Math.round((payment.amountNgn * payment.split.platformPercent) / 100);
  const influencerAmountNgn =
    payment.split.influencerAmountNgn ??
    Math.round((payment.amountNgn * payment.split.influencerPercent) / 100);

  return {
    platformAmountNgn,
    influencerAmountNgn,
    platformAmountUsdc:
      payment.rail === "solana"
        ? payment.split.platformAmountUsdc ?? Number((payment.amountUsdc * payment.split.platformPercent / 100).toFixed(2))
        : undefined,
    influencerAmountUsdc:
      payment.rail === "solana"
        ? payment.split.influencerAmountUsdc ?? Number((payment.amountUsdc * payment.split.influencerPercent / 100).toFixed(2))
        : undefined
  };
}

export function getPaymentRailTotals() {
  return mockPaymentIntents.reduce(
    (totals, payment) => {
      const split = calculatePlatformSplit(payment);

      if (payment.rail === "paystack") {
        totals.paystack.count += 1;
        totals.paystack.volumeNgn += payment.amountNgn;
        totals.paystack.platformNgn += split.platformAmountNgn;
        if (payment.status === "verified") {
          totals.paystack.verifiedCount += 1;
        }
      } else {
        totals.solana.count += 1;
        totals.solana.volumeNgn += payment.amountNgn;
        totals.solana.volumeUsdc += payment.amountUsdc;
        totals.solana.platformNgn += split.platformAmountNgn;
        totals.solana.platformUsdc += split.platformAmountUsdc ?? 0;
        if (payment.status === "verified") {
          totals.solana.verifiedCount += 1;
        }
      }

      return totals;
    },
    {
      paystack: {
        count: 0,
        verifiedCount: 0,
        volumeNgn: 0,
        platformNgn: 0
      },
      solana: {
        count: 0,
        verifiedCount: 0,
        volumeNgn: 0,
        volumeUsdc: 0,
        platformNgn: 0,
        platformUsdc: 0
      }
    }
  );
}

export function getActiveSubscriberCount(workspaceId?: string) {
  return (workspaceId ? getStudentsByWorkspace(workspaceId) : mockStudents).filter((student) =>
    ["active", "trialing"].includes(student.subscriptionStatus)
  ).length;
}

export function getRevenueByTier(workspaceId: string) {
  const students = getStudentsByWorkspace(workspaceId).filter((student) =>
    ["active", "trialing", "past_due"].includes(student.subscriptionStatus)
  );

  return students.reduce<Record<string, { students: number; revenueNgn: number }>>((totals, student) => {
    const plan = getPlanByTierId(student.subscriptionTierId);
    const current = totals[student.subscriptionTierName] ?? { students: 0, revenueNgn: 0 };
    totals[student.subscriptionTierName] = {
      students: current.students + 1,
      revenueNgn: current.revenueNgn + (plan?.priceNgn ?? 0)
    };
    return totals;
  }, {});
}

export function getLessonProgressByStudent(studentId: string) {
  return mockLessonProgress.filter((progress) => progress.studentId === studentId);
}

export function getCourseProgressSummariesByStudent(studentId: string) {
  const progress = getLessonProgressByStudent(studentId);
  const student = getStudentById(studentId);

  if (!student) {
    return [];
  }

  return getCoursesByWorkspace(student.workspaceId)
    .map((course) => {
      const lessonIds = course.sections.flatMap((section) => section.lessons.map((lesson) => lesson.lessonId));
      const matching = progress.filter((entry) => entry.courseId === course.courseId);
      const completedCount = matching.filter((entry) => entry.completed).length;
      const overallPercent =
        lessonIds.length === 0
          ? 0
          : Math.round(
              matching.reduce((total, entry) => total + entry.watchedPercent, 0) / lessonIds.length
            );

      return {
        course,
        completedCount,
        lessonCount: lessonIds.length,
        overallPercent
      };
    })
    .filter((summary) => summary.lessonCount > 0);
}

export function getJournalTradesByStudent(studentId: string) {
  return mockJournalTrades.filter((trade) => trade.studentId === studentId);
}

export function calculateJournalWinRate(trades: JournalTrade[]) {
  if (trades.length === 0) {
    return 0;
  }

  const wins = trades.filter((trade) => trade.pnl > 0).length;
  return Math.round((wins / trades.length) * 100);
}

export function getJournalStats(studentId: string): JournalStats {
  const trades = getJournalTradesByStudent(studentId);

  if (trades.length === 0) {
    return {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      averageRiskReward: 0,
      totalPnl: 0,
      bestDayPnl: 0,
      worstDayPnl: 0,
      mostTradedPair: "N/A"
    };
  }

  const wins = trades.filter((trade) => trade.pnl > 0).length;
  const losses = trades.filter((trade) => trade.pnl <= 0).length;
  const totalPnl = trades.reduce((total, trade) => total + trade.pnl, 0);
  const averageRiskReward =
    trades.reduce((total, trade) => total + trade.riskReward, 0) / trades.length;

  const pnlByDate = trades.reduce<Record<string, number>>((totals, trade) => {
    const date = trade.closeTime.slice(0, 10);
    totals[date] = (totals[date] ?? 0) + trade.pnl;
    return totals;
  }, {});

  const pairCounts = trades.reduce<Record<string, number>>((counts, trade) => {
    counts[trade.pair] = (counts[trade.pair] ?? 0) + 1;
    return counts;
  }, {});

  const mostTradedPair =
    Object.entries(pairCounts).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "N/A";

  const dayPnls = Object.values(pnlByDate);

  return {
    totalTrades: trades.length,
    wins,
    losses,
    winRate: calculateJournalWinRate(trades),
    averageRiskReward: Number(averageRiskReward.toFixed(1)),
    totalPnl,
    bestDayPnl: Math.max(...dayPnls),
    worstDayPnl: Math.min(...dayPnls),
    mostTradedPair
  };
}

export function getJournalInsightsByStudent(studentId: string) {
  return mockJournalInsights.filter((insight) => insight.studentId === studentId);
}

export function getDisputesByWorkspace(workspaceId: string) {
  return mockDisputes.filter((dispute) => dispute.workspaceId === workspaceId);
}

export function getRiskFlagsByWorkspace(workspaceId: string) {
  return mockRiskFlags.filter((flag) => flag.workspaceId === workspaceId);
}

export function getWorkspaceRevenueSnapshot(workspaceId: string) {
  return mockWorkspaceRevenueSnapshots.find((snapshot) => snapshot.workspaceId === workspaceId);
}

export function getWorkspaceSummary(workspaceId: string) {
  const students = getStudentsByWorkspace(workspaceId);
  const signals = getSignalsByWorkspace(workspaceId);
  const payments = getPaymentsByWorkspace(workspaceId);
  const revenueSnapshot = getWorkspaceRevenueSnapshot(workspaceId);

  const activeStudents = students.filter((student) => student.subscriptionStatus === "active").length;
  const pastDueStudents = students.filter((student) => student.subscriptionStatus === "past_due").length;
  const signalDeliveryRate =
    signals.length === 0
      ? 0
      : Math.round(
          (signals.reduce(
            (total, signal) => total + signal.executionSummary.autoCopySuccess + signal.executionSummary.signalAlertsDelivered,
            0
          ) /
            Math.max(
              1,
              signals.reduce(
                (total, signal) => total + signal.executionSummary.autoCopyTotal + signal.executionSummary.signalAlertsDelivered,
                0
              )
            )) *
            100
        );

  const averageCourseProgress =
    students.length === 0
      ? 0
      : Math.round(
          students.reduce((total, student) => total + student.courseProgressPercent, 0) / students.length
        );

  const verifiedRevenueNgn = payments
    .filter((payment) => payment.status === "verified")
    .reduce((total, payment) => total + payment.amountNgn, 0);

  const verifiedPlatformNgn = payments
    .filter((payment) => payment.status === "verified")
    .reduce((total, payment) => total + calculatePlatformSplit(payment).platformAmountNgn, 0);

  return {
    activeStudents,
    pastDueStudents,
    signalDeliveryRate,
    averageCourseProgress,
    grossRevenueNgn: revenueSnapshot?.grossNgn ?? verifiedRevenueNgn,
    platformRevenueNgn: verifiedPlatformNgn,
    latestSignals: getLatestSignals(workspaceId, 3)
  };
}

export function getPlatformOverview() {
  const paymentTotals = getPaymentRailTotals();
  const openDisputes = mockDisputes.filter((dispute) => dispute.status !== "resolved").length;

  return {
    superAdmin: mockSuperAdminProfile,
    activeWorkspaces: mockWorkspaces.filter((workspace) => workspace.vettingStatus === "approved").length,
    totalWorkspaces: mockWorkspaces.length,
    totalStudents: mockStudents.length,
    activeSubscribers: getActiveSubscriberCount(),
    monthlyRevenueNgn: mockMonthlyRevenue[mockMonthlyRevenue.length - 1]?.grossNgn ?? 0,
    monthlyPlatformRevenueNgn: mockMonthlyRevenue[mockMonthlyRevenue.length - 1]?.platformNgn ?? 0,
    openApplications: mockApplications.filter((application) =>
      ["new", "vetting", "approved", "workspace_created"].includes(application.status)
    ).length,
    openDisputes,
    paymentTotals
  };
}

export function getHomeMetrics() {
  return {
    workspaces: mockWorkspaces.length,
    subscribers: getActiveSubscriberCount(),
    activeSignals: mockSignals.filter((signal) => signal.status === "active").length,
    monthlyRevenueNgn: mockMonthlyRevenue[mockMonthlyRevenue.length - 1]?.grossNgn ?? 0
  };
}

export function getJoinWorkspaceContext(handle: string) {
  const workspace = getWorkspaceByHandle(handle);

  if (!workspace) {
    return undefined;
  }

  return {
    workspace,
    students: getStudentsByWorkspace(workspace.workspaceId),
    activeSubscribers: getActiveSubscriberCount(workspace.workspaceId),
    revenueByTier: getRevenueByTier(workspace.workspaceId)
  };
}

export const platformData = {
  applications: mockApplications,
  auditEvents: mockAuditEvents,
  disputes: mockDisputes,
  influencers: mockInfluencerProfiles,
  monthlyRevenue: mockMonthlyRevenue,
  riskFlags: mockRiskFlags
};

// Re-export mock modules used in route-level composition.
export { mockCalendarPnlDays };
