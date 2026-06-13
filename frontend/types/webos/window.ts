export interface WindowInstance {
  id: string; // Typically matches the Process pid
  pid: string; // Associated process identifier
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
  isMaximized: boolean;
  isFocused: boolean;
  zIndex: number;
}

export interface WindowDimensions {
  width: number;
  height: number;
}

export interface WindowPosition {
  x: number;
  y: number;
}
