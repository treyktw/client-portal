// mobile/src/constants/themes.ts
export type ThemeName = 'notebook' | 'coffee' | 'graphite' | 'mono';

interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  // Sidebar colors for navigation
  sidebar: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
}

interface Theme {
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
  fonts: {
    regular: string;
    medium: string;
    bold: string;
    mono: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

export const themes: Record<ThemeName, Theme> = {
  notebook: {
    colors: {
      light: {
        background: '#fbfbfb',
        foreground: '#595959',
        card: '#ffffff',
        cardForeground: '#595959',
        primary: '#7d7d7d',
        primaryForeground: '#f3f3f3',
        secondary: '#e6e6e6',
        secondaryForeground: '#595959',
        muted: '#eaeaea',
        mutedForeground: '#6e6e6e',
        accent: '#efec9a',
        accentForeground: '#676734',
        destructive: '#dc2626',
        destructiveForeground: '#ffffff',
        border: '#8d8d8d',
        input: '#ffffff',
        ring: '#b5b5b5',
        sidebar: '#f3f3f3',
        sidebarForeground: '#595959',
        sidebarPrimary: '#7d7d7d',
        sidebarPrimaryForeground: '#f3f3f3',
      },
      dark: {
        background: '#494949',
        foreground: '#e4e4e4',
        card: '#525252',
        cardForeground: '#e4e4e4',
        primary: '#c2c2c2',
        primaryForeground: '#494949',
        secondary: '#767676',
        secondaryForeground: '#cecece',
        muted: '#646464',
        mutedForeground: '#b5b5b5',
        accent: '#e8e8e8',
        accentForeground: '#525252',
        destructive: '#ef4444',
        destructiveForeground: '#494949',
        border: '#6d6d6d',
        input: '#525252',
        ring: '#cecece',
        sidebar: '#3f3f3f',
        sidebarForeground: '#e4e4e4',
        sidebarPrimary: '#c2c2c2',
        sidebarPrimaryForeground: '#3f3f3f',
      },
    },
    fonts: {
      regular: 'ArchitectsDaughter',
      medium: 'ArchitectsDaughter',
      bold: 'ArchitectsDaughter',
      mono: 'FiraCode-Regular',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
    },
    borderRadius: {
      sm: 6,
      md: 8,
      lg: 10,
      xl: 14,
    },
  },
  coffee: {
    colors: {
      light: {
        background: '#fbfbfb',
        foreground: '#3d3d3d',
        card: '#fdfdfd',
        cardForeground: '#3d3d3d',
        primary: '#6e5c3b',
        primaryForeground: '#ffffff',
        secondary: '#f0d98f',
        secondaryForeground: '#5a5436',
        muted: '#f5f5f5',
        mutedForeground: '#808080',
        accent: '#ededed',
        accentForeground: '#3d3d3d',
        destructive: '#dc2626',
        destructiveForeground: '#ffffff',
        border: '#e1e1e1',
        input: '#e1e1e1',
        ring: '#6e5c3b',
        sidebar: '#fafafa',
        sidebarForeground: '#434343',
        sidebarPrimary: '#535353',
        sidebarPrimaryForeground: '#fafafa',
      },
      dark: {
        background: '#2c2c2c',
        foreground: '#f2f2f2',
        card: '#363636',
        cardForeground: '#f2f2f2',
        primary: '#f0d283',
        primaryForeground: '#332f0d',
        secondary: '#514430',
        secondaryForeground: '#f0d283',
        muted: '#404040',
        mutedForeground: '#c4c4c4',
        accent: '#484848',
        accentForeground: '#f2f2f2',
        destructive: '#dc2626',
        destructiveForeground: '#ffffff',
        border: '#3b3b13',
        input: '#666666',
        ring: '#f0d283',
        sidebar: '#353530',
        sidebarForeground: '#f7f7f5',
        sidebarPrimary: '#7980d9',
        sidebarPrimaryForeground: '#ffffff',
      },
    },
    fonts: {
      regular: 'System',
      medium: 'System',
      bold: 'System',
      mono: 'Courier',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
    },
    borderRadius: {
      sm: 4,
      md: 6,
      lg: 8,
      xl: 12,
    },
  },
  graphite: {
    colors: {
      light: {
        background: '#f3f3f3',
        foreground: '#525252',
        card: '#f7f7f7',
        cardForeground: '#525252',
        primary: '#7d7d7d',
        primaryForeground: '#ffffff',
        secondary: '#e8e8e8',
        secondaryForeground: '#525252',
        muted: '#e2e2e2',
        mutedForeground: '#828282',
        accent: '#cecece',
        accentForeground: '#525252',
        destructive: '#dc2626',
        destructiveForeground: '#ffffff',
        border: '#dbdbdb',
        input: '#e8e8e8',
        ring: '#7d7d7d',
        sidebar: '#efefef',
        sidebarForeground: '#525252',
        sidebarPrimary: '#7d7d7d',
        sidebarPrimaryForeground: '#ffffff',
      },
      dark: {
        background: '#373737',
        foreground: '#e2e2e2',
        card: '#3d3d3d',
        cardForeground: '#e2e2e2',
        primary: '#b5b5b5',
        primaryForeground: '#373737',
        secondary: '#4f4f4f',
        secondaryForeground: '#e2e2e2',
        muted: '#484848',
        mutedForeground: '#9a9a9a',
        accent: '#5e5e5e',
        accentForeground: '#e2e2e2',
        destructive: '#ef4444',
        destructiveForeground: '#ffffff',
        border: '#545454',
        input: '#4f4f4f',
        ring: '#b5b5b5',
        sidebar: '#3c3c3c',
        sidebarForeground: '#e2e2e2',
        sidebarPrimary: '#b5b5b5',
        sidebarPrimaryForeground: '#373737',
      },
    },
    fonts: {
      regular: 'Inter-Regular',
      medium: 'Inter-Medium',
      bold: 'Inter-Bold',
      mono: 'FiraCode-Regular',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
    },
    borderRadius: {
      sm: 3,
      md: 4,
      lg: 5,
      xl: 8,
    },
  },
  mono: {
    colors: {
      light: {
        background: '#ffffff',
        foreground: '#242424',
        card: '#ffffff',
        cardForeground: '#242424',
        primary: '#8e8e8e',
        primaryForeground: '#fafafa',
        secondary: '#f7f7f7',
        secondaryForeground: '#343434',
        muted: '#f7f7f7',
        mutedForeground: '#8c8c8c',
        accent: '#f7f7f7',
        accentForeground: '#343434',
        destructive: '#dc2626',
        destructiveForeground: '#f7f7f7',
        border: '#ebebeb',
        input: '#ebebeb',
        ring: '#b6b6b6',
        sidebar: '#fafafa',
        sidebarForeground: '#242424',
        sidebarPrimary: '#343434',
        sidebarPrimaryForeground: '#fafafa',
      },
      dark: {
        background: '#242424',
        foreground: '#fafafa',
        card: '#363636',
        cardForeground: '#fafafa',
        primary: '#8e8e8e',
        primaryForeground: '#fafafa',
        secondary: '#434343',
        secondaryForeground: '#fafafa',
        muted: '#434343',
        mutedForeground: '#b6b6b6',
        accent: '#5e5e5e',
        accentForeground: '#fafafa',
        destructive: '#ef4444',
        destructiveForeground: '#434343',
        border: '#575757',
        input: '#707070',
        ring: '#8e8e8e',
        sidebar: '#343434',
        sidebarForeground: '#fafafa',
        sidebarPrimary: '#fafafa',
        sidebarPrimaryForeground: '#343434',
      },
    },
    fonts: {
      regular: 'GeistMono-Regular',
      medium: 'GeistMono-Regular',
      bold: 'GeistMono-Regular',
      mono: 'GeistMono-Regular',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
    },
    borderRadius: {
      sm: 0,
      md: 0,
      lg: 0,
      xl: 0,
    },
  },
};