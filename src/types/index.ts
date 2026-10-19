export type TaskStatus = 'todo' | 'in_progress' | 'completed';

export type GateTaskCategory = 'concept' | 'pyq' | 'mock' | 'revision' | 'notes';

export interface GateCategoryInfo {
  id: GateTaskCategory;
  label: string;
  fullLabel: string;
  emoji: string;
  color: string;
  bgClass: string;
}

export const GATE_TASK_CATEGORIES: Record<GateTaskCategory, GateCategoryInfo> = {
  concept: {
    id: 'concept',
    label: 'Concept',
    fullLabel: 'Concept & Theory',
    emoji: '📖',
    color: '#06b6d4',
    bgClass: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
  },
  pyq: {
    id: 'pyq',
    label: 'PYQs',
    fullLabel: 'PYQ Practice (Past Years)',
    emoji: '📝',
    color: '#f59e0b',
    bgClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
  },
  mock: {
    id: 'mock',
    label: 'Mock Test',
    fullLabel: 'Mock Test & Analysis',
    emoji: '🧪',
    color: '#f43f5e',
    bgClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
  },
  revision: {
    id: 'revision',
    label: 'Revision',
    fullLabel: 'Formula & Short Notes Revision',
    emoji: '🔁',
    color: '#10b981',
    bgClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
  },
  notes: {
    id: 'notes',
    label: 'Short Notes',
    fullLabel: 'Short Notes & Mistake Log',
    emoji: '📓',
    color: '#8b5cf6',
    bgClass: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30'
  }
};

export interface SubjectColor {
  hex: string;
  name: string;
}

export const SUBJECT_PALETTE: SubjectColor[] = [
  { hex: '#0d9488', name: 'Ocean Teal' },
  { hex: '#06b6d4', name: 'Aqua Cyan' },
  { hex: '#0284c7', name: 'Sky Wave' },
  { hex: '#3b82f6', name: 'Cobalt Blue' },
  { hex: '#6366f1', name: 'Indigo' },
  { hex: '#8b5cf6', name: 'Electric Violet' },
  { hex: '#a855f7', name: 'Bright Purple' },
  { hex: '#d946ef', name: 'Neon Fuchsia' },
  { hex: '#ec4899', name: 'Rose Quartz' },
  { hex: '#f43f5e', name: 'Coral Pink' },
  { hex: '#ef4444', name: 'Ruby Crimson' },
  { hex: '#f97316', name: 'Deep Orange' },
  { hex: '#f59e0b', name: 'Solar Amber' },
  { hex: '#eab308', name: 'Golden Sun' },
  { hex: '#84cc16', name: 'Lime Green' },
  { hex: '#10b981', name: 'Emerald Gem' },
  { hex: '#14b8a6', name: 'Turquoise' },
  { hex: '#0f766e', name: 'Dark Teal' },
  { hex: '#64748b', name: 'Steel Slate' },
  { hex: '#fb7185', name: 'Watermelon' },
];

export const PRESET_COLORS = SUBJECT_PALETTE.map(c => c.hex);

export interface Tag {
  id: string;
  name: string; // e.g. "internship", "hackathon", "frontend", "deep-work"
  color: string; // hex color
  icon?: string;
  createdAt: string;
}

export const DEFAULT_TAG_PALETTE = [
  { id: 'tag_internship', name: 'internship', color: '#0C66E4', icon: '💼' },
  { id: 'tag_hackathon', name: 'hackathon', color: '#8B5CF6', icon: '🚀' },
  { id: 'tag_dev', name: 'dev & code', color: '#06B6D4', icon: '💻' },
  { id: 'tag_project', name: 'project', color: '#10B981', icon: '⚡' },
  { id: 'tag_deepwork', name: 'deep-work', color: '#F59E0B', icon: '🧠' },
  { id: 'tag_study', name: 'study & research', color: '#EC4899', icon: '📚' },
  { id: 'tag_urgent', name: 'urgent', color: '#EF4444', icon: '🔥' },
];

export interface Subject {
  id: string;
  name: string;
  color: string;
  icon?: string;
  weeklyTargetHours?: number;
  examWeightageMarks?: number;
  highYieldTopics?: string[];
  createdAt: string;
}

export interface BoardMember {
  id: string;
  name: string;
  email: string;
  color: string;
  avatar?: string;
  role: 'owner' | 'editor' | 'viewer';
}

export interface StudyBoard {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isDefault?: boolean;
  members: BoardMember[];
  createdAt: string;
}

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Task {
  id: string;
  boardId?: string; // ID of the board this card belongs to
  name: string;
  tags?: string[]; // array of tag IDs (e.g. ['tag_internship', 'tag_dev'])
  subjectId?: string; // legacy support for backward compatibility
  approxHours: number; // e.g. 1.5
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime?: string; // HH:mm
  completedHours: number; // accumulated hours
  status: TaskStatus;
  priority?: TaskPriority;
  category?: GateTaskCategory; // Concept, PYQ, Mock Test, Revision, Notes
  notes?: string;
  checklist?: { id: string; text: string; done: boolean }[];
  assigneeId?: string; // Collaborator member ID delegated to this task
  assigneeName?: string; // Collaborator display name
  assigneeColor?: string; // Collaborator avatar color
  gcalEventId?: string; // Google Calendar Event ID if synced
  gcalLink?: string; // Web link to view event in Google Calendar
  createdAt: string;
  updatedAt: string;
}

export type Topic = Task;

export interface StudySession {
  id: string;
  boardId?: string;
  tagId?: string; // Primary tag tracked for this session
  tags?: string[]; // All tags associated with this session
  subjectId?: string; // legacy support
  topicId?: string;
  taskTitle?: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  durationMinutes: number; // exact minutes
  durationHours: number; // durationMinutes / 60
  mode: 'pomodoro' | 'short_break' | 'long_break' | 'custom';
  completed: boolean;
  notes?: string;
}

export interface UserGamification {
  xp: number;
  level: number;
  levelTitle: string;
  totalMinutesFocused: number;
  totalTasksCompleted: number;
}

export interface AIProductivityInsight {
  id: string;
  type: 'optimization' | 'burnout_alert' | 'peak_hours' | 'time_drift' | 'achievement';
  title: string;
  description: string;
  actionRecommendation: string;
  tagId?: string;
  severity: 'info' | 'positive' | 'warning';
  createdAt: string;
}

export type WhiteboardTool = 'select' | 'pen' | 'highlighter' | 'eraser' | 'rect' | 'circle' | 'arrow' | 'line' | 'text';

export interface WhiteboardElement {
  id: string;
  type: WhiteboardTool;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
  fill?: string;
  text?: string;
}

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'error';
export type TimerMode = 'work' | 'break' | 'long_break';
export type AmbientSoundType = 'none' | 'ocean' | 'stream' | 'rain';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  googleConnected: boolean;
  googleCalendarSyncEnabled: boolean;
  googleAccessToken?: string;
  syncKey?: string; // 6-character room key for instant cross-device sync
  lastSyncedAt?: string;
}

export interface UserSettings {
  weeklyHoursTarget: number; // e.g. 20 general, 28 for GATE
  pomodoroWorkMinutes: number; // default 25
  pomodoroBreakMinutes: number; // default 5
  pomodoroLongBreakMinutes: number; // default 15
  autoStartBreaks: boolean;
  soundEnabled: boolean;
  ambientSound: 'none' | 'rain' | 'whitenoise' | 'deepfocus';
  weekStartsOnMonday: boolean;
  theme: 'dark' | 'light';
  isGatePrep?: boolean; // true if user opted into GATE Exam Prep mode, false for simpler version
  examName?: string; // Custom exam name (e.g., 'Semester Finals', 'GATE CSE', 'CAT')
  gateExamDate?: string; // YYYY-MM-DD Exam Date for countdown
  gateTargetStream?: string; // e.g. 'CSE', 'DA', 'ECE_EE'
  gateTargetAir?: string; // e.g. 'AIR < 100'
}

export type AppSettings = UserSettings;

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null; // YYYY-MM-DD
  activityHistory: Record<string, number>; // dateString -> hours studied
}

export interface PacingRecommendation {
  weeklyTarget: number;
  hoursStudiedThisWeek: number;
  hoursRemaining: number;
  daysRemainingInWeek: number;
  recommendedDailyHours: number;
  status: 'ahead' | 'on_track' | 'behind' | 'achieved';
  message: string;
}

export interface GateSubjectPreset {
  name: string;
  color: string;
  weeklyTargetHours: number;
  examWeightageMarks: number;
  highYieldTopics: string[];
}

export const GATE_STREAM_SYLLABUS: Record<string, { label: string; subjects: GateSubjectPreset[] }> = {
  CSE: {
    label: 'GATE CS & IT',
    subjects: [
      {
        name: 'General Aptitude (15M)',
        color: '#f59e0b',
        weeklyTargetHours: 4,
        examWeightageMarks: 15,
        highYieldTopics: ['Quantitative Aptitude PYQs', 'Spatial Aptitude & Series', 'Logical Reasoning & Syllogisms', 'Permutations & Probability']
      },
      {
        name: 'Engg & Discrete Maths (13M)',
        color: '#8b5cf6',
        weeklyTargetHours: 6,
        examWeightageMarks: 13,
        highYieldTopics: ['Linear Algebra: Eigenvalues & Rank', 'Graph Theory & Combinatorics', 'First Order Logic & Propositions', 'Calculus & Probability Distributions']
      },
      {
        name: 'Algorithms & DS / C Prog (15M)',
        color: '#06b6d4',
        weeklyTargetHours: 7,
        examWeightageMarks: 15,
        highYieldTopics: ['Pointers & Recursion in C PYQs', 'Trees, Heaps & AVL Rotations', 'Dynamic Programming & Greedy', 'Graph Algorithms (Dijkstra, MST, BFS/DFS)', 'Time Complexity & Recurrence Relations']
      },
      {
        name: 'Operating Systems (9M)',
        color: '#10b981',
        weeklyTargetHours: 5,
        examWeightageMarks: 9,
        highYieldTopics: ['Process Sync & Semaphores PYQs', 'Virtual Memory, Paging & TLB', 'CPU Scheduling & Deadlocks', 'Disk Scheduling & File Systems']
      },
      {
        name: 'Computer Networks (8M)',
        color: '#3b82f6',
        weeklyTargetHours: 5,
        examWeightageMarks: 8,
        highYieldTopics: ['IPv4 Subnetting & Supernetting PYQs', 'TCP Flow & Congestion Control', 'Sliding Window (Go-Back-N, SR)', 'Distance Vector & OSPF Routing']
      },
      {
        name: 'DBMS (7M)',
        color: '#0d9488',
        weeklyTargetHours: 4,
        examWeightageMarks: 7,
        highYieldTopics: ['Normal Forms & Functional Dependencies', 'B and B+ Tree Indexing PYQs', 'Transactions, Conflict Serializability', 'SQL Queries & Relational Algebra']
      },
      {
        name: 'COA & Digital Logic (13M)',
        color: '#ec4899',
        weeklyTargetHours: 5,
        examWeightageMarks: 13,
        highYieldTopics: ['Cache Mapping (Direct, Associative) PYQs', 'Instruction Pipelining & Hazards', 'K-Maps, Multiplexers & Sequential Circuits', 'IEEE-754 Floating Point & Number Systems']
      },
      {
        name: 'TOC & Compiler Design (11M)',
        color: '#f97316',
        weeklyTargetHours: 5,
        examWeightageMarks: 11,
        highYieldTopics: ['DFA, NFA & Regular Expressions PYQs', 'PDA, CFG & Closure Properties', 'Decidability & Rice Theorem', 'LL(1) & LR Parsing Tables, SDT']
      }
    ]
  },
  DA: {
    label: 'GATE DA (Data Science & AI)',
    subjects: [
      {
        name: 'General Aptitude (15M)',
        color: '#f59e0b',
        weeklyTargetHours: 4,
        examWeightageMarks: 15,
        highYieldTopics: ['Quantitative Aptitude PYQs', 'Analytical & Spatial Reasoning', 'Data Interpretation']
      },
      {
        name: 'Probability & Statistics (18M)',
        color: '#8b5cf6',
        weeklyTargetHours: 6,
        examWeightageMarks: 18,
        highYieldTopics: ['Bayes Theorem & Conditional Probability', 'Normal, Binomial, Poisson Distributions', 'Hypothesis Testing, MLE & Confidence Intervals', 'Covariance, Correlation &CLT']
      },
      {
        name: 'Linear Algebra & Calculus (16M)',
        color: '#06b6d4',
        weeklyTargetHours: 6,
        examWeightageMarks: 16,
        highYieldTopics: ['SVD, LU & Eigen Decomposition', 'Projections, Orthogonality & Rank', 'Taylor Series, Maxima/Minima & Optimization']
      },
      {
        name: 'Machine Learning (20M)',
        color: '#10b981',
        weeklyTargetHours: 7,
        examWeightageMarks: 20,
        highYieldTopics: ['Linear, Ridge & Logistic Regression', 'SVM, Kernels & Decision Trees', 'PCA, K-Means & Hierarchical Clustering', 'MLP, Backpropagation & Cross-Validation']
      },
      {
        name: 'Artificial Intelligence (11M)',
        color: '#f43f5e',
        weeklyTargetHours: 4,
        examWeightageMarks: 11,
        highYieldTopics: ['A* Search, Adversarial Minimax & Alpha-Beta', 'Propositional & Predicate Logic', 'Bayesian Networks & Conditional Independence']
      },
      {
        name: 'Python, DS & Algorithms (12M)',
        color: '#3b82f6',
        weeklyTargetHours: 5,
        examWeightageMarks: 12,
        highYieldTopics: ['Sorting, Searching & Hashing', 'Trees, Graphs & Traversals in Python', 'Asymptotic Analysis & Recurrences']
      },
      {
        name: 'DBMS & Warehousing (8M)',
        color: '#0d9488',
        weeklyTargetHours: 3,
        examWeightageMarks: 8,
        highYieldTopics: ['ER Model, Relational Algebra & SQL', 'Normalization (1NF-BCNF)', 'Data Warehousing & OLAP Schemas']
      }
    ]
  },
  ECE_EE: {
    label: 'GATE ECE / EE',
    subjects: [
      {
        name: 'General Aptitude & Engg Maths (28M)',
        color: '#8b5cf6',
        weeklyTargetHours: 7,
        examWeightageMarks: 28,
        highYieldTopics: ['Differential Equations & Laplace', 'Complex Variables & Vector Calculus', 'Linear Algebra & Probability PYQs', 'Quantitative Aptitude']
      },
      {
        name: 'Network Theory & Signals (18M)',
        color: '#06b6d4',
        weeklyTargetHours: 6,
        examWeightageMarks: 18,
        highYieldTopics: ['Transient Analysis & Two-Port Networks', 'Thevenin, Norton & Maximum Power PYQs', 'Fourier, Laplace & Z-Transforms', 'LTI Systems & Convolution']
      },
      {
        name: 'Control Systems (9M)',
        color: '#10b981',
        weeklyTargetHours: 4,
        examWeightageMarks: 9,
        highYieldTopics: ['Bode Plot & Nyquist Stability PYQs', 'Root Locus & Routh-Hurwitz', 'State Space Analysis & Controllers']
      },
      {
        name: 'Analog & Digital Circuits (16M)',
        color: '#f59e0b',
        weeklyTargetHours: 6,
        examWeightageMarks: 16,
        highYieldTopics: ['Op-Amp Configurations & Diode Circuits', 'BJT & MOSFET biasing / amplifiers', 'Sequential Counters, FSM & ADC/DAC']
      },
      {
        name: 'Core Subjects (EDC/Comm/Machines) (29M)',
        color: '#f43f5e',
        weeklyTargetHours: 8,
        examWeightageMarks: 29,
        highYieldTopics: ['PN Junction, MOS Capacitor & Semiconductor PYQs', 'Information Theory, PCM & Modulation', 'EMFT / Power Systems & Electrical Machines']
      }
    ]
  }
};
