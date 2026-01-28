/**
 * Classroom Theme Utility
 * Adapts UI based on grade level for age-appropriate experience
 */

export type ClassroomTheme = 'playful' | 'professional';

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
  };
  language: {
    raiseHand: string;
    askQuestion: string;
    submit: string;
    leave: string;
  };
}

/**
 * Determine theme based on grade level
 */
export function getClassroomTheme(gradeLevel: string): ClassroomThemeConfig {
  const grade = parseInt(gradeLevel);

  // Grades 2-4: Playful, cartoonish
  if (grade >= 2 && grade <= 4) {
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
      },
      language: {
        raiseHand: '🙋 Raise Your Hand!',
        askQuestion: '❓ Ask a Question',
        submit: '🚀 Send!',
        leave: '👋 Leave Class',
      },
    };
  }

  // Grades 5-12: Professional, clean
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
    },
    language: {
      raiseHand: 'Raise Hand',
      askQuestion: 'Ask Question',
      submit: 'Submit',
      leave: 'Leave Session',
    },
  };
}

/**
 * Get reaction emoji and labels based on theme
 */
export function getReactionConfig(theme: ClassroomTheme) {
  if (theme === 'playful') {
    return [
      { emoji: '🙋‍♂️', type: 'raise_hand', label: 'Raise Hand!', color: '#FF6B9D' },
      { emoji: '👍', type: 'thumbs_up', label: 'Got It!', color: '#4ECDC4' },
      { emoji: '👏', type: 'clap', label: 'Amazing!', color: '#FFE66D' },
      { emoji: '😕', type: 'confused', label: 'Confused', color: '#FF8B94' },
      { emoji: '⚡', type: 'speed_up', label: 'Too Slow', color: '#A8E6CF' },
      { emoji: '🐌', type: 'slow_down', label: 'Too Fast', color: '#DDA15E' },
    ];
  }

  return [
    { emoji: '✋', type: 'raise_hand', label: 'Raise Hand', color: '#3B82F6' },
    { emoji: '👍', type: 'thumbs_up', label: 'Understood', color: '#10B981' },
    { emoji: '👏', type: 'clap', label: 'Great', color: '#8B5CF6' },
    { emoji: '🤔', type: 'confused', label: 'Unclear', color: '#F59E0B' },
    { emoji: '⚡', type: 'speed_up', label: 'Speed Up', color: '#EF4444' },
    { emoji: '🐢', type: 'slow_down', label: 'Slow Down', color: '#6366F1' },
  ];
}
