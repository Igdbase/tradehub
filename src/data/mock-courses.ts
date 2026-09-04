import type { Course, LessonProgress } from "@/types/tradehub";

export const mockCourses: Course[] = [
  {
    courseId: "course_apex_starter_blueprint",
    workspaceId: "ws_apexfx",
    title: "Starter Blueprint",
    description: "Core market structure, risk basics, and session planning for new Apex FX students.",
    thumbnailVideoId: "ApxStrt001X",
    accessTier: "tier_apex_starter",
    published: true,
    sections: [
      {
        sectionId: "sec_apex_foundations",
        title: "Week 1 — Foundations",
        order: 1,
        lessons: [
          {
            lessonId: "lesson_apex_pip_math",
            title: "Pip Math Without Guesswork",
            youtubeVideoId: "apxPipMath1",
            notes: "Walk through lot sizing, stop placement, and why percentage risk matters more than win-rate theatre.",
            order: 1,
            requiresPrevious: false,
            attachments: [
              {
                label: "Lot size worksheet",
                url: "https://drive.google.com/file/d/FAKE_APEX_PIP_MATH/view"
              }
            ],
            quiz: {
              questions: [
                {
                  question: "What must stay fixed before scaling lot size?",
                  options: ["Risk amount", "Leverage slider", "Session bias"],
                  correctIndex: 0
                }
              ]
            },
            requiresQuizPass: true
          },
          {
            lessonId: "lesson_apex_risk_compounding",
            title: "Risk Compounding and Survival",
            youtubeVideoId: "apxRisk001B",
            notes: "Why protecting your downside keeps you alive long enough to benefit from good execution.",
            order: 2,
            requiresPrevious: true,
            attachments: [],
            requiresQuizPass: false
          }
        ]
      },
      {
        sectionId: "sec_apex_structure",
        title: "Week 2 — Structure and Sessions",
        order: 2,
        lessons: [
          {
            lessonId: "lesson_apex_liquidity_map",
            title: "Mapping Liquidity on XAUUSD",
            youtubeVideoId: "apxLiqMap01",
            notes: "A clean process for marking external highs/lows before London opens.",
            order: 1,
            requiresPrevious: true,
            attachments: [
              {
                label: "London checklist",
                url: "https://res.cloudinary.com/tradehub-demo/raw/upload/v1/apex-london-checklist.pdf"
              }
            ],
            requiresQuizPass: false
          },
          {
            lessonId: "lesson_apex_session_planning",
            title: "Session Planning in 15 Minutes",
            youtubeVideoId: "apxSesnPlan1",
            notes: "Build a pre-session process that students can repeat before every trading day.",
            order: 2,
            requiresPrevious: true,
            attachments: [],
            requiresQuizPass: false
          }
        ]
      }
    ]
  },
  {
    courseId: "course_apex_signals_mastery",
    workspaceId: "ws_apexfx",
    title: "Signals Mastery",
    description: "How to read, manage, and respond to signals without breaking your own rules.",
    thumbnailVideoId: "ApxSigMast2",
    accessTier: "tier_apex_elite",
    published: true,
    sections: [
      {
        sectionId: "sec_apex_signal_process",
        title: "Signal Process",
        order: 1,
        lessons: [
          {
            lessonId: "lesson_apex_signal_alert_read",
            title: "Reading the Signal Card",
            youtubeVideoId: "apxSigCard1",
            notes: "Understand entry, invalidation, and why cancelled signals matter as much as winners.",
            order: 1,
            requiresPrevious: false,
            attachments: [],
            requiresQuizPass: false
          },
          {
            lessonId: "lesson_apex_execution_hygiene",
            title: "Execution Hygiene",
            youtubeVideoId: "apxExecHyg1",
            notes: "Slippage, spread awareness, and when not to chase a missed entry.",
            order: 2,
            requiresPrevious: true,
            attachments: [],
            quiz: {
              questions: [
                {
                  question: "What is the safest response to a missed signal entry?",
                  options: ["Chase", "Skip and wait", "Double risk"],
                  correctIndex: 1
                }
              ]
            },
            requiresQuizPass: true
          }
        ]
      }
    ]
  },
  {
    courseId: "course_apex_prop_psychology",
    workspaceId: "ws_apexfx",
    title: "Prop Firm Psychology",
    description: "Mindset and process lessons for students trading funded challenges.",
    thumbnailVideoId: "ApxPropMind",
    accessTier: "tier_apex_pro",
    published: true,
    sections: [
      {
        sectionId: "sec_apex_prop_rules",
        title: "Funded Account Discipline",
        order: 1,
        lessons: [
          {
            lessonId: "lesson_apex_daily_drawdown",
            title: "Daily Drawdown Discipline",
            youtubeVideoId: "apxDrawdn01",
            notes: "Translate challenge rules into repeatable trading constraints.",
            order: 1,
            requiresPrevious: false,
            attachments: [],
            requiresQuizPass: false
          },
          {
            lessonId: "lesson_apex_signal_alert_boundary",
            title: "Why Prop Accounts Receive Alerts, Not Auto-Copy",
            youtubeVideoId: "apxAlertOnly",
            notes: "Protect funded accounts by separating manual execution from any external automation.",
            order: 2,
            requiresPrevious: true,
            attachments: [],
            requiresQuizPass: false
          }
        ]
      }
    ]
  },
  {
    courseId: "course_north_crypto_risk_engine",
    workspaceId: "ws_northstar",
    title: "Crypto Risk Engine",
    description: "Position sizing and execution control for spot and perpetual traders.",
    thumbnailVideoId: "NrthRisk001",
    accessTier: "tier_north_starter",
    published: false,
    sections: [
      {
        sectionId: "sec_north_risk",
        title: "Risk Foundations",
        order: 1,
        lessons: [
          {
            lessonId: "lesson_north_size_map",
            title: "Sizing Volatile Markets",
            youtubeVideoId: "nrthSize001",
            notes: "Keep position size calm when the market is loud.",
            order: 1,
            requiresPrevious: false,
            attachments: [],
            requiresQuizPass: false
          },
          {
            lessonId: "lesson_north_rotation",
            title: "Rotation vs FOMO Entries",
            youtubeVideoId: "nrthRot001A",
            notes: "Build patience around rotations instead of chasing breakout emotion.",
            order: 2,
            requiresPrevious: true,
            attachments: [],
            requiresQuizPass: false
          }
        ]
      }
    ]
  }
];

export const mockLessonProgress: LessonProgress[] = [
  {
    workspaceId: "ws_apexfx",
    studentId: "st_ada_apex",
    courseId: "course_apex_starter_blueprint",
    lessonId: "lesson_apex_pip_math",
    watchedPercent: 100,
    completed: true,
    quizScore: 100,
    quizPassed: true,
    lastWatched: "2026-07-02T18:10:00.000Z"
  },
  {
    workspaceId: "ws_apexfx",
    studentId: "st_ada_apex",
    courseId: "course_apex_starter_blueprint",
    lessonId: "lesson_apex_risk_compounding",
    watchedPercent: 94,
    completed: true,
    lastWatched: "2026-07-02T18:42:00.000Z"
  },
  {
    workspaceId: "ws_apexfx",
    studentId: "st_ada_apex",
    courseId: "course_apex_starter_blueprint",
    lessonId: "lesson_apex_liquidity_map",
    watchedPercent: 88,
    completed: true,
    lastWatched: "2026-07-03T07:20:00.000Z"
  },
  {
    workspaceId: "ws_apexfx",
    studentId: "st_ada_apex",
    courseId: "course_apex_starter_blueprint",
    lessonId: "lesson_apex_session_planning",
    watchedPercent: 75,
    completed: false,
    lastWatched: "2026-07-05T20:10:00.000Z"
  },
  {
    workspaceId: "ws_apexfx",
    studentId: "st_ada_apex",
    courseId: "course_apex_signals_mastery",
    lessonId: "lesson_apex_signal_alert_read",
    watchedPercent: 100,
    completed: true,
    lastWatched: "2026-07-05T21:30:00.000Z"
  },
  {
    workspaceId: "ws_apexfx",
    studentId: "st_ada_apex",
    courseId: "course_apex_signals_mastery",
    lessonId: "lesson_apex_execution_hygiene",
    watchedPercent: 64,
    completed: false,
    quizScore: 50,
    quizPassed: false,
    lastWatched: "2026-07-05T22:00:00.000Z"
  },
  {
    workspaceId: "ws_apexfx",
    studentId: "st_kunle_apex",
    courseId: "course_apex_prop_psychology",
    lessonId: "lesson_apex_daily_drawdown",
    watchedPercent: 92,
    completed: true,
    lastWatched: "2026-07-04T09:15:00.000Z"
  },
  {
    workspaceId: "ws_apexfx",
    studentId: "st_kunle_apex",
    courseId: "course_apex_prop_psychology",
    lessonId: "lesson_apex_signal_alert_boundary",
    watchedPercent: 54,
    completed: false,
    lastWatched: "2026-07-04T09:50:00.000Z"
  },
  {
    workspaceId: "ws_apexfx",
    studentId: "st_ifeoma_apex",
    courseId: "course_apex_starter_blueprint",
    lessonId: "lesson_apex_pip_math",
    watchedPercent: 100,
    completed: true,
    quizScore: 100,
    quizPassed: true,
    lastWatched: "2026-07-01T20:10:00.000Z"
  },
  {
    workspaceId: "ws_apexfx",
    studentId: "st_ifeoma_apex",
    courseId: "course_apex_starter_blueprint",
    lessonId: "lesson_apex_risk_compounding",
    watchedPercent: 100,
    completed: true,
    lastWatched: "2026-07-01T20:45:00.000Z"
  },
  {
    workspaceId: "ws_apexfx",
    studentId: "st_ifeoma_apex",
    courseId: "course_apex_prop_psychology",
    lessonId: "lesson_apex_daily_drawdown",
    watchedPercent: 82,
    completed: true,
    lastWatched: "2026-07-05T05:40:00.000Z"
  },
  {
    workspaceId: "ws_northstar",
    studentId: "st_nora_north",
    courseId: "course_north_crypto_risk_engine",
    lessonId: "lesson_north_size_map",
    watchedPercent: 100,
    completed: true,
    lastWatched: "2026-07-05T19:10:00.000Z"
  },
  {
    workspaceId: "ws_northstar",
    studentId: "st_nora_north",
    courseId: "course_north_crypto_risk_engine",
    lessonId: "lesson_north_rotation",
    watchedPercent: 72,
    completed: false,
    lastWatched: "2026-07-05T19:45:00.000Z"
  }
];
