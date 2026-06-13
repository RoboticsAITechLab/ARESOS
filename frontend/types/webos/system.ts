export type SystemTheme = "light" | "dark" | "midnight" | "aurora";

export interface SystemUser {
  username: string;
  avatarUrl?: string;
  role: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: number;
  read: boolean;
}

export interface SystemSettings {
  theme: SystemTheme;
  wallpaperUrlOrGradient: string;
  volume: number; // 0 to 100
  brightness: number; // 0 to 100
}
