export interface EquationContext {
  [key: string]: number;
}

export type ASTNode =
  | { type: "Number"; value: number }
  | { type: "Variable"; name: string }
  | { type: "BinaryOp"; operator: "+" | "-" | "*" | "/" | "^"; left: ASTNode; right: ASTNode }
  | { type: "Function"; name: string; args: ASTNode[] };

export type VariableResolver = (context: any) => number;
export type FunctionImplementation = (...args: number[]) => number;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface GraphPoint {
  x: number;
  y: number;
}
