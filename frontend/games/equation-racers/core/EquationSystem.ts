import {
  ASTNode,
  VariableResolver,
  FunctionImplementation,
  EquationContext,
  ValidationResult,
  GraphPoint
} from "../types/EquationTypes";

interface Token {
  type: "Number" | "Identifier" | "Operator" | "Delimiter";
  value: string;
  position: number;
}

export class VariableRegistry {
  private registry = new Map<string, VariableResolver>();

  public registerVariable(name: string, resolver: VariableResolver): void {
    this.registry.set(name, resolver);
  }

  public has(name: string): boolean {
    return this.registry.has(name);
  }

  public resolve(name: string, context: any): number {
    const resolver = this.registry.get(name);
    if (!resolver) throw new Error(`Unknown variable: ${name}`);
    return resolver(context);
  }

  public getAllowedNames(): string[] {
    return Array.from(this.registry.keys());
  }
}

export class FunctionRegistry {
  private registry = new Map<string, FunctionImplementation>();

  public registerFunction(name: string, implementation: FunctionImplementation): void {
    this.registry.set(name, implementation);
  }

  public has(name: string): boolean {
    return this.registry.has(name);
  }

  public execute(name: string, args: number[]): number {
    const impl = this.registry.get(name);
    if (!impl) throw new Error(`Unknown function: ${name}`);
    return impl(...args);
  }

  public getAllowedNames(): string[] {
    return Array.from(this.registry.keys());
  }
}

class Parser {
  private tokens: Token[];
  private cursor = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token | undefined {
    return this.tokens[this.cursor];
  }

  private next(): Token | undefined {
    return this.tokens[this.cursor++];
  }

  private consume(expectedValue: string) {
    const token = this.next();
    if (!token || token.value !== expectedValue) {
      const pos = token ? token.position : (this.tokens.length > 0 ? this.tokens[this.tokens.length - 1].position + 1 : 0);
      throw new Error(`Expected '${expectedValue}' but found '${token ? token.value : "EOF"}' at position ${pos}`);
    }
  }

  public parse(): ASTNode {
    if (this.tokens.length === 0) {
      throw new Error("Empty expression");
    }
    const node = this.parseExpression();
    if (this.cursor < this.tokens.length) {
      const token = this.tokens[this.cursor];
      throw new Error(`Unexpected token at end of expression: '${token.value}' at position ${token.position}`);
    }
    return node;
  }

  private parseExpression(): ASTNode {
    let node = this.parseTerm();
    while (this.peek()?.type === "Operator" && (this.peek()?.value === "+" || this.peek()?.value === "-")) {
      const op = this.next()!.value as "+" | "-";
      const right = this.parseTerm();
      node = { type: "BinaryOp", operator: op, left: node, right };
    }
    return node;
  }

  private parseTerm(): ASTNode {
    let node = this.parseFactor();
    while (this.peek()?.type === "Operator" && (this.peek()?.value === "*" || this.peek()?.value === "/")) {
      const op = this.next()!.value as "*" | "/";
      const right = this.parseFactor();
      node = { type: "BinaryOp", operator: op, left: node, right };
    }
    return node;
  }

  private parseFactor(): ASTNode {
    let node = this.parsePrimary();
    while (this.peek()?.type === "Operator" && this.peek()?.value === "^") {
      const op = this.next()!.value as "^";
      const right = this.parsePrimary();
      node = { type: "BinaryOp", operator: op, left: node, right };
    }
    return node;
  }

  private parsePrimary(): ASTNode {
    const token = this.peek();
    if (!token) {
      throw new Error("Unexpected end of expression");
    }

    if (token.type === "Number") {
      this.next();
      const val = parseFloat(token.value);
      if (isNaN(val)) throw new Error(`Invalid number format: ${token.value}`);
      return { type: "Number", value: val };
    }

    if (token.type === "Identifier") {
      this.next();
      if (this.peek()?.type === "Delimiter" && this.peek()?.value === "(") {
        this.next(); // Consume '('
        const args: ASTNode[] = [];
        if (this.peek()?.value !== ")") {
          args.push(this.parseExpression());
          while (this.peek()?.value === ",") {
            this.next(); // Consume ','
            args.push(this.parseExpression());
          }
        }
        this.consume(")");
        return { type: "Function", name: token.value, args };
      } else {
        return { type: "Variable", name: token.value };
      }
    }

    if (token.type === "Delimiter" && token.value === "(") {
      this.next();
      const expr = this.parseExpression();
      this.consume(")");
      return expr;
    }

    if (token.type === "Operator" && (token.value === "-" || token.value === "+")) {
      const op = this.next()!.value;
      const primary = this.parsePrimary();
      if (op === "-") {
        return { type: "BinaryOp", operator: "*", left: { type: "Number", value: -1 }, right: primary };
      }
      return primary;
    }

    throw new Error(`Unexpected expression token: '${token.value}' at position ${token.position}`);
  }
}

export class EquationSystem {
  constructor(
    public variableRegistry: VariableRegistry,
    public functionRegistry: FunctionRegistry
  ) {}

  public static createDefault(): EquationSystem {
    const vReg = new VariableRegistry();
    // Pre-register all standard variables with contextual fallbacks
    vReg.registerVariable("t", (ctx) => ctx.t ?? 0);
    vReg.registerVariable("x", (ctx) => ctx.x ?? 400);
    vReg.registerVariable("y", (ctx) => ctx.y ?? 0);
    vReg.registerVariable("velocity", (ctx) => ctx.velocity ?? 0);
    vReg.registerVariable("speed", (ctx) => ctx.speed ?? 0);
    vReg.registerVariable("heading", (ctx) => ctx.heading ?? 0);
    vReg.registerVariable("distance", (ctx) => ctx.distance ?? 0);
    vReg.registerVariable("score", (ctx) => ctx.score ?? 0);
    vReg.registerVariable("coin_x", (ctx) => ctx.coin_x ?? 400);
    vReg.registerVariable("coin_y", (ctx) => ctx.coin_y ?? 0);
    vReg.registerVariable("coin_distance", (ctx) => ctx.coin_distance ?? 9999);
    vReg.registerVariable("obs_x", (ctx) => ctx.obs_x ?? 400);
    vReg.registerVariable("obs_y", (ctx) => ctx.obs_y ?? -1000);
    vReg.registerVariable("obs_distance", (ctx) => ctx.obs_distance ?? 9999);
    vReg.registerVariable("track_center_x", (ctx) => ctx.track_center_x ?? 400);
    vReg.registerVariable("track_curvature", (ctx) => ctx.track_curvature ?? 0);
    vReg.registerVariable("future_curvature", (ctx) => ctx.future_curvature ?? 0);
    vReg.registerVariable("track_width", (ctx) => ctx.track_width ?? 300);
    vReg.registerVariable("distance_to_finish", (ctx) => ctx.distance_to_finish ?? 9999);
    vReg.registerVariable("coin_count", (ctx) => ctx.coin_count ?? 0);
    vReg.registerVariable("obstacle_count", (ctx) => ctx.obstacle_count ?? 0);

    const fReg = new FunctionRegistry();
    fReg.registerFunction("sin", (x) => Math.sin(x));
    fReg.registerFunction("cos", (x) => Math.cos(x));
    fReg.registerFunction("abs", (x) => Math.abs(x));
    fReg.registerFunction("min", (x, y) => Math.min(x, y));
    fReg.registerFunction("max", (x, y) => Math.max(x, y));

    return new EquationSystem(vReg, fReg);
  }

  public tokenize(expr: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    while (i < expr.length) {
      const char = expr[i];
      if (/\s/.test(char)) {
        i++;
        continue;
      }
      const pos = i;
      if (/[0-9.]/.test(char)) {
        let numStr = "";
        while (i < expr.length && /[0-9.]/.test(expr[i])) {
          numStr += expr[i];
          i++;
        }
        tokens.push({ type: "Number", value: numStr, position: pos });
        continue;
      }
      if (/[a-zA-Z_]/.test(char)) {
        let idStr = "";
        while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
          idStr += expr[i];
          i++;
        }
        tokens.push({ type: "Identifier", value: idStr, position: pos });
        continue;
      }
      if (char === "+" || char === "-" || char === "*" || char === "/" || char === "^") {
        tokens.push({ type: "Operator", value: char, position: pos });
        i++;
        continue;
      }
      if (char === "(" || char === ")" || char === ",") {
        tokens.push({ type: "Delimiter", value: char, position: pos });
        i++;
        continue;
      }
      throw new Error(`Unexpected character: '${char}' at position ${pos}`);
    }
    return tokens;
  }

  public validate(expression: string): ValidationResult {
    try {
      const tokens = this.tokenize(expression);
      const parser = new Parser(tokens);
      const ast = parser.parse();
      
      // Perform validation check on variable and function existences
      this.validateAST(ast);
      
      return { valid: true };
    } catch (e: any) {
      return { valid: false, error: e.message || "Invalid expression" };
    }
  }

  public compile(expression: string): (context: EquationContext) => number {
    const tokens = this.tokenize(expression);
    const parser = new Parser(tokens);
    const ast = parser.parse();
    
    // Ensure all variables and functions in the expression are pre-validated against registries
    this.validateAST(ast);

    return (context: EquationContext) => {
      const val = this.evaluateAST(ast, context);
      if (isNaN(val)) throw new Error("Evaluation resulted in NaN");
      if (!isFinite(val)) throw new Error("Evaluation resulted in infinite value");
      return val;
    };
  }

  public evaluate(compiled: (context: EquationContext) => number, context: EquationContext): number {
    return compiled(context);
  }

  public generateGraphData(expression: string, start: number, end: number, step: number): GraphPoint[] {
    const compiled = this.compile(expression);
    const points: GraphPoint[] = [];
    for (let t = start; t <= end; t += step) {
      try {
        const val = compiled({ t });
        points.push({ x: Math.round(t * 100) / 100, y: val });
      } catch {
        // Skip points that cannot evaluate (e.g. division by zero)
      }
    }
    return points;
  }

  private validateAST(node: ASTNode): void {
    switch (node.type) {
      case "Variable":
        if (!this.variableRegistry.has(node.name)) {
          throw new Error(`Unknown variable: '${node.name}'`);
        }
        break;
      case "Function":
        if (!this.functionRegistry.has(node.name)) {
          throw new Error(`Unknown function: '${node.name}()'`);
        }
        node.args.forEach(arg => this.validateAST(arg));
        break;
      case "BinaryOp":
        this.validateAST(node.left);
        this.validateAST(node.right);
        break;
    }
  }

  private evaluateAST(node: ASTNode, context: EquationContext): number {
    switch (node.type) {
      case "Number":
        return node.value;
      case "Variable":
        return this.variableRegistry.resolve(node.name, context);
      case "BinaryOp": {
        const left = this.evaluateAST(node.left, context);
        const right = this.evaluateAST(node.right, context);
        switch (node.operator) {
          case "+": return left + right;
          case "-": return left - right;
          case "*": return left * right;
          case "/":
            if (right === 0) throw new Error("Division by zero");
            return left / right;
          case "^": return Math.pow(left, right);
        }
      }
      case "Function": {
        const args = node.args.map(arg => this.evaluateAST(arg, context));
        return this.functionRegistry.execute(node.name, args);
      }
    }
  }

  public getAST(expression: string): ASTNode {
    const tokens = this.tokenize(expression);
    const parser = new Parser(tokens);
    return parser.parse();
  }

  public trace(node: ASTNode, context: EquationContext, variablesUsed: Map<string, number>): { text: string; subbed: string; val: number } {
    switch (node.type) {
      case "Number":
        return { text: node.value.toString(), subbed: node.value.toString(), val: node.value };
      case "Variable": {
        const val = this.variableRegistry.resolve(node.name, context);
        variablesUsed.set(node.name, val);
        return { text: node.name, subbed: val.toFixed(1), val };
      }
      case "BinaryOp": {
        const left = this.trace(node.left, context, variablesUsed);
        const right = this.trace(node.right, context, variablesUsed);
        let val = 0;
        switch (node.operator) {
          case "+": val = left.val + right.val; break;
          case "-": val = left.val - right.val; break;
          case "*": val = left.val * right.val; break;
          case "/": val = right.val === 0 ? 0 : left.val / right.val; break;
          case "^": val = Math.pow(left.val, right.val); break;
        }
        return {
          text: `(${left.text} ${node.operator} ${right.text})`,
          subbed: `(${left.subbed} ${node.operator} ${right.subbed})`,
          val
        };
      }
      case "Function": {
        const args = node.args.map(arg => this.trace(arg, context, variablesUsed));
        const argVals = args.map(a => a.val);
        const val = this.functionRegistry.execute(node.name, argVals);
        const textArgs = args.map(a => a.text).join(", ");
        const subbedArgs = args.map(a => a.subbed).join(", ");
        return {
          text: `${node.name}(${textArgs})`,
          subbed: `${node.name}(${subbedArgs})`,
          val
        };
      }
    }
  }
}
