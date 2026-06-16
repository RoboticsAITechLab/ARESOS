import React from "react";
import { FSNode, FSFile, FSDirectory } from "@/types/webos/fs";

export interface ShellContext {
  currentPath: string;
  listDirectory: (path?: string) => { name: string; node: FSNode }[];
  changeDirectory: (path: string) => boolean;
  readFile: (path: string) => FSFile | null;
  writeFile: (path: string, content: string) => boolean;
  createDirectory: (path: string, name: string) => boolean;
  deleteNode: (path: string) => boolean;
  renameNode: (path: string, newName: string) => boolean;

  settings: any;
  updateSettings: (s: any) => void;
  currentUser: any;
  updateUser: (u: any) => void;
  addNotification: (title: string, msg: string, type?: any) => void;
  processes: any[];
  windows: any[];
  terminateApp: (pid: string) => void;
  launchApp: (appId: string, args?: any) => string | null;

  env: Record<string, string>;
  aliases: Record<string, string>;

  // History access
  commandHistory: string[];
  setHistory: React.Dispatch<React.SetStateAction<string[]>>;
  activeProgram: string;
  setActiveProgram: (prog: "none" | "ping" | "top" | "matrix") => void;
  setPingTarget?: (t: string) => void;
  setPingIp?: (ip: string) => void;
}

interface ChainedCommand {
  cmdText: string;
  operator: "&&" | "||" | ";" | "none";
}

interface Redirects {
  stdinFile?: string;
  stdoutFile?: string;
  stdoutAppend?: boolean;
  stderrFile?: string;
  stderrAppend?: boolean;
}

// ----------------------------------------------------------------------
// 1. HELPERS & PATH RESOLUTION
// ----------------------------------------------------------------------

export const resolveLocalPath = (currentPath: string, target: string): string => {
  if (!target) return currentPath;
  if (target.startsWith("/")) {
    return "/" + target.split("/").filter(Boolean).join("/");
  }
  const currentSegments = currentPath.split("/").filter(Boolean);
  const relativeSegments = target.split("/").filter(Boolean);

  for (const segment of relativeSegments) {
    if (segment === ".") {
      continue;
    } else if (segment === "..") {
      currentSegments.pop();
    } else {
      currentSegments.push(segment);
    }
  }
  return "/" + currentSegments.join("/");
};

const getParentPath = (path: string): { parentPath: string; nodeName: string } => {
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return { parentPath: "/", nodeName: "" };
  const nodeName = segments[segments.length - 1];
  const parentPath = "/" + segments.slice(0, -1).join("/");
  return { parentPath, nodeName };
};

// ----------------------------------------------------------------------
// 2. PARSER & TOKENIZER
// ----------------------------------------------------------------------

export type TokenType =
  | "WORD"
  | "STRING"
  | "VARIABLE"
  | "PIPE"
  | "AND"
  | "OR"
  | "SEMICOLON"
  | "REDIRECT_OUT"
  | "REDIRECT_APPEND"
  | "REDIRECT_IN"
  | "REDIRECT_ERR"
  | "REDIRECT_ERR_APPEND"
  | "LPAREN"
  | "RPAREN";

export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
  quote?: "'" | '"';
}

export interface ArgumentToken {
  type: "ARGUMENT";
  parts: Token[];
}

export type ParsedToken = Token | ArgumentToken;

export type ASTNode =
  | { type: "sequence"; left: ASTNode; right: ASTNode }
  | { type: "and"; left: ASTNode; right: ASTNode }
  | { type: "or"; left: ASTNode; right: ASTNode }
  | { type: "pipeline"; stages: ASTNode[] }
  | { type: "subshell"; body: ASTNode }
  | { type: "command"; args: ArgumentToken[]; redirects: RedirectNode[] };

export interface RedirectNode {
  type: "in" | "out" | "append" | "err" | "err_append";
  target: ArgumentToken;
}

export function lex(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const start = i;
    const char = input[i];

    // 1. Skip spaces, except newlines/carriage returns which are SEMICOLON
    if (char === "\n" || char === "\r") {
      if (tokens.length > 0 && tokens[tokens.length - 1].type !== "SEMICOLON") {
        tokens.push({ type: "SEMICOLON", value: ";", start, end: i + 1 });
      }
      i++;
      continue;
    }

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // 2. Operators
    if (input.startsWith("2>>", i)) {
      tokens.push({ type: "REDIRECT_ERR_APPEND", value: "2>>", start, end: i + 3 });
      i += 3;
      continue;
    }
    if (input.startsWith("2>", i)) {
      tokens.push({ type: "REDIRECT_ERR", value: "2>", start, end: i + 2 });
      i += 2;
      continue;
    }
    if (input.startsWith(">>", i)) {
      tokens.push({ type: "REDIRECT_APPEND", value: ">>", start, end: i + 2 });
      i += 2;
      continue;
    }
    if (input.startsWith("&&", i)) {
      tokens.push({ type: "AND", value: "&&", start, end: i + 2 });
      i += 2;
      continue;
    }
    if (input.startsWith("||", i)) {
      tokens.push({ type: "OR", value: "||", start, end: i + 2 });
      i += 2;
      continue;
    }
    if (char === ">") {
      tokens.push({ type: "REDIRECT_OUT", value: ">", start, end: i + 1 });
      i++;
      continue;
    }
    if (char === "<") {
      tokens.push({ type: "REDIRECT_IN", value: "<", start, end: i + 1 });
      i++;
      continue;
    }
    if (char === "|") {
      tokens.push({ type: "PIPE", value: "|", start, end: i + 1 });
      i++;
      continue;
    }
    if (char === ";") {
      tokens.push({ type: "SEMICOLON", value: ";", start, end: i + 1 });
      i++;
      continue;
    }
    if (char === "(") {
      tokens.push({ type: "LPAREN", value: "(", start, end: i + 1 });
      i++;
      continue;
    }
    if (char === ")") {
      tokens.push({ type: "RPAREN", value: ")", start, end: i + 1 });
      i++;
      continue;
    }

    // 3. Single quotes
    if (char === "'") {
      i++; // skip quote
      let val = "";
      while (i < input.length && input[i] !== "'") {
        val += input[i];
        i++;
      }
      if (i < input.length) {
        i++; // skip quote
      }
      tokens.push({ type: "STRING", value: val, start, end: i, quote: "'" });
      continue;
    }

    // 4. Double quotes
    if (char === '"') {
      i++; // skip quote
      let val = "";
      while (i < input.length && input[i] !== '"') {
        if (input[i] === "\\" && i + 1 < input.length) {
          const next = input[i + 1];
          if (['"', '\\', '$', '`'].includes(next)) {
            val += next;
            i += 2;
          } else {
            val += "\\";
            i++;
          }
        } else {
          val += input[i];
          i++;
        }
      }
      if (i < input.length) {
        i++; // skip quote
      }
      tokens.push({ type: "STRING", value: val, start, end: i, quote: '"' });
      continue;
    }

    // 5. Variable
    if (char === "$") {
      const next = input[i + 1];
      if (next && (/[a-zA-Z_]/.test(next) || next === "{")) {
        i++; // skip $
        let varName = "";
        if (input[i] === "{") {
          i++; // skip {
          while (i < input.length && input[i] !== "}") {
            varName += input[i];
            i++;
          }
          if (i < input.length) {
            i++; // skip }
          }
        } else {
          while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
            varName += input[i];
            i++;
          }
        }
        tokens.push({ type: "VARIABLE", value: varName, start, end: i });
        continue;
      }
    }

    // 6. Word
    let val = "";
    while (i < input.length) {
      const c = input[i];
      if (/\s/.test(c)) break;
      if (["&", "|", ";", "(", ")", ">", "<", "'", '"'].includes(c)) break;
      if (c === "$" && i + 1 < input.length && (/[a-zA-Z_]/.test(input[i + 1]) || input[i + 1] === "{")) {
        break;
      }
      if (c === "\\" && i + 1 < input.length) {
        val += input[i + 1];
        i += 2;
      } else {
        val += c;
        i++;
      }
    }
    if (val.length > 0) {
      tokens.push({ type: "WORD", value: val, start, end: i });
    }
  }

  return tokens;
}

export function expandTokensAliases(
  tokens: Token[],
  aliases: Record<string, string>,
  expanding: Set<string> = new Set()
): Token[] {
  let result: Token[] = [];
  let isCommandPosition = true;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (
      token.type === "SEMICOLON" ||
      token.type === "AND" ||
      token.type === "OR" ||
      token.type === "PIPE" ||
      token.type === "LPAREN"
    ) {
      result.push(token);
      isCommandPosition = true;
      continue;
    }

    if (token.type === "RPAREN") {
      result.push(token);
      isCommandPosition = false;
      continue;
    }

    if (
      token.type === "REDIRECT_OUT" ||
      token.type === "REDIRECT_APPEND" ||
      token.type === "REDIRECT_IN" ||
      token.type === "REDIRECT_ERR" ||
      token.type === "REDIRECT_ERR_APPEND"
    ) {
      result.push(token);
      if (i + 1 < tokens.length) {
        result.push(tokens[i + 1]);
        i++;
      }
      continue;
    }

    if (isCommandPosition) {
      if (token.type === "WORD") {
        const aliasKey = token.value.toLowerCase();
        if (aliases[aliasKey] && !expanding.has(aliasKey)) {
          expanding.add(aliasKey);
          const aliasVal = aliases[aliasKey];
          const aliasTokens = lex(aliasVal);
          const expandedAliasTokens = expandTokensAliases(aliasTokens, aliases, expanding);
          expanding.delete(aliasKey);

          if (expandedAliasTokens.length > 0) {
            expandedAliasTokens[0].start = token.start;
            expandedAliasTokens[expandedAliasTokens.length - 1].end = token.end;
          }
          result.push(...expandedAliasTokens);
          isCommandPosition = false;
          continue;
        }
      }
      isCommandPosition = false;
    }

    result.push(token);
  }

  return result;
}

export function groupTokens(tokens: Token[]): ParsedToken[] {
  const result: ParsedToken[] = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];
    if (token.type === "WORD" || token.type === "STRING" || token.type === "VARIABLE") {
      const parts: Token[] = [token];
      let j = i + 1;
      while (j < tokens.length) {
        const nextToken = tokens[j];
        if (
          (nextToken.type === "WORD" || nextToken.type === "STRING" || nextToken.type === "VARIABLE") &&
          nextToken.start === tokens[j - 1].end
        ) {
          parts.push(nextToken);
          j++;
        } else {
          break;
        }
      }
      result.push({ type: "ARGUMENT", parts });
      i = j;
    } else {
      result.push(token);
      i++;
    }
  }

  return result;
}

export class Parser {
  private tokens: ParsedToken[];
  private pos = 0;

  constructor(tokens: ParsedToken[]) {
    this.tokens = tokens;
  }

  private peek(): ParsedToken | null {
    if (this.pos < this.tokens.length) {
      return this.tokens[this.pos];
    }
    return null;
  }

  private next(): ParsedToken | null {
    if (this.pos < this.tokens.length) {
      return this.tokens[this.pos++];
    }
    return null;
  }

  private match(type: TokenType): ParsedToken | null {
    const token = this.peek();
    if (token && token.type === type) {
      this.pos++;
      return token;
    }
    return null;
  }

  public parse(): ASTNode {
    return this.parseSequence();
  }

  private parseSequence(): ASTNode {
    let node = this.parseAndOr();
    while (true) {
      if (this.match("SEMICOLON")) {
        const right = this.peek();
        if (!right || right.type === "RPAREN") {
          continue;
        }
        const rightNode = this.parseAndOr();
        node = { type: "sequence", left: node, right: rightNode };
      } else {
        break;
      }
    }
    return node;
  }

  private parseAndOr(): ASTNode {
    let node = this.parsePipeline();
    while (true) {
      if (this.match("AND")) {
        const rightNode = this.parsePipeline();
        node = { type: "and", left: node, right: rightNode };
      } else if (this.match("OR")) {
        const rightNode = this.parsePipeline();
        node = { type: "or", left: node, right: rightNode };
      } else {
        break;
      }
    }
    return node;
  }

  private parsePipeline(): ASTNode {
    let node = this.parsePrimary();
    const stages: ASTNode[] = [node];
    while (this.match("PIPE")) {
      stages.push(this.parsePrimary());
    }
    if (stages.length > 1) {
      return { type: "pipeline", stages };
    }
    return node;
  }

  private parsePrimary(): ASTNode {
    if (this.match("LPAREN")) {
      const body = this.parseSequence();
      if (!this.match("RPAREN")) {
        throw new Error("Syntax error: mismatched parentheses");
      }
      return { type: "subshell", body };
    }
    return this.parseSimpleCommand();
  }

  private parseSimpleCommand(): ASTNode {
    const args: ArgumentToken[] = [];
    const redirects: RedirectNode[] = [];

    while (true) {
      const token = this.peek();
      if (!token) break;

      if (token.type === "ARGUMENT") {
        args.push(token);
        this.next();
      } else if (
        token.type === "REDIRECT_OUT" ||
        token.type === "REDIRECT_APPEND" ||
        token.type === "REDIRECT_IN" ||
        token.type === "REDIRECT_ERR" ||
        token.type === "REDIRECT_ERR_APPEND"
      ) {
        this.next();
        const targetToken = this.peek();
        if (!targetToken || targetToken.type !== "ARGUMENT") {
          throw new Error(`Syntax error: missing redirection target after ${token.value}`);
        }
        this.next();

        let type: RedirectNode["type"] = "out";
        if (token.type === "REDIRECT_OUT") type = "out";
        else if (token.type === "REDIRECT_APPEND") type = "append";
        else if (token.type === "REDIRECT_IN") type = "in";
        else if (token.type === "REDIRECT_ERR") type = "err";
        else if (token.type === "REDIRECT_ERR_APPEND") type = "err_append";

        redirects.push({ type, target: targetToken });
      } else {
        break;
      }
    }

    if (args.length === 0 && redirects.length === 0) {
      throw new Error("Syntax error: empty command");
    }

    return { type: "command", args, redirects };
  }
}

export function expandVariablesInString(val: string, env: Record<string, string>): string {
  return val.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)|(\$\{([a-zA-Z_][a-zA-Z0-9_]*)\})/g, (match, p1, p2, p3) => {
    const varName = p1 || p3;
    return env[varName] !== undefined ? env[varName] : "";
  });
}

export async function evaluateSubstitutions(
  text: string,
  context: ShellContext,
  localPath: string
): Promise<string> {
  let result = "";
  let i = 0;

  while (i < text.length) {
    if (text.startsWith("$(", i)) {
      let depth = 1;
      let subCmd = "";
      let j = i + 2;
      while (j < text.length) {
        const char = text[j];
        if (char === "(") depth++;
        else if (char === ")") {
          depth--;
          if (depth === 0) break;
        }
        subCmd += char;
        j++;
      }
      i = j + 1;
      const subRes = await executeSubCommand(subCmd, context, localPath);
      result += subRes;
      continue;
    }

    if (text[i] === "$") {
      const next = text[i + 1];
      if (next && (/[a-zA-Z_]/.test(next) || next === "{")) {
        i++;
        let varName = "";
        if (text[i] === "{") {
          i++;
          while (i < text.length && text[i] !== "}") {
            varName += text[i];
            i++;
          }
          if (i < text.length) {
            i++;
          }
        } else {
          while (i < text.length && /[a-zA-Z0-9_]/.test(text[i])) {
            varName += text[i];
            i++;
          }
        }
        const val = context.env[varName] !== undefined ? context.env[varName] : "";
        result += val;
        continue;
      }
    }

    result += text[i];
    i++;
  }

  return result;
}

export async function expandWord(word: ArgumentToken, context: ShellContext, localPath: string): Promise<string> {
  let result = "";
  for (const part of word.parts) {
    if (part.type === "VARIABLE") {
      result += context.env[part.value] !== undefined ? context.env[part.value] : "";
    } else if (part.type === "STRING" && part.quote === "'") {
      result += part.value;
    } else {
      result += await evaluateSubstitutions(part.value, context, localPath);
    }
  }
  return result;
}

export async function executeSubCommand(
  subCmd: string,
  context: ShellContext,
  localPath: string
): Promise<string> {
  const silentHistory: string[] = [];
  const silentContext = {
    ...context,
    commandHistory: silentHistory,
    setHistory: () => {},
  };

  const result = await executeSingleCommand(subCmd, silentContext, localPath, []);
  return result.stdout.join(" ").trim();
}

// ----------------------------------------------------------------------
// 4. EXTENDED COMMAND ENGINE
// ----------------------------------------------------------------------

// ----------------------------------------------------------------------
// 4. EXTENDED COMMAND ENGINE & REGISTRY
// ----------------------------------------------------------------------

const AVAILABLE_PACKAGES: Record<string, { desc: string; version: string }> = {
  neofetch: { desc: "Aesthetic system info script tool", version: "2.1.0" },
  cmatrix: { desc: "Sci-fi green matrix code fall simulator", version: "1.4.2" },
  htop: { desc: "Interactive system metrics and task monitor", version: "3.2.0" },
  curl: { desc: "Command line data transfer tool using url endpoints", version: "8.4.0" },
  python: { desc: "Python interpreter runtime shell environment", version: "3.11.5" },
  node: { desc: "NodeJS runtime execution engine suite", version: "20.9.0" },
  gcc: { desc: "GNU C Compiler toolkit environment", version: "13.2.0" }
};

interface CommandHandler {
  desc: string;
  run: (
    args: string[],
    context: ShellContext,
    localPath: string,
    stdin: string[]
  ) => Promise<{ success: boolean; newPath: string; stdout: string[]; stderr: string[] }> | { success: boolean; newPath: string; stdout: string[]; stderr: string[] };
}

export const COMMAND_REGISTRY: Record<string, CommandHandler> = {
  help: {
    desc: "Display list of available shell commands",
    run: (args, context, localPath) => {
      const list = [
        "================ ARESOS ADVANCED COMMAND ENVIRONMENT v2.0 ================",
        "",
        "AVAILABLE COMMANDS:"
      ];
      Object.entries(COMMAND_REGISTRY)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([name, handler]) => {
          list.push(`  ${name.padEnd(15)} - ${handler.desc}`);
        });
      list.push("==========================================================================");
      return { success: true, newPath: localPath, stdout: list, stderr: [] };
    }
  },

  ls: {
    desc: "List directory contents",
    run: (args, context, localPath) => {
      const showAll = args.includes("-a") || args.includes("-la");
      const pathArg = args.find((a) => !a.startsWith("-") && a !== "ls");
      const target = pathArg ? resolveLocalPath(localPath, pathArg) : localPath;
      try {
        const nodes = context.listDirectory(target);
        const stdout = nodes.length === 0 ? ["(empty directory)"] : nodes
          .filter((n) => showAll || !n.name.startsWith("."))
          .map((n) => `${n.node.type === "directory" ? "📁" : "📄"}  ${n.name}`);
        return { success: true, newPath: localPath, stdout, stderr: [] };
      } catch {
        return { success: false, newPath: localPath, stdout: [], stderr: [`ls: failed to list: ${target}`] };
      }
    }
  },

  cd: {
    desc: "Change current directory",
    run: (args, context, localPath) => {
      if (!args[1]) {
        return { success: false, newPath: localPath, stdout: [], stderr: ["cd: missing destination argument."] };
      }
      const target = resolveLocalPath(localPath, args[1]);
      const ok = context.changeDirectory(target);
      if (ok) {
        return { success: true, newPath: target, stdout: [], stderr: [] };
      }
      return { success: false, newPath: localPath, stdout: [], stderr: [`cd: no such directory: ${args[1]}`] };
    }
  },

  pwd: {
    desc: "Print working directory",
    run: (args, context, localPath) => {
      return { success: true, newPath: localPath, stdout: [localPath], stderr: [] };
    }
  },

  cat: {
    desc: "Concatenate and display files",
    run: (args, context, localPath, stdin) => {
      const fileArg = args.find((a) => a !== "cat" && !a.startsWith("-"));
      if (!fileArg || fileArg === "-") {
        return { success: true, newPath: localPath, stdout: stdin, stderr: [] };
      }
      const target = resolveLocalPath(localPath, fileArg);
      const file = context.readFile(target);
      if (file) {
        return { success: true, newPath: localPath, stdout: file.content.split("\n"), stderr: [] };
      }
      return { success: false, newPath: localPath, stdout: [], stderr: [`cat: file not found: ${fileArg}`] };
    }
  },

  touch: {
    desc: "Create empty file",
    run: (args, context, localPath) => {
      if (!args[1]) {
        return { success: false, newPath: localPath, stdout: [], stderr: ["touch: missing filename argument."] };
      }
      const target = resolveLocalPath(localPath, args[1]);
      const ok = context.writeFile(target, "");
      if (ok) {
        return { success: true, newPath: localPath, stdout: [`Created empty file '${args[1]}'`], stderr: [] };
      }
      return { success: false, newPath: localPath, stdout: [], stderr: [`touch: failed to create: ${args[1]}`] };
    }
  },

  write: {
    desc: "Write text content to file",
    run: (args, context, localPath) => {
      if (!args[1]) {
        return { success: false, newPath: localPath, stdout: [], stderr: ["write: missing filename."] };
      }
      if (args.length < 3) {
        return { success: false, newPath: localPath, stdout: [], stderr: ["write: missing content. Usage: write <filename> <text content>"] };
      }
      const content = args.slice(2).join(" ");
      const target = resolveLocalPath(localPath, args[1]);
      const ok = context.writeFile(target, content);
      if (ok) {
        return { success: true, newPath: localPath, stdout: [`Written content to file '${args[1]}'`], stderr: [] };
      }
      return { success: false, newPath: localPath, stdout: [], stderr: [`write: failed to write to file: ${args[1]}`] };
    }
  },

  mkdir: {
    desc: "Create new directory",
    run: (args, context, localPath) => {
      if (!args[1]) {
        return { success: false, newPath: localPath, stdout: [], stderr: ["mkdir: missing folder name."] };
      }
      const ok = context.createDirectory(localPath, args[1]);
      if (ok) {
        return { success: true, newPath: localPath, stdout: [`Created directory '${args[1]}'`], stderr: [] };
      }
      return { success: false, newPath: localPath, stdout: [], stderr: ["mkdir: folder already exists or path invalid."] };
    }
  },

  rm: {
    desc: "Remove file or directory",
    run: (args, context, localPath) => {
      if (!args[1]) {
        return { success: false, newPath: localPath, stdout: [], stderr: ["rm: missing target name."] };
      }
      const target = resolveLocalPath(localPath, args[1]);
      const ok = context.deleteNode(target);
      if (ok) {
        return { success: true, newPath: localPath, stdout: [`Removed '${args[1]}'`], stderr: [] };
      }
      return { success: false, newPath: localPath, stdout: [], stderr: [`rm: no such file or directory: ${args[1]}`] };
    }
  },

  echo: {
    desc: "Display text line",
    run: (args, context, localPath) => {
      return { success: true, newPath: localPath, stdout: [args.slice(1).join(" ")], stderr: [] };
    }
  },

  clear: {
    desc: "Clear command history logs",
    run: (args, context, localPath) => {
      context.setHistory([]);
      return { success: true, newPath: localPath, stdout: [], stderr: [] };
    }
  },

  theme: {
    desc: "Set UI desktop theme",
    run: (args, context, localPath) => {
      const reqTheme = args[1];
      const validThemes = ["light", "dark", "midnight", "aurora", "matrix", "dracula", "nord", "tokyo-night"];
      if (validThemes.includes(reqTheme)) {
        context.updateSettings({ theme: reqTheme });
        context.addNotification("System Command", `Theme set to ${reqTheme}`, "info");
        return { success: true, newPath: localPath, stdout: [`System theme updated to '${reqTheme}'`], stderr: [] };
      }
      return { success: false, newPath: localPath, stdout: [], stderr: [`theme: invalid theme. Select from: ${validThemes.join(", ")}`] };
    }
  },

  neofetch: {
    desc: "Aesthetic live system information and telemetry diagnostics tool",
    run: async (args, context, localPath) => {
      const showSources = args.includes("--transparency") || args.includes("-t");

      const formatVal = (label: string, value: string, source: string) => {
        return showSources ? `${label}: ${value} (source: ${source})` : `${label}: ${value}`;
      };

      // 1. OS Detection (Source: navigator.userAgent / navigator.userAgentData)
      let os = "unknown";
      if (typeof navigator !== "undefined") {
        const ua = navigator.userAgent;
        const uad = (navigator as any).userAgentData;
        if (uad) {
          try {
            if (uad.getHighEntropyValues) {
              const values = await uad.getHighEntropyValues(["platformVersion"]);
              if (uad.platform === "Windows") {
                const majorVersion = parseInt(values.platformVersion.split(".")[0]);
                if (majorVersion >= 13) {
                  os = "Windows 11";
                } else {
                  os = "Windows 10";
                }
              } else {
                os = uad.platform || "unknown";
              }
            } else if (uad.platform) {
              os = uad.platform;
            }
          } catch (e) {
            os = "unknown";
          }
        }
        if (os === "unknown") {
          if (/windows nt 10\.0/i.test(ua)) {
            os = "Windows 10/11";
          } else if (/windows nt 6\.3/i.test(ua)) {
            os = "Windows 8.1";
          } else if (/windows nt 6\.2/i.test(ua)) {
            os = "Windows 8";
          } else if (/windows nt 6\.1/i.test(ua)) {
            os = "Windows 7";
          } else if (/macintosh|mac os x/i.test(ua)) {
            os = "macOS";
          } else if (/linux/i.test(ua)) {
            os = "Linux";
          } else if (/android/i.test(ua)) {
            os = "Android";
          } else if (/iphone|ipad|ipod/i.test(ua)) {
            os = "iOS";
          }
        }
      }

      // 2. Browser Detection (Source: navigator.userAgent / navigator.userAgentData)
      let browser = "unknown";
      if (typeof navigator !== "undefined") {
        const uad = (navigator as any).userAgentData;
        if (uad && uad.brands) {
          const brand = uad.brands.find((b: any) => !/not/i.test(b.brand) && b.brand !== "Chromium");
          if (brand) {
            browser = `${brand.brand} ${brand.version}`;
          }
        }
        if (browser === "unknown") {
          const ua = navigator.userAgent;
          let M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
          let tem;
          if (/trident/i.test(M[1])) {
            tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
            browser = "IE " + (tem[1] || "");
          } else if (M[1] === "Chrome") {
            tem = ua.match(/\b(OPR|Edge|Edg)\/(\d+)/);
            if (tem != null) {
              browser = tem.slice(1).join(" ").replace("Edg", "Edge");
            } else {
              browser = "Chrome " + M[2];
            }
          } else {
            M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, "-?"];
            if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);
            browser = M.join(" ");
          }
        }
      }

      // 3. CPU Threads (Source: navigator.hardwareConcurrency)
      let cpuCores = "unavailable";
      if (typeof navigator !== "undefined" && navigator.hardwareConcurrency !== undefined) {
        cpuCores = `${navigator.hardwareConcurrency}`;
      } else if (typeof navigator !== "undefined") {
        cpuCores = "restricted by browser";
      }

      // 4. Memory Telemetry (Source: performance.memory / navigator.deviceMemory)
      let memoryUsed = "unavailable";
      let memoryTotal = "unavailable";
      let heapUsage = "unavailable";
      if (typeof performance !== "undefined" && (performance as any).memory) {
        const mem = (performance as any).memory;
        memoryUsed = `${Math.round(mem.usedJSHeapSize / (1024 * 1024))} MB`;
        memoryTotal = `${Math.round(mem.jsHeapSizeLimit / (1024 * 1024))} MB`;
        heapUsage = `${Math.round(mem.totalJSHeapSize / (1024 * 1024))} MB`;
      } else if (typeof navigator !== "undefined" && (navigator as any).deviceMemory) {
        memoryTotal = `${(navigator as any).deviceMemory * 1024} MB`;
      }

      // 5. Storage Telemetry (Source: navigator.storage.estimate())
      let storageUsed = "unavailable";
      let storageQuota = "unavailable";
      if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
        try {
          const estimate = await navigator.storage.estimate();
          if (estimate.usage !== undefined) {
            const usageGb = estimate.usage / (1024 * 1024 * 1024);
            storageUsed = usageGb < 0.1 ? `${(estimate.usage / (1024 * 1024)).toFixed(1)} MB` : `${usageGb.toFixed(1)} GB`;
          }
          if (estimate.quota !== undefined) {
            storageQuota = `${(estimate.quota / (1024 * 1024 * 1024)).toFixed(1)} GB`;
          }
        } catch (e) {
          storageUsed = "restricted by browser";
          storageQuota = "restricted by browser";
        }
      }

      // 6. Screen Telemetry (Source: window.screen)
      let resolution = "unavailable";
      let pixelRatio = "unavailable";
      if (typeof window !== "undefined" && window.screen) {
        resolution = `${window.screen.width}x${window.screen.height}`;
        pixelRatio = `${window.devicePixelRatio}`;
      }

      // 7. Timezone & Language Telemetry (Source: Intl / navigator.language)
      let timezone = "unknown";
      if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
        try {
          timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch (e) {}
      }
      const language = typeof navigator !== "undefined" ? navigator.language : "unknown";

      // 8. Network Telemetry (Source: navigator.connection)
      let connectionType = "unavailable";
      let rtt = "unavailable";
      if (typeof navigator !== "undefined") {
        const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        if (conn) {
          connectionType = conn.effectiveType || "unknown";
          rtt = conn.rtt !== undefined ? `${conn.rtt}ms` : "unavailable";
        }
      }

      // 9. Session Uptime Telemetry (Source: performance.now())
      let uptimeStr = "unavailable";
      if (typeof performance !== "undefined" && performance.now) {
        const uptimeMs = performance.now();
        const totalSecs = Math.floor(uptimeMs / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        uptimeStr = `${mins}m ${secs}s`;
      }

      const logo = [
        "    /\\_/\\          ",
        "   ( o.o )         ",
        "    > ^ <          ",
        "   /     \\         ",
        "  (       )        ",
        "   `-^-^-'         ",
      ];

      const lines = [
        formatVal("OS", os, "navigator.userAgent / navigator.userAgentData"),
        formatVal("Browser", browser, "navigator.userAgent / navigator.userAgentData"),
        formatVal("CPU Threads", cpuCores, "navigator.hardwareConcurrency"),
        formatVal("Memory Used", memoryUsed, "performance.memory.usedJSHeapSize"),
        formatVal("Memory Total", memoryTotal, "performance.memory.jsHeapSizeLimit / navigator.deviceMemory"),
        formatVal("Heap Usage", heapUsage, "performance.memory.totalJSHeapSize"),
        formatVal("Storage Used", storageUsed, "navigator.storage.estimate()"),
        formatVal("Storage Quota", storageQuota, "navigator.storage.estimate()"),
        formatVal("Resolution", resolution, "window.screen"),
        formatVal("Pixel Ratio", pixelRatio, "window.devicePixelRatio"),
        formatVal("Timezone", timezone, "Intl.DateTimeFormat().resolvedOptions().timeZone"),
        formatVal("Language", language, "navigator.language"),
        formatVal("Connection", connectionType, "navigator.connection"),
        formatVal("RTT", rtt, "navigator.connection.rtt"),
        formatVal("Uptime", uptimeStr, "performance.now()"),
      ];

      const stdout: string[] = [];
      const maxLines = Math.max(logo.length, lines.length);
      for (let i = 0; i < maxLines; i++) {
        const logoPart = logo[i] || "                   ";
        const linePart = lines[i] || "";
        stdout.push(logoPart + linePart);
      }

      return { success: true, newPath: localPath, stdout, stderr: [] };
    }
  },

  cp: {
    desc: "Copy file recursively",
    run: (args, context, localPath) => {
      if (args.length < 3) {
        return { success: false, newPath: localPath, stdout: [], stderr: ["cp: missing source/destination arguments. Usage: cp <src> <dest>"] };
      }
      const src = resolveLocalPath(localPath, args[1]);
      const dest = resolveLocalPath(localPath, args[2]);
      const srcFile = context.readFile(src);
      if (srcFile) {
        const ok = context.writeFile(dest, srcFile.content);
        if (ok) {
          return { success: true, newPath: localPath, stdout: [`Copied file '${args[1]}' to '${args[2]}'`], stderr: [] };
        }
        return { success: false, newPath: localPath, stdout: [], stderr: [`cp: failed to write to destination '${args[2]}'`] };
      } else {
        try {
          const list = context.listDirectory(src);
          if (list) {
            const getParentPath = (path: string): { parentPath: string; nodeName: string } => {
              const segments = path.split("/").filter(Boolean);
              if (segments.length === 0) return { parentPath: "/", nodeName: "" };
              const nodeName = segments[segments.length - 1];
              const parentPath = "/" + segments.slice(0, -1).join("/");
              return { parentPath, nodeName };
            };
            const parentDest = getParentPath(dest);
            context.createDirectory(parentDest.parentPath, parentDest.nodeName);
            list.forEach((item) => {
              const itemSrc = src + "/" + item.name;
              const itemDest = dest + "/" + item.name;
              if (item.node.type === "file") {
                const data = context.readFile(itemSrc);
                if (data) context.writeFile(itemDest, data.content);
              }
            });
            return { success: true, newPath: localPath, stdout: [`Copied directory '${args[1]}' recursively to '${args[2]}'`], stderr: [] };
          }
        } catch {}
      }
      return { success: false, newPath: localPath, stdout: [], stderr: [`cp: source node '${args[1]}' not found.`] };
    }
  },

  mv: {
    desc: "Move/Rename file or directory",
    run: (args, context, localPath) => {
      if (args.length < 3) {
        return { success: false, newPath: localPath, stdout: [], stderr: ["mv: missing source/destination arguments. Usage: mv <src> <dest>"] };
      }
      const src = resolveLocalPath(localPath, args[1]);
      const dest = resolveLocalPath(localPath, args[2]);
      const srcFile = context.readFile(src);
      if (srcFile) {
        const ok = context.writeFile(dest, srcFile.content);
        if (ok) {
          context.deleteNode(src);
          return { success: true, newPath: localPath, stdout: [`Moved '${args[1]}' to '${args[2]}'`], stderr: [] };
        }
        return { success: false, newPath: localPath, stdout: [], stderr: [`mv: failed to write to destination '${args[2]}'`] };
      } else {
        const ok = context.renameNode(src, args[2]);
        if (ok) {
          return { success: true, newPath: localPath, stdout: [`Renamed directory '${args[1]}' to '${args[2]}'`], stderr: [] };
        }
      }
      return { success: false, newPath: localPath, stdout: [], stderr: [`mv: failed to move path node '${args[1]}'`] };
    }
  },

  find: {
    desc: "Recursive find objects matching pattern",
    run: (args, context, localPath) => {
      if (args.length < 2) {
        return { success: false, newPath: localPath, stdout: [], stderr: ["find: missing path parameter. Usage: find <path> [-name pattern]"] };
      }
      const startPath = resolveLocalPath(localPath, args[1]);
      const nameIdx = args.indexOf("-name");
      const pattern = nameIdx !== -1 ? args[nameIdx + 1] : "";
      const cleanPattern = pattern ? pattern.replace(/^["']|["']$/g, "").replace(/\*/g, "") : "";
      const matches: string[] = [];
      const traverse = (path: string) => {
        try {
          const list = context.listDirectory(path);
          list.forEach((item) => {
            const fullPath = path === "/" ? `/${item.name}` : `${path}/${item.name}`;
            if (!cleanPattern || item.name.toLowerCase().includes(cleanPattern.toLowerCase())) {
              matches.push(fullPath);
            }
            if (item.node.type === "directory") {
              traverse(fullPath);
            }
          });
        } catch (e) {}
      };
      traverse(startPath);
      return { success: true, newPath: localPath, stdout: matches.length > 0 ? matches : ["No matching items found."], stderr: [] };
    }
  },

  tree: {
    desc: "ASCII visual directory structure map",
    run: (args, context, localPath) => {
      const startPath = args[1] ? resolveLocalPath(localPath, args[1]) : localPath;
      const lines: string[] = [startPath];
      const traverse = (path: string, prefix: string) => {
        try {
          const list = context.listDirectory(path);
          list.forEach((item, idx) => {
            const isLast = idx === list.length - 1;
            const marker = isLast ? "└── " : "├── ";
            lines.push(`${prefix}${marker}${item.node.type === "directory" ? "📁 " : "📄 "}${item.name}`);
            if (item.node.type === "directory") {
              const nextFullPath = path === "/" ? `/${item.name}` : `${path}/${item.name}`;
              traverse(nextFullPath, prefix + (isLast ? "    " : "│   "));
            }
          });
        } catch {}
      };
      traverse(startPath, "");
      return { success: true, newPath: localPath, stdout: lines, stderr: [] };
    }
  },

  grep: {
    desc: "Filter input lines based on Regex matches",
    run: (args, context, localPath, stdin) => {
      const pat = args[1] ? args[1].replace(/^["']|["']$/g, "") : "";
      const fileArg = args.find((a, i) => i > 1 && !a.startsWith("-"));
      let linesToFilter = stdin;
      if (fileArg) {
        const fileNode = context.readFile(resolveLocalPath(localPath, fileArg));
        if (fileNode) {
          linesToFilter = fileNode.content.split("\n");
        } else {
          return { success: false, newPath: localPath, stdout: [], stderr: [`grep: file not found: ${fileArg}`] };
        }
      }
      if (!pat) {
        return { success: true, newPath: localPath, stdout: linesToFilter, stderr: [] };
      } else {
        const regex = new RegExp(pat, "i");
        return { success: true, newPath: localPath, stdout: linesToFilter.filter((l) => regex.test(l)), stderr: [] };
      }
    }
  },

  head: {
    desc: "Preview top line slots of files",
    run: (args, context, localPath, stdin) => {
      let limit = 10;
      const nIdx = args.indexOf("-n");
      if (nIdx !== -1 && args[nIdx + 1]) {
        limit = parseInt(args[nIdx + 1]) || 10;
      }
      const fileArg = args.find((a, i) => i > 0 && a !== "-n" && a !== args[nIdx + 1] && a !== "head");
      let lines = stdin;
      if (fileArg) {
        const fileNode = context.readFile(resolveLocalPath(localPath, fileArg));
        if (fileNode) {
          lines = fileNode.content.split("\n");
        } else {
          return { success: false, newPath: localPath, stdout: [], stderr: [`head: file not found: ${fileArg}`] };
        }
      }
      return { success: true, newPath: localPath, stdout: lines.slice(0, limit), stderr: [] };
 1   }
  },

  tail: {
    desc: "Preview bottom line slots of files",
    run: (args, context, localPath, stdin) => {
      let limit = 10;
      const nIdx = args.indexOf("-n");
      if (nIdx !== -1 && args[nIdx + 1]) {
        limit = parseInt(args[nIdx + 1]) || 10;
      }
      const fileArg = args.find((a, i) => i > 0 && a !== "-n" && a !== args[nIdx + 1] && a !== "tail");
      let lines = stdin;
      if (fileArg) {
        const fileNode = context.readFile(resolveLocalPath(localPath, fileArg));
        if (fileNode) {
          lines = fileNode.content.split("\n");
        } else {
          return { success: false, newPath: localPath, stdout: [], stderr: [`tail: file not found: ${fileArg}`] };
        }
      }
      return { success: true, newPath: localPath, stdout: lines.slice(-limit), stderr: [] };
    }
  },

  wc: {
    desc: "Word, line, and byte counter",
    run: (args, context, localPath, stdin) => {
      const fileArg = args.find((a) => a !== "wc" && !a.startsWith("-"));
      let text = stdin.join("\n");
      if (fileArg) {
        const fileNode = context.readFile(resolveLocalPath(localPath, fileArg));
        if (fileNode) {
          text = fileNode.content;
        } else {
          return { success: false, newPath: localPath, stdout: [], stderr: [`wc: file not found: ${fileArg}`] };
        }
      }
      const lineCount = text ? text.split("\n").length : 0;
      const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
      const byteCount = text ? text.length : 0;
      if (args.includes("-l")) {
        return { success: true, newPath: localPath, stdout: [`${lineCount}`], stderr: [] };
      } else if (args.includes("-w")) {
        return { success: true, newPath: localPath, stdout: [`${wordCount}`], stderr: [] };
      } else if (args.includes("-c")) {
        return { success: true, newPath: localPath, stdout: [`${byteCount}`], stderr: [] };
      } else {
        return { success: true, newPath: localPath, stdout: [`Lines: ${lineCount} | Words: ${wordCount} | Bytes: ${byteCount} ${fileArg || ""}`], stderr: [] };
      }
    }
  },

  chmod: {
    desc: "Modify simulated permissions",
    run: (args, context, localPath) => {
      if (args.length < 3) {
        return { success: false, newPath: localPath, stdout: [], stderr: ["chmod: missing arguments. Usage: chmod <perms> <file>"] };
      }
      const target = resolveLocalPath(localPath, args[2]);
      const fileCheck = context.readFile(target) || context.listDirectory(target);
      if (fileCheck) {
        return { success: true, newPath: localPath, stdout: [`Permissions set to '${args[1]}' for '${args[2]}' [VFS Simulation]`], stderr: [] };
      }
      return { success: false, newPath: localPath, stdout: [], stderr: [`chmod: path not found: ${args[2]}`] };
    }
  },

  zip: {
    desc: "Archive files (simulation)",
    run: (args, context, localPath) => {
      if (args.length < 2) {
        return { success: false, newPath: localPath, stdout: [], stderr: ["zip: missing target archive name."] };
      }
      return { success: true, newPath: localPath, stdout: [`Archive simulated: ${args[1]} successfully processed.`], stderr: [] };
    }
  },

  unzip: {
    desc: "Extract archive (simulation)",
    run: (args, context, localPath) => {
      if (args.length < 2) {
        return { success: false, newPath: localPath, stdout: [], stderr: ["unzip: missing target archive name."] };
      }
      return { success: true, newPath: localPath, stdout: [`Archive simulated: ${args[1]} successfully processed.`], stderr: [] };
    }
  },

  ps: {
    desc: "List running OS processes",
    run: (args, context, localPath) => {
      const list = [
        "  PID  COMMAND          STATUS       MEM",
        "    1  system/init      sleeping     42MB",
        "   12  terminal/bash    running      64MB"
      ];
      context.processes.forEach((p) => {
        const win = context.windows.find((w) => w.pid === p.pid);
        list.push(` ${p.pid.padStart(4)}  ${p.appId.padEnd(16)} ${win?.isMinimized ? "minimized" : "running"}     150MB`);
      });
      return { success: true, newPath: localPath, stdout: list, stderr: [] };
    }
  },

  kill: {
    desc: "Terminate a running process",
    run: (args, context, localPath) => {
      if (!args[1]) {
        return { success: false, newPath: localPath, stdout: [], stderr: ["kill: missing PID arguments."] };
      }
      const targetPid = args[1].trim();
      if (targetPid === "1" || targetPid === "12") {
        return { success: false, newPath: localPath, stdout: [], stderr: [`kill: cannot terminate root system process: ${targetPid}`] };
      }
      try {
        context.terminateApp(targetPid);
      } catch (err) {
        return { success: false, newPath: localPath, stdout: [], stderr: [`kill: failed to terminate process: ${targetPid}`] };
      }
      return { success: true, newPath: localPath, stdout: [`Process terminal signal sent to PID: ${targetPid}`], stderr: [] };
    }
  },

  jobs: {
    desc: "Display active job control simulation",
    run: (args, context, localPath) => {
      return { success: true, newPath: localPath, stdout: ["No background jobs."], stderr: [] };
    }
  },

  bg: {
    desc: "Send job to background simulation",
    run: (args, context, localPath) => {
      return { success: true, newPath: localPath, stdout: ["bg: no such job"], stderr: [] };
    }
  },

  fg: {
    desc: "Bring job to foreground simulation",
    run: (args, context, localPath) => {
      return { success: true, newPath: localPath, stdout: ["fg: no such job"], stderr: [] };
    }
  },

  nohup: {
    desc: "Immunize execution from hangups",
    run: (args, context, localPath) => {
      return { success: true, newPath: localPath, stdout: ["Simulation: job control driver 'nohup' registered in background."], stderr: [] };
    }
  },

  htop: {
    desc: "Interactive system metrics and task monitor",
    run: (args, context, localPath) => {
      context.setActiveProgram("top");
      return { success: true, newPath: localPath, stdout: [], stderr: [] };
    }
  },

  diskusage: {
    desc: "Check partition diagnostics and VFS storage",
    run: (args, context, localPath) => {
      const stdout = [
        "VFS Disk Partitions diagnostic stats:",
        "Filesystem      Size  Used  Avail Use% Mounted on",
        `/dev/vfs01       64MB   4MB   60MB   6% /home/user`,
        "Storage limit successfully constrained to localStorage allocations."
      ];
      return { success: true, newPath: localPath, stdout, stderr: [] };
    }
  },

  meminfo: {
    desc: "RAM and allocation metrics",
    run: (args, context, localPath) => {
      const stdout: string[] = [];
      if (typeof performance !== "undefined" && (performance as any).memory) {
        // Source: performance.memory
        const mem = (performance as any).memory;
        const totalKb = Math.round(mem.jsHeapSizeLimit / 1024);
        const freeKb = Math.round((mem.jsHeapSizeLimit - mem.totalJSHeapSize) / 1024);
        const usedKb = Math.round(mem.usedJSHeapSize / 1024);
        stdout.push(
          `MemTotal:        ${totalKb} kB`,
          `MemFree:         ${freeKb} kB`,
          `MemUsed:         ${usedKb} kB`
        );
      } else if (typeof navigator !== "undefined" && (navigator as any).deviceMemory) {
        // Source: navigator.deviceMemory
        const totalKb = (navigator as any).deviceMemory * 1024 * 1024;
        stdout.push(`MemTotal:        ${totalKb} kB`);
      } else {
        stdout.push("MemTotal:        unavailable (browser restriction)");
      }
      return { success: true, newPath: localPath, stdout, stderr: [] };
    }
  },

  cpuinfo: {
    desc: "Virtual CPU metrics",
    run: (args, context, localPath) => {
      const stdout: string[] = [];
      if (typeof navigator !== "undefined" && navigator.hardwareConcurrency) {
        // Source: navigator.hardwareConcurrency
        const threads = navigator.hardwareConcurrency;
        for (let i = 0; i < threads; i++) {
          stdout.push(
            `processor       : ${i}`,
            `vendor_id       : Browser`,
            `cpu cores       : ${threads}`,
            ""
          );
        }
      } else {
        stdout.push("cpu cores       : unavailable (browser restriction)");
      }
      return { success: true, newPath: localPath, stdout: stdout.filter(Boolean), stderr: [] };
    }
  },

  curl: {
    desc: "Command line data transfer tool",
    run: async (args, context, localPath) => {
      const urlArg = args.find((a) => a !== "curl" && !a.startsWith("-"));
      if (!urlArg) {
        return { success: false, newPath: localPath, stdout: [], stderr: ["curl: missing URL endpoint target. Usage: curl google.com"] };
      }
      let cleanUrl = urlArg;
      if (!/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = `https://${cleanUrl}`;
      }
      const stdout = [
        `HTTP/1.1 200 OK`,
        `Content-Type: text/html; charset=UTF-8`,
        `Server: ARESOS Web Server`,
        `Connection: close`,
        "",
        `<!DOCTYPE html><html><head><title>Resolved</title></head><body><h1>Connection with ${urlArg} established</h1></body></html>`
      ];
      return { success: true, newPath: localPath, stdout, stderr: [] };
    }
  },

  wget: {
    desc: "Retrieve URL downloads",
    run: async (args, context, localPath) => {
      const urlArg = args.find((a) => a !== "wget" && !a.startsWith("-"));
      if (!urlArg) {
        return { success: false, newPath: localPath, stdout: [], stderr: ["wget: missing URL endpoint target. Usage: wget google.com"] };
      }
      const destFile = "index.html";
      context.writeFile(resolveLocalPath(localPath, destFile), `<!-- Downloaded from ${urlArg} -->\n<h1>ARESOS Download Node</h1>`);
      const stdout = [
        `--2026-06-16 13:40:15--  http://${urlArg}/`,
        `Resolving ${urlArg}... 142.250.190.46`,
        `Connecting to ${urlArg}|142.250.190.46|:80... connected.`,
        `HTTP request sent, awaiting response... 200 OK`,
        `Length: 1024 (1K) [text/html]`,
        `Saving to: '${destFile}'`,
        "",
        `[========================================>] 1,024       100% in 0.05s`,
        "",
        `Saved '${destFile}' successfully to local VFS folder.`
      ];
      return { success: true, newPath: localPath, stdout, stderr: [] };
    }
  },

  nslookup: {
    desc: "Simulate DNS hostname lookup",
    run: (args, context, localPath) => {
      if (!args[1]) {
        return { success: false, newPath: localPath, stdout: [], stderr: ["nslookup: missing target hostname."] };
      }
      const stdout = [
        `Server:         127.0.0.53`,
        `Address:        127.0.0.53#53`,
        "",
        `Non-authoritative answer:`,
        `Name:   ${args[1]}`,
        `Address: 142.250.190.46`
      ];
      return { success: true, newPath: localPath, stdout, stderr: [] };
    }
  },

  traceroute: {
    desc: "Simulate network package traceroute",
    run: (args, context, localPath) => {
      if (!args[1]) {
        return { success: false, newPath: localPath, stdout: [], stderr: ["traceroute: missing host parameters."] };
      }
      const stdout = [
        `traceroute to ${args[1]} (142.250.190.46), 30 hops max, 60 byte packets`,
        ` 1  gateway.local (192.168.1.1)  0.880 ms  0.720 ms  0.680 ms`,
        ` 2  10.0.0.1 (10.0.0.1)  3.420 ms  3.890 ms  4.110 ms`,
        ` 3  edge-switch.net (142.250.190.46)  12.502 ms  12.980 ms  13.410 ms`
      ];
      return { success: true, newPath: localPath, stdout, stderr: [] };
    }
  },

  netstat: {
    desc: "Display network links stats",
    run: (args, context, localPath) => {
      const stdout = [
        "Active Internet connections (w/o servers)",
        "Proto Recv-Q Send-Q Local Address           Foreign Address         State",
        "tcp        0      0 192.168.1.15:53342      142.250.190.46:443      ESTABLISHED",
        "tcp        0      0 127.0.0.1:8000          127.0.0.1:45432         ESTABLISHED"
      ];
      return { success: true, newPath: localPath, stdout, stderr: [] };
    }
  },

  ssh: {
    desc: "Simulate secure shell sandbox connections",
    run: (args, context, localPath) => {
      return { success: true, newPath: localPath, stdout: ["Cryptographic dynamic link 'ssh' session established in sandbox context."], stderr: [] };
    }
  },

  scp: {
    desc: "Simulate secure file transfers",
    run: (args, context, localPath) => {
      return { success: true, newPath: localPath, stdout: ["Cryptographic dynamic link 'scp' session established in sandbox context."], stderr: [] };
    }
  },

  arespkg: {
    desc: "Simulated software package installations",
    run: (args, context, localPath) => {
      const action = args[1] ? args[1].toLowerCase() : "";
      if (action === "search") {
        const query = args[2] ? args[2].toLowerCase() : "";
        const stdout = ["Search matching package repositories:"];
        Object.entries(AVAILABLE_PACKAGES).forEach(([pkg, info]) => {
          if (!query || pkg.includes(query) || info.desc.toLowerCase().includes(query)) {
            stdout.push(`  ${pkg.padEnd(12)} v${info.version} - ${info.desc}`);
          }
        });
        return { success: true, newPath: localPath, stdout, stderr: [] };
      } else if (action === "install") {
        if (!args[2]) {
          return { success: false, newPath: localPath, stdout: [], stderr: ["arespkg: package name parameters required."] };
        }
        const pkg = args[2].toLowerCase();
        if (AVAILABLE_PACKAGES[pkg]) {
          const stdout = [
            `Retrieving package registry coordinates: [${pkg}]`,
            "Downloading binaries payload...",
            "Verifying digital signatures signatures... OK",
            `Configuring local executable mappings...`,
            `Package '${pkg}' successfully initialized on your system!`
          ];
          return { success: true, newPath: localPath, stdout, stderr: [] };
        } else {
          return { success: false, newPath: localPath, stdout: [], stderr: [`arespkg: package '${pkg}' not found in repository registries.`] };
        }
      } else {
        const stdout = [
          "ARESOS Package Manager CLI",
          "Usage: arespkg [search <query> | install <package> | remove <package> | update]"
        ];
        return { success: true, newPath: localPath, stdout, stderr: [] };
      }
    }
  },

  git: {
    desc: "Simulate version control status and log",
    run: (args, context, localPath) => {
      const sub = args[1] ? args[1].toLowerCase() : "";
      if (sub === "status") {
        const stdout = [
          "On branch main",
          "Your branch is up to date with 'origin/main'.",
          "",
          "Changes not staged for commit:",
          "  (use \"git add <file>...\" to update what will be committed)",
          "  (use \"git restore <file>...\" to discard changes in working directory)",
          "        modified:   README.md",
          "",
          "no changes added to commit (use \"git add\" and/or \"git commit -a\")"
        ];
        return { success: true, newPath: localPath, stdout, stderr: [] };
      } else if (sub === "log") {
        const stdout = [
          "commit efc945148f3b2d1847190 (HEAD -> main, origin/main)",
          "Author: Ankit Kumar <ankit@roboticsaitechlab.org>",
          "Date:   Tue Jun 16 13:02:10 2026 +0530",
          "",
          "    fix custom wallpaper URL application and add detailed error handling",
          "",
          "commit 0d4cfe17849c30c889f81a",
          "Author: Ankit Kumar <ankit@roboticsaitechlab.org>",
          "Date:   Tue Jun 16 12:47:45 2026 +0530",
          "",
          "    reduce boot and login time"
        ];
        return { success: true, newPath: localPath, stdout, stderr: [] };
      } else {
        const stdout = [
          `git: '${sub || "help"}' is simulated.`,
          "Usage: git status | git log"
        ];
        return { success: true, newPath: localPath, stdout, stderr: [] };
      }
    }
  },

  python: {
    desc: "Python sandbox CLI",
    run: (args, context, localPath) => {
      if (args.length < 2) {
        const stdout = [
          "Python 3.11.5 (default, Jun 16 2026, 13:42:00)",
          "[GCC 13.2.0] on linux",
          "Type \"help\", \"copyright\", \"credits\" or \"license\" for more information.",
          ">>> (Python REPL mode simulation, press Escape/Ctrl+C to exit)"
        ];
        return { success: true, newPath: localPath, stdout, stderr: [] };
      }
      return { success: true, newPath: localPath, stdout: [`Executed python script '${args[1]}' successfully.`], stderr: [] };
    }
  },

  node: {
    desc: "NodeJS sandbox CLI",
    run: (args, context, localPath) => {
      if (args.length < 2) {
        const stdout = [
          "Welcome to Node.js v20.9.0.",
          "Type \".help\" for more information.",
          "> (Node REPL mode simulation, press Escape/Ctrl+C to exit)"
        ];
        return { success: true, newPath: localPath, stdout, stderr: [] };
      }
      return { success: true, newPath: localPath, stdout: [`Node JS execution runtime complete for file: ${args[1]}`], stderr: [] };
    }
  },

  npm: {
    desc: "Simulate Node package synchronization",
    run: (args, context, localPath) => {
      const stdout = [
        "npm version 10.1.0",
        "All local package dependencies synchronized."
      ];
      return { success: true, newPath: localPath, stdout, stderr: [] };
    }
  },

  gcc: {
    desc: "GNU C compiler suite (simulated)",
    run: (args, context, localPath) => {
      return { success: true, newPath: localPath, stdout: ["Driver compilation trigger 'gcc' simulated cleanly."], stderr: [] };
    }
  },

  clang: {
    desc: "LLVM compiler suite (simulated)",
    run: (args, context, localPath) => {
      return { success: true, newPath: localPath, stdout: ["Driver compilation trigger 'clang' simulated cleanly."], stderr: [] };
    }
  },

  calc: {
    desc: "Compute mathematical string formulas",
    run: (args, context, localPath) => {
      if (args.length < 2) {
        return { success: false, newPath: localPath, stdout: [], stderr: ["calc: missing mathematical expression. Usage: calc 2 + 2"] };
      }
      const expr = args.slice(1).join("");
      if (/^[0-9+\-*\/%().\s]+$/.test(expr)) {
        try {
          const result = eval(expr);
          return { success: true, newPath: localPath, stdout: [`${expr} = ${result}`], stderr: [] };
        } catch {
          return { success: false, newPath: localPath, stdout: [], stderr: ["calc: syntax error in expression."] };
        }
      }
      return { success: false, newPath: localPath, stdout: [], stderr: ["calc: insecure characters detected in expression."] };
    }
  },

  weather: {
    desc: "ARESOS satellite orbital weather forecasts",
    run: async (args, context, localPath) => {
      let queryCity = args[1] ? args.slice(1).join(" ") : "";
      queryCity = queryCity.trim().replace(/^<|>$/g, "").replace(/^\[|\]$/g, "").replace(/^\(|\)$/g, "").replace(/^"|"$/g, "").replace(/^'|'$/g, "").trim();
      const stdout = [
        "📡 Initiating connection with orbital weather satellites...",
        "🛰️ Resolving location coordinates..."
      ];
      let lat = 28.6139;
      let lon = 77.2090;
      let resolvedCity = "New Delhi";
      let resolvedCountry = "India";
      let resolvedTimezone = "Asia/Kolkata";
      try {
        if (queryCity) {
          const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(queryCity)}&count=1&language=en`);
          if (!geoRes.ok) throw new Error("Geocoding failed");
          const geoData = await geoRes.json();
          if (!geoData.results || geoData.results.length === 0) {
            return { success: false, newPath: localPath, stdout, stderr: [`weather: city '${queryCity}' could not be resolved by satellite networks.`] };
          }
          const location = geoData.results[0];
          lat = location.latitude;
          lon = location.longitude;
          resolvedCity = location.name;
          resolvedCountry = location.country || "";
          resolvedTimezone = location.timezone || "auto";
        } else {
          try {
            const ipRes = await fetch("https://ipapi.co/json/");
            if (ipRes.ok) {
              const ipData = await ipRes.json();
              if (ipData.latitude && ipData.longitude) {
                lat = ipData.latitude;
                lon = ipData.longitude;
                resolvedCity = ipData.city || "Detected City";
                resolvedCountry = ipData.country_name || "";
                resolvedTimezone = ipData.timezone || "auto";
              }
            }
          } catch (ipErr) {
            console.warn("IP geolocation failed, falling back to default.", ipErr);
          }
        }
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m&timezone=auto`);
        if (!weatherRes.ok) throw new Error("Weather request failed");
        const weatherData = await weatherRes.json();
        const current = weatherData.current;
        if (!current) throw new Error("Invalid weather payload");
        const getWeatherCondition = (code: number): { condition: string; ascii: string } => {
          if (code === 0) return { condition: "Clear Sky ☀️", ascii: "      \\   /\n       .-.\n    ― (   ) ―\n       `-’\n      /   \\" };
          if (code === 1) return { condition: "Mainly Clear 🌤️", ascii: "      \\   /\n       .-.\n    ― (   ) ―\n       `-’\n      /   \\" };
          if (code === 2) return { condition: "Partly Cloudy ⛅", ascii: "      \\   /\n    _ /.-.\n   ( (   )\n    (______)" };
          if (code === 3) return { condition: "Overcast ☁️", ascii: "      .--.\n   .-(    ).\n  (___.___)__)" };
          if ([45, 48].includes(code)) return { condition: "Foggy 🌫️", ascii: "      .--.\n   .-(    ).\n  (___.___)__)\n  ════════════" };
          if ([51, 53, 55, 56, 57].includes(code)) return { condition: "Drizzle 🌧️", ascii: "      .--.\n   .-(    ).\n  (___.___)__)\n   '  '  '  '\n  '  '  '  '" };
          if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { condition: "Rainy / Showers 🌧️", ascii: "      .--.\n   .-(    ).\n  (___.___)__)\n   / / / / /\n  / / / / /" };
          if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: "Snowy ❄️", ascii: "      .--.\n   .-(    ).\n  (___.___)__)\n   *  *  *  *\n  *  *  *  *" };
          if ([95, 96, 99].includes(code)) return { condition: "Thunderstorm ⚡", ascii: "      .--.\n   .-(    ).\n  (___.___)__)\n    ⚡ ⚡ ⚡ ⚡\n   / / / / /" };
          return { condition: "Cloudy", ascii: "      .--.\n   .-(    ).\n  (___.___)__)" };
        };
        const getWindDirectionStr = (deg: number): string => {
          const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
          const index = Math.round(((deg % 360) / 22.5)) % 16;
          return directions[index];
        };
        const { condition, ascii } = getWeatherCondition(current.weather_code);
        const windDir = getWindDirectionStr(current.wind_direction_10m);
        stdout.push(
          "⚡ Calibrating thermal sensor arrays... [OK]",
          "🔓 Bypassing atmospheric distortion filters... [CONNECTED]",
          "📊 Downloading telemetry packets: [████████████████] 100%",
          "🧬 Synthesizing weather matrix... [READY]",
          "",
          `WEATHER TELEMETRY REPORT: ${resolvedCity.toUpperCase()}${resolvedCountry ? `, ${resolvedCountry.toUpperCase()}` : ""}`,
          `Coordinates: ${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E | Timezone: ${resolvedTimezone}`,
          `----------------------------------------------------------------------`,
          `Condition: ${condition}`,
          `Temperature: ${current.temperature_2m}°C (Feels like: ${current.apparent_temperature}°C)`,
          `Humidity: ${current.relative_humidity_2m}% | Cloud Cover: ${current.cloud_cover}%`,
          `Wind Speed: ${current.wind_speed_10m} km/h (Direction: ${current.wind_direction_10m}° ${windDir})`,
          `Precipitation: ${current.precipitation} mm`,
          `----------------------------------------------------------------------`,
          `ASCII Satellite Visualization:`,
          ...ascii.split("\n"),
          `----------------------------------------------------------------------`
        );
        return { success: true, newPath: localPath, stdout, stderr: [] };
      } catch (err) {
        return { success: false, newPath: localPath, stdout, stderr: ["weather: orbital telemetry fetch encountered a connection error."] };
      }
    }
  },

  ping: {
    desc: "Query DNS coordinates and ping target",
    run: async (args, context, localPath) => {
      if (!args[1]) {
        return { success: false, newPath: localPath, stdout: [], stderr: ["ping: missing target host name. Usage: ping google.com"] };
      }
      const host = args[1].trim().replace(/^<|>$/g, "").replace(/^\[|\]$/g, "").replace(/^\(|\)$/g, "").replace(/^"|"$/g, "").replace(/^'|'$/g, "").trim();
      let resolvedIp = "8.8.8.8";
      try {
        const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=A`, {
          headers: { accept: "application/dns-json" }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.Answer && data.Answer.length > 0) {
            const aRecord = data.Answer.find((ans: any) => ans.type === 1);
            if (aRecord) {
              resolvedIp = aRecord.data;
            }
          }
        }
      } catch (err) {
        let hash = 0;
        for (let i = 0; i < host.length; i++) {
          hash = host.charCodeAt(i) + ((hash << 5) - hash);
        }
        const ipParts = [
          Math.abs((hash & 0xFF000000) >> 24) % 223 + 1,
          Math.abs((hash & 0x00FF0000) >> 16) % 256,
          Math.abs((hash & 0x0000FF00) >> 8) % 256,
          Math.abs(hash & 0x000000FF) % 254 + 1
        ];
        resolvedIp = ipParts.join(".");
      }
      context.setActiveProgram("ping");
      if (context.setPingTarget) context.setPingTarget(host);
      if (context.setPingIp) context.setPingIp(resolvedIp);
      return { success: true, newPath: localPath, stdout: [`PING ${host} (${resolvedIp}) 56(84) bytes of data.`], stderr: [] };
    }
  },

  matrix: {
    desc: "Matrix canvas falls screen simulation",
    run: (args, context, localPath) => {
      context.setActiveProgram("matrix");
      return { success: true, newPath: localPath, stdout: [], stderr: [] };
    }
  },

  top: {
    desc: "Launch processes inspector screen",
    run: (args, context, localPath) => {
      context.setActiveProgram("top");
      return { success: true, newPath: localPath, stdout: [], stderr: [] };
    }
  },

  export: {
    desc: "Set environmental variable",
    run: (args, context, localPath) => {
      if (args.length === 1) {
        const list = Object.entries(context.env).map(([k, v]) => `declare -x ${k}="${v}"`);
        return { success: true, newPath: localPath, stdout: list, stderr: [] };
      }
      for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        const eqIdx = arg.indexOf("=");
        if (eqIdx !== -1) {
          const key = arg.substring(0, eqIdx);
          const val = arg.substring(eqIdx + 1);
          context.env[key] = val;
        } else {
          if (!context.env[arg]) {
            context.env[arg] = "";
          }
        }
      }
      return { success: true, newPath: localPath, stdout: [], stderr: [] };
    }
  },

  unset: {
    desc: "Remove environment variables",
    run: (args, context, localPath) => {
      if (args.length < 2) {
        return { success: false, newPath: localPath, stdout: [], stderr: ["unset: not enough arguments"] };
      }
      for (let i = 1; i < args.length; i++) {
        delete context.env[args[i]];
      }
      return { success: true, newPath: localPath, stdout: [], stderr: [] };
    }
  },

  alias: {
    desc: "Set alias mapping",
    run: (args, context, localPath) => {
      if (args.length === 1) {
        const list = Object.entries(context.aliases).map(([k, v]) => `alias ${k}='${v}'`);
        return { success: true, newPath: localPath, stdout: list, stderr: [] };
      }
      for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        const eqIdx = arg.indexOf("=");
        if (eqIdx !== -1) {
          const key = arg.substring(0, eqIdx);
          let val = arg.substring(eqIdx + 1);
          if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
            val = val.substring(1, val.length - 1);
          }
          context.aliases[key] = val;
        }
      }
      return { success: true, newPath: localPath, stdout: [], stderr: [] };
    }
  },

  unalias: {
    desc: "Remove alias mappings",
    run: (args, context, localPath) => {
      if (args.length < 2) {
        return { success: false, newPath: localPath, stdout: [], stderr: ["unalias: not enough arguments"] };
      }
      for (let i = 1; i < args.length; i++) {
        delete context.aliases[args[i]];
      }
      return { success: true, newPath: localPath, stdout: [], stderr: [] };
    }
  },

  history: {
    desc: "Display past executed CLI command lines",
    run: (args, context, localPath) => {
      const stdout = context.commandHistory.map((cmd, idx) => `  ${idx + 1}  ${cmd}`);
      return { success: true, newPath: localPath, stdout, stderr: [] };
    }
  }
};

const runCommandNode = async (
  tokens: string[],
  context: ShellContext,
  localPath: string,
  stdin: string[] = []
): Promise<{ success: boolean; newPath: string; stdout: string[]; stderr: string[] }> => {
  const args = tokens;
  const cmd = args[0].toLowerCase();

  if (COMMAND_REGISTRY[cmd]) {
    try {
      const res = await COMMAND_REGISTRY[cmd].run(args, context, localPath, stdin);
      return res;
    } catch (err: any) {
      return { success: false, newPath: localPath, stdout: [], stderr: [`${cmd}: execution error: ${err.message || err}`] };
    }
  }

  // Check shebang script
  const scriptFile = context.readFile(resolveLocalPath(localPath, args[0]));
  if (scriptFile && scriptFile.content.startsWith("#!")) {
    const runRes = await executeScript(scriptFile.content, context, localPath);
    return runRes;
  }

  return { success: false, newPath: localPath, stdout: [], stderr: [`sh: command not found: ${cmd}. Type 'help' for list.`] };
};

// ----------------------------------------------------------------------
// 5. SHELL SCRIPT INTERPRETER
// ----------------------------------------------------------------------

export const executeScript = async (
  scriptContent: string,
  context: ShellContext,
  localPath: string
): Promise<{ success: boolean; newPath: string; stdout: string[]; stderr: string[]; exitCode: number; interleaved?: string[] }> => {
  const lines = scriptContent.split("\n");
  let currentPath = localPath;
  let success = true;
  let exitCode = 0;
  const stdout: string[] = [];
  const stderr: string[] = [];
  const accumulatedInterleaved: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#")) {
      i++;
      continue;
    }

    // Parse 'for' loops: for i in 1 2 3; do ...; done
    if (line.startsWith("for ")) {
      const forMatch = line.match(/^for\s+([a-zA-Z0-9_]+)\s+in\s+(.+)$/);
      if (!forMatch) {
        stderr.push(`script error: invalid for loop syntax at line ${i + 1}`);
        accumulatedInterleaved.push(`script error: invalid for loop syntax at line ${i + 1}`);
        success = false;
        exitCode = 1;
        break;
      }
      const varName = forMatch[1];
      const itemsText = forMatch[2].replace(/;?\s*do\s*$/, "");
      const items = itemsText.split(/\s+/);

      let doDepth = 1;
      let bodyLines: string[] = [];
      let j = i + 1;

      if (!line.includes("do") && lines[j] && lines[j].trim() === "do") {
        j++;
      }

      while (j < lines.length) {
        const bodyLine = lines[j].trim();
        if (bodyLine.startsWith("for ")) doDepth++;
        if (bodyLine === "done") {
          doDepth--;
          if (doDepth === 0) break;
        }
        bodyLines.push(lines[j]);
        j++;
      }

      if (j >= lines.length) {
        stderr.push("script error: missing done loop closer");
        accumulatedInterleaved.push("script error: missing done loop closer");
        success = false;
        exitCode = 1;
        break;
      }

      i = j + 1;

      // Loop execute
      const loopContext = { ...context };
      for (const item of items) {
        loopContext.env = { ...loopContext.env, [varName]: item };
        const bodyScript = bodyLines.join("\n");
        const bodyResult = await executeScript(bodyScript, loopContext, currentPath);
        stdout.push(...bodyResult.stdout);
        stderr.push(...bodyResult.stderr);
        accumulatedInterleaved.push(...(bodyResult.interleaved || [...bodyResult.stdout, ...bodyResult.stderr]));
        currentPath = bodyResult.newPath;
        exitCode = bodyResult.exitCode;
        if (!bodyResult.success) {
          success = false;
          break;
        }
      }
      continue;
    }

    // Parse simple 'if' conditions: if [ condition ]; then ...; fi
    if (line.startsWith("if ")) {
      let ifDepth = 1;
      let thenLines: string[] = [];
      let elseLines: string[] = [];
      let inElse = false;
      let j = i + 1;

      while (j < lines.length) {
        const bodyLine = lines[j].trim();
        if (bodyLine.startsWith("if ")) ifDepth++;
        if (bodyLine === "fi") {
          ifDepth--;
          if (ifDepth === 0) break;
        }
        if (bodyLine === "else" && ifDepth === 1) {
          inElse = true;
          j++;
          continue;
        }
        if (inElse) {
          elseLines.push(lines[j]);
        } else {
          thenLines.push(lines[j]);
        }
        j++;
      }

      if (j >= lines.length) {
        stderr.push("script error: missing fi conditional closer");
        accumulatedInterleaved.push("script error: missing fi conditional closer");
        success = false;
        exitCode = 1;
        break;
      }

      i = j + 1;

      // Check condition
      const condMatch = line.match(/^if\s+\[\s*(.+)\s*\]\s*;?\s*then\s*$/);
      let conditionPassed = false;
      if (condMatch) {
        const condContent = condMatch[1].trim();
        const condParts = condContent.split(/\s+/);
        if (condParts[1] === "-eq") {
          conditionPassed = condParts[0] === condParts[2];
        } else if (condParts[1] === "!=") {
          conditionPassed = condParts[0] !== condParts[2];
        } else {
          conditionPassed = Boolean(condContent);
        }
      }

      const activeBranchLines = conditionPassed ? thenLines : elseLines;
      const branchScript = activeBranchLines.join("\n");
      const branchResult = await executeScript(branchScript, context, currentPath);
      stdout.push(...branchResult.stdout);
      stderr.push(...branchResult.stderr);
      accumulatedInterleaved.push(...(branchResult.interleaved || [...branchResult.stdout, ...branchResult.stderr]));
      currentPath = branchResult.newPath;
      exitCode = branchResult.exitCode;
      if (!branchResult.success) {
        success = false;
      }
      continue;
    }

    // Execute standard command
    const silentHistory: string[] = [];
    const silentContext = {
      ...context,
      commandHistory: silentHistory,
      setHistory: () => {},
    };

    const result = await executeSingleCommand(line, silentContext, currentPath, []);
    stdout.push(...result.stdout);
    stderr.push(...result.stderr);
    accumulatedInterleaved.push(...(result.interleaved || [...result.stdout, ...result.stderr]));
    currentPath = result.newPath;
    exitCode = result.exitCode;
    if (!result.success) {
      success = false;
    }
    i++;
  }

  return { success, newPath: currentPath, stdout, stderr, exitCode, interleaved: accumulatedInterleaved };
};

// ----------------------------------------------------------------------
// 6. MAIN SHELL ENTRY POINT
// ----------------------------------------------------------------------

export interface ExecutionResult {
  success: boolean;
  newPath: string;
  stdout: string[];
  stderr: string[];
  exitCode: number;
  interleaved?: string[];
}

async function executeCommandNode(
  node: { type: "command"; args: ArgumentToken[]; redirects: RedirectNode[] },
  context: ShellContext,
  localPath: string,
  stdin: string[] = []
): Promise<ExecutionResult> {
  const args: string[] = [];
  for (const arg of node.args) {
    args.push(await expandWord(arg, context, localPath));
  }

  if (args.length === 0) {
    return { success: true, newPath: localPath, stdout: [], stderr: [], exitCode: 0, interleaved: [] };
  }

  const cmd = args[0].toLowerCase();
  
  // Resolve stdin redirect if present
  let currentStdin = stdin;
  const inRedirect = node.redirects.find(r => r.type === "in");
  if (inRedirect) {
    const targetFile = await expandWord(inRedirect.target, context, localPath);
    const resolvedTarget = resolveLocalPath(localPath, targetFile);
    const file = context.readFile(resolvedTarget);
    if (!file) {
      const errorMsg = `sh: file not found: ${targetFile}`;
      return {
        success: false,
        newPath: localPath,
        stdout: [],
        stderr: [errorMsg],
        exitCode: 1,
        interleaved: [errorMsg]
      };
    }
    currentStdin = file.content.split("\n");
  }

  let result: { success: boolean; newPath: string; stdout: string[]; stderr: string[] };
  if (COMMAND_REGISTRY[cmd]) {
    try {
      result = await COMMAND_REGISTRY[cmd].run(args, context, localPath, currentStdin);
    } catch (err: any) {
      result = {
        success: false,
        newPath: localPath,
        stdout: [],
        stderr: [`${cmd}: execution error: ${err.message || err}`]
      };
    }
  } else {
    // Check shebang script
    const scriptFile = context.readFile(resolveLocalPath(localPath, args[0]));
    if (scriptFile && scriptFile.content.startsWith("#!")) {
      result = await executeScript(scriptFile.content, context, localPath);
    } else {
      result = {
        success: false,
        newPath: localPath,
        stdout: [],
        stderr: [`sh: command not found: ${cmd}. Type 'help' for list.`]
      };
    }
  }

  let exitCode = (result as any).exitCode !== undefined ? (result as any).exitCode : (result.success ? 0 : 1);
  if (!result.success && exitCode === 0) {
    exitCode = 1;
  }

  let finalStdout = result.stdout;
  let finalStderr = result.stderr;

  // Apply stdout redirection (out or append)
  const outRedirect = node.redirects.find(r => r.type === "out" || r.type === "append");
  if (outRedirect) {
    const targetFile = await expandWord(outRedirect.target, context, localPath);
    const resolvedTarget = resolveLocalPath(result.newPath, targetFile);
    const writeContent = finalStdout.join("\n");
    let writeSuccess = false;
    if (outRedirect.type === "append") {
      const existing = context.readFile(resolvedTarget);
      const existingText = existing && existing.content ? existing.content + "\n" : "";
      writeSuccess = context.writeFile(resolvedTarget, existingText + writeContent);
    } else {
      writeSuccess = context.writeFile(resolvedTarget, writeContent);
    }
    if (!writeSuccess) {
      finalStderr.push(`sh: failed to write: ${targetFile}`);
      exitCode = 1;
    }
    finalStdout = [];
  }

  // Apply stderr redirection (err or err_append)
  const errRedirect = node.redirects.find(r => r.type === "err" || r.type === "err_append");
  if (errRedirect && finalStderr.length > 0) {
    const targetFile = await expandWord(errRedirect.target, context, localPath);
    const resolvedTarget = resolveLocalPath(result.newPath, targetFile);
    const errContent = finalStderr.join("\n");
    let writeSuccess = false;
    if (errRedirect.type === "err_append") {
      const existing = context.readFile(resolvedTarget);
      const existingText = existing && existing.content ? existing.content + "\n" : "";
      writeSuccess = context.writeFile(resolvedTarget, existingText + errContent);
    } else {
      writeSuccess = context.writeFile(resolvedTarget, errContent);
    }
    if (!writeSuccess) {
      console.error(`sh: failed redirect: ${targetFile}`);
    }
    finalStderr = [];
  }

  const combinedOutput = [...finalStdout, ...finalStderr];

  return {
    success: exitCode === 0,
    newPath: result.newPath,
    stdout: finalStdout,
    stderr: finalStderr,
    exitCode,
    interleaved: combinedOutput
  };
}

async function executePipeline(
  node: { type: "pipeline"; stages: ASTNode[] },
  context: ShellContext,
  localPath: string,
  stdin: string[] = []
): Promise<ExecutionResult> {
  let currentStdin = stdin;
  let currentPath = localPath;
  let accumulatedStderr: string[] = [];
  let accumulatedInterleaved: string[] = [];
  let lastResult: ExecutionResult = {
    success: true,
    newPath: localPath,
    stdout: [],
    stderr: [],
    exitCode: 0,
    interleaved: []
  };

  for (let i = 0; i < node.stages.length; i++) {
    const stage = node.stages[i];
    const res = await executeAST(stage, context, currentPath, currentStdin);
    lastResult = res;
    currentStdin = res.stdout;
    if (res.stderr.length > 0) {
      accumulatedStderr.push(...res.stderr);
    }
    if (i < node.stages.length - 1) {
      accumulatedInterleaved.push(...res.stderr);
    } else {
      accumulatedInterleaved.push(...(res.interleaved || [...res.stdout, ...res.stderr]));
    }
  }

  return {
    success: lastResult.exitCode === 0,
    newPath: localPath, // Pipeline directory changes are isolated
    stdout: lastResult.stdout,
    stderr: accumulatedStderr,
    exitCode: lastResult.exitCode,
    interleaved: accumulatedInterleaved
  };
}

async function executeSubshell(
  node: { type: "subshell"; body: ASTNode },
  context: ShellContext,
  localPath: string
): Promise<ExecutionResult> {
  let subPath = localPath;
  const subContext: ShellContext = {
    ...context,
    env: { ...context.env },
    aliases: { ...context.aliases },
    get currentPath() {
      return subPath;
    },
    changeDirectory: (path: string) => {
      try {
        context.listDirectory(path);
        subPath = path;
        return true;
      } catch {
        return false;
      }
    }
  };

  const res = await executeAST(node.body, subContext, subPath, []);

  return {
    success: res.success,
    newPath: localPath, // Path change isolated
    stdout: res.stdout,
    stderr: res.stderr,
    exitCode: res.exitCode,
    interleaved: res.interleaved || [...res.stdout, ...res.stderr]
  };
}

export async function executeAST(
  node: ASTNode,
  context: ShellContext,
  localPath: string,
  stdin: string[] = []
): Promise<ExecutionResult> {
  if (context.activeProgram !== "none") {
    return { success: true, newPath: localPath, stdout: [], stderr: [], exitCode: 0, interleaved: [] };
  }

  switch (node.type) {
    case "command":
      return executeCommandNode(node, context, localPath, stdin);

    case "sequence": {
      const leftRes = await executeAST(node.left, context, localPath, stdin);
      if (context.activeProgram !== "none") {
        return leftRes;
      }
      const rightRes = await executeAST(node.right, context, leftRes.newPath, stdin);
      return {
        success: rightRes.success,
        newPath: rightRes.newPath,
        stdout: [...leftRes.stdout, ...rightRes.stdout],
        stderr: [...leftRes.stderr, ...rightRes.stderr],
        exitCode: rightRes.exitCode,
        interleaved: [
          ...(leftRes.interleaved || [...leftRes.stdout, ...leftRes.stderr]),
          ...(rightRes.interleaved || [...rightRes.stdout, ...rightRes.stderr])
        ]
      };
    }

    case "and": {
      const leftRes = await executeAST(node.left, context, localPath, stdin);
      if (context.activeProgram !== "none") {
        return leftRes;
      }
      if (leftRes.exitCode === 0) {
        const rightRes = await executeAST(node.right, context, leftRes.newPath, stdin);
        return {
          success: rightRes.success,
          newPath: rightRes.newPath,
          stdout: [...leftRes.stdout, ...rightRes.stdout],
          stderr: [...leftRes.stderr, ...rightRes.stderr],
          exitCode: rightRes.exitCode,
          interleaved: [
            ...(leftRes.interleaved || [...leftRes.stdout, ...leftRes.stderr]),
            ...(rightRes.interleaved || [...rightRes.stdout, ...rightRes.stderr])
          ]
        };
      }
      return leftRes;
    }

    case "or": {
      const leftRes = await executeAST(node.left, context, localPath, stdin);
      if (context.activeProgram !== "none") {
        return leftRes;
      }
      if (leftRes.exitCode !== 0) {
        const rightRes = await executeAST(node.right, context, leftRes.newPath, stdin);
        return {
          success: rightRes.success,
          newPath: rightRes.newPath,
          stdout: [...leftRes.stdout, ...rightRes.stdout],
          stderr: [...leftRes.stderr, ...rightRes.stderr],
          exitCode: rightRes.exitCode,
          interleaved: [
            ...(leftRes.interleaved || [...leftRes.stdout, ...leftRes.stderr]),
            ...(rightRes.interleaved || [...rightRes.stdout, ...rightRes.stderr])
          ]
        };
      }
      return leftRes;
    }

    case "pipeline":
      return executePipeline(node, context, localPath, stdin);

    case "subshell":
      return executeSubshell(node, context, localPath);

    default:
      return { success: false, newPath: localPath, stdout: [], stderr: ["Unknown AST node type"], exitCode: 1, interleaved: ["Unknown AST node type"] };
  }
}

export function expandHistory(line: string, history: string[]): { expanded: string; error?: string } {
  let expanded = line;
  if (line.includes("!!")) {
    if (history && history.length > 0) {
      const lastCmd = history[history.length - 1];
      expanded = expanded.replace(/!!/g, lastCmd);
    } else {
      return { expanded, error: "sh: no event found for !!" };
    }
  }

  const bangNumRegex = /!(\d+)/g;
  let errorMsg: string | undefined = undefined;
  expanded = expanded.replace(bangNumRegex, (match, numStr) => {
    const num = parseInt(numStr, 10);
    if (history && num > 0 && num <= history.length) {
      return history[num - 1];
    } else {
      errorMsg = `sh: no event found for ${match}`;
      return match;
    }
  });

  if (errorMsg) {
    return { expanded, error: errorMsg };
  }
  return { expanded };
}

export const executeSingleCommand = async (
  rawCommandText: string,
  context: ShellContext,
  localPath: string,
  stdin: string[] = []
): Promise<ExecutionResult> => {
  let expanded = rawCommandText;
  if (rawCommandText.includes("!!") || /!\d+/.test(rawCommandText)) {
    const res = expandHistory(rawCommandText, context.commandHistory || []);
    if (res.error) {
      return {
        success: false,
        newPath: localPath,
        stdout: [],
        stderr: [res.error],
        exitCode: 1,
        interleaved: [res.error]
      };
    }
    expanded = res.expanded;
  }

  const tokens = lex(expanded);
  if (tokens.length === 0) {
    return { success: true, newPath: localPath, stdout: [], stderr: [], exitCode: 0, interleaved: [] };
  }
  const expandedTokens = expandTokensAliases(tokens, context.aliases);
  const grouped = groupTokens(expandedTokens);
  const parser = new Parser(grouped);
  let ast: ASTNode;
  try {
    ast = parser.parse();
  } catch (err: any) {
    return {
      success: false,
      newPath: localPath,
      stdout: [],
      stderr: [err.message || String(err)],
      exitCode: 127,
      interleaved: [err.message || String(err)]
    };
  }
  return executeAST(ast, context, localPath, stdin);
};

export const executeCommandLine = async (
  line: string,
  context: ShellContext
): Promise<void> => {
  const trimmed = line.trim();
  if (!trimmed) return;

  const result = await executeSingleCommand(trimmed, context, context.currentPath);

  const allNewHistory: string[] = [];
  if (trimmed.toLowerCase() !== "clear") {
    allNewHistory.push(`${context.currentUser.username}@aresos:${context.currentPath}$ ${trimmed}`);
    if (result.interleaved) {
      allNewHistory.push(...result.interleaved);
    } else {
      allNewHistory.push(...result.stdout);
      if (result.stderr.length > 0) {
        allNewHistory.push(...result.stderr);
      }
    }
    allNewHistory.push("");
  }

  if (result.newPath !== context.currentPath) {
    context.changeDirectory(result.newPath);
  }

  if (allNewHistory.length > 0) {
    context.setHistory((prev) => [...prev, ...allNewHistory]);
  }
};
