/**
 * Classroom Theme Utility
 * Adapts UI based on grade level for age-appropriate experience
 */

export type ClassroomTheme = 'playful' | 'professional';

export interface NavItemOverride {
  emoji: string;
  label: string;
}

export interface ClassroomThemeConfig {
  type: ClassroomTheme;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    reactionBg: string;
  };
  animations: {
    reactionScale: number;
    reactionDuration: string;
    buttonHover: string;
    celebration: boolean;
  };
  typography: {
    headingSize: string;
    bodySize: string;
    buttonSize: string;
    fontWeight: string;
  };
  spacing: {
    reactionSize: string;
    buttonPadding: string;
    borderRadius: string;
  };
  effects: {
    shadows: boolean;
    gradients: boolean;
    sparkles: boolean;
    celebration: boolean;
  };
  language: {
    raiseHand: string;
    askQuestion: string;
    submit: string;
    leave: string;
  };
  layout: {
    sidebarBg: string;
    sidebarText: string;
    sidebarActiveItemBg: string;
    sidebarActiveItemText: string;
    sidebarActiveItemBorder: string;
    sidebarHoverBg: string;
    mobileBg: string;
    contentBg: string;
    cardBg: string;
    cardBorder: string;
    headingColor: string;
    pageBorderRadius: string;
  };
  nav: {
    /** Font size class for nav labels */
    fontSize: string;
    /** Font weight class */
    fontWeight: string;
    /** Padding class for nav items */
    itemPadding: string;
    /** Border radius class for nav items */
    itemRadius: string;
    /** Whether to show emoji instead of Material Symbols icon */
    useEmoji: boolean;
    /** Per-route overrides (emoji + kid-friendly label). Only used when useEmoji is true. */
    items: Record<string, NavItemOverride>;
  };
}

const playfulNavItems: Record<string, NavItemOverride> = {
  '/student': { emoji: '\u{1F3E0}', label: 'My Home' },
  '/student/subjects': { emoji: '\u{1F4DA}', label: 'My Subjects' },
  '/student/live-sessions': { emoji: '\u{1F3A5}', label: 'Live Class' },
  '/student/assessments': { emoji: '\u{1F4DD}', label: 'My Tests' },
  '/student/grades': { emoji: '\u2B50', label: 'My Stars' },
  '/student/attendance': { emoji: '\u2705', label: 'Attendance' },
  '/student/progress': { emoji: '\u{1F4CA}', label: 'My Progress' },
  '/student/notes': { emoji: '\u{1F4D2}', label: 'My Notes' },
  '/student/ask-ai': { emoji: '\u{1F916}', label: 'Ask AI' },
  '/student/downloads': { emoji: '\u{1F4E5}', label: 'Downloads' },
  '/student/messages': { emoji: '\u{1F4AC}', label: 'Messages' },
  '/student/announcements': { emoji: '\u{1F4E2}', label: 'News' },
  '/student/notifications': { emoji: '\u{1F514}', label: 'Alerts' },
  '/student/profile': { emoji: '\u{1F60A}', label: 'My Profile' },
  '/student/help': { emoji: '\u2753', label: 'Help' },
};

/**
 * Determine theme based on grade level
 */
export function getClassroomTheme(gradeLevel: string): ClassroomThemeConfig {
  const grade = parseInt(gradeLevel);

  // Grades 1-6: Playful, cartoonish
  if (grade >= 1 && grade <= 6) {
    return {
      type: 'playful',
      colors: {
        primary: '#FF6B9D', // Bright pink
        secondary: '#4ECDC4', // Turquoise
        accent: '#FFE66D', // Sunny yellow
        background: '#F7F9FC',
        text: '#2D3748',
        reactionBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      },
      animations: {
        reactionScale: 1.3,
        reactionDuration: '0.5s',
        buttonHover: 'bounce',
        celebration: true,
      },
      typography: {
        headingSize: 'text-2xl',
        bodySize: 'text-lg',
        buttonSize: 'text-xl',
        fontWeight: 'font-bold',
      },
      spacing: {
        reactionSize: 'w-16 h-16',
        buttonPadding: 'px-6 py-4',
        borderRadius: 'rounded-2xl',
      },
      effects: {
        shadows: true,
        gradients: true,
        sparkles: true,
        celebration: true,
      },
      language: {
        raiseHand: '\u{1F64B} Raise Your Hand!',
        askQuestion: '\u2753 Ask a Question',
        submit: '\u{1F680} Send!',
        leave: '\u{1F44B} Leave Class',
      },
      layout: {
        sidebarBg: 'bg-gradient-to-b from-pink-50 to-purple-50',
        sidebarText: 'text-purple-900',
        sidebarActiveItemBg: 'bg-pink-200/60',
        sidebarActiveItemText: 'text-pink-700',
        sidebarActiveItemBorder: 'border border-pink-300',
        sidebarHoverBg: 'hover:bg-pink-100/50',
        mobileBg: 'bg-gradient-to-b from-pink-50 to-purple-50',
        contentBg: 'bg-gradient-to-br from-pink-50/30 via-white to-purple-50/30',
        cardBg: 'bg-white',
        cardBorder: 'border-2 border-pink-200',
        headingColor: 'text-purple-900',
        pageBorderRadius: 'rounded-2xl',
      },
      nav: {
        fontSize: 'text-base',
        fontWeight: 'font-bold',
        itemPadding: 'px-3 py-3',
        itemRadius: 'rounded-xl',
        useEmoji: true,
        items: playfulNavItems,
      },
    };
  }

  // Grades 7-12 (or unknown): Professional, clean
  return {
    type: 'professional',
    colors: {
      primary: '#3B82F6', // Professional blue
      secondary: '#6366F1', // Indigo
      accent: '#10B981', // Green
      background: '#FFFFFF',
      text: '#1F2937',
      reactionBg: '#F3F4F6',
    },
    animations: {
      reactionScale: 1.1,
      reactionDuration: '0.2s',
      buttonHover: 'smooth',
      celebration: false,
    },
    typography: {
      headingSize: 'text-xl',
      bodySize: 'text-base',
      buttonSize: 'text-sm',
      fontWeight: 'font-semibold',
    },
    spacing: {
      reactionSize: 'w-10 h-10',
      buttonPadding: 'px-4 py-2',
      borderRadius: 'rounded-lg',
    },
    effects: {
      shadows: false,
      gradients: false,
      sparkles: false,
      celebration: false,
    },
    language: {
      raiseHand: 'Raise Hand',
      askQuestion: 'Ask Question',
      submit: 'Submit',
      leave: 'Leave Session',
    },
    layout: {
      sidebarBg: 'bg-white dark:bg-[#1a2634]',
      sidebarText: 'text-slate-700 dark:text-slate-200',
      sidebarActiveItemBg: 'bg-primary/10',
      sidebarActiveItemText: 'text-primary',
      sidebarActiveItemBorder: 'border border-primary/10',
      sidebarHoverBg: 'hover:bg-slate-50 hover:text-primary dark:hover:bg-slate-700',
      mobileBg: 'bg-white dark:bg-[#1a2634]',
      contentBg: '',
      cardBg: 'bg-white dark:bg-[#1a2634]',
      cardBorder: 'border border-slate-200 dark:border-slate-700',
      headingColor: 'text-slate-900 dark:text-white',
      pageBorderRadius: 'rounded-xl',
    },
    nav: {
      fontSize: 'text-sm',
      fontWeight: 'font-medium',
      itemPadding: 'px-3 py-2.5',
      itemRadius: 'rounded-lg',
      useEmoji: false,
      items: {},
    },
  };
}

/**
 * Get reaction emoji and labels based on theme
 */
export function getReactionConfig(theme: ClassroomTheme) {
  if (theme === 'playful') {
    return [
      { emoji: '\u{1F64B}\u200D\u2642\uFE0F', type: 'raise_hand', label: 'Raise Hand!', color: '#FF6B9D' },
      { emoji: '\u{1F44D}', type: 'thumbs_up', label: 'Got It!', color: '#4ECDC4' },
      { emoji: '\u{1F44F}', type: 'clap', label: 'Amazing!', color: '#FFE66D' },
      { emoji: '\u{1F615}', type: 'confused', label: 'Confused', color: '#FF8B94' },
      { emoji: '\u26A1', type: 'speed_up', label: 'Too Slow', color: '#A8E6CF' },
      { emoji: '\u{1F40C}', type: 'slow_down', label: 'Too Fast', color: '#DDA15E' },
    ];
  }

  return [
    { emoji: '\u270B', type: 'raise_hand', label: 'Raise Hand', color: '#3B82F6' },
    { emoji: '\u{1F44D}', type: 'thumbs_up', label: 'Understood', color: '#10B981' },
    { emoji: '\u{1F44F}', type: 'clap', label: 'Great', color: '#8B5CF6' },
    { emoji: '\u{1F914}', type: 'confused', label: 'Unclear', color: '#F59E0B' },
    { emoji: '\u26A1', type: 'speed_up', label: 'Speed Up', color: '#EF4444' },
    { emoji: '\u{1F422}', type: 'slow_down', label: 'Slow Down', color: '#6366F1' },
  ];
}
