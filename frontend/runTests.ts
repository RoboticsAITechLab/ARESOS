import { FSNode, FSFile, FSDirectory } from "./types/webos/fs";
import { executeCommandLine, executeSingleCommand, ShellContext } from "./utils/webos/shellEngine";

// Initial virtual filesystem structure
const INITIAL_FS: FSDirectory = {
  name: "/",
  type: "directory",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  children: {
    home: {
      name: "home",
      type: "directory",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      children: {
        user: {
          name: "user",
          type: "directory",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          children: {
            Desktop: {
              name: "Desktop",
              type: "directory",
              createdAt: Date.now(),
              updatedAt: Date.now(),
              children: {
                "Welcome.txt": {
                  name: "Welcome.txt",
                  type: "file",
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  content: "Welcome to ARESOS WebOS!\n\nThis is a modular web desktop environment running on Next.js, React 19, and Tailwind CSS.\n\nYou can use the Terminal, open the Notepad, run the File Explorer, or browse the web.",
                  size: 215,
                  extension: "txt",
                },
                "README.md": {
                  name: "README.md",
                  type: "file",
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  content: "# ARESOS Web OS\n\nFeatures:\n- Virtual File System (VFS) with persistent LocalStorage\n- Multi-window drag & resize manager\n- Integrated Terminal & File Manager\n- Rich glassmorphism desktop elements",
                  size: 200,
                  extension: "md",
                },
              },
            },
            Documents: {
              name: "Documents",
              type: "directory",
              createdAt: Date.now(),
              updatedAt: Date.now(),
              children: {
                "project_ideas.txt": {
                  name: "project_ideas.txt",
                  type: "file",
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  content: "1. Build an advanced terminal command engine\n2. Add multi-user logins\n3. Connect custom WebSocket backends",
                  size: 105,
                  extension: "txt",
                },
              },
            },
            Downloads: {
              name: "Downloads",
              type: "directory",
              createdAt: Date.now(),
              updatedAt: Date.now(),
              children: {},
            },
          },
        },
      },
    },
    bin: {
      name: "bin",
      type: "directory",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      children: {},
    },
  },
};

let root: FSDirectory = JSON.parse(JSON.stringify(INITIAL_FS));
let currentPath = "/home/user";
let env: Record<string, string> = {
  USER: "user",
  HOME: "/home/user",
};
let aliases: Record<string, string> = {
  ll: "ls -la",
  la: "ls -a",
};
let historyLogs: string[] = [];
let activeProgram: "none" | "ping" | "top" | "matrix" = "none";

const parsePath = (path: string): string[] => {
  const absolutePath = path.startsWith("/") ? path : `${currentPath}/${path}`;
  return absolutePath.split("/").filter(Boolean);
};

const findNode = (rootNode: FSDirectory, segments: string[]): FSNode | null => {
  let current: FSNode = rootNode;
  for (const segment of segments) {
    if (current.type !== "directory") return null;
    const next: FSNode | undefined = current.children[segment];
    if (!next) return null;
    current = next;
  }
  return current;
};

const listDirectory = (path?: string) => {
  const targetPath = path !== undefined ? path : currentPath;
  const segments = parsePath(targetPath);
  const node = findNode(root, segments);
  if (node && node.type === "directory") {
    return Object.entries(node.children).map(([name, child]) => ({
      name,
      node: child,
    }));
  }
  return [];
};

const readFile = (filePath: string): FSFile | null => {
  const segments = parsePath(filePath);
  const node = findNode(root, segments);
  if (node && node.type === "file") {
    return node;
  }
  return null;
};

const writeFile = (filePath: string, content: string): boolean => {
  const segments = parsePath(filePath);
  if (segments.length === 0) return false;
  const fileName = segments[segments.length - 1];
  const parentSegments = segments.slice(0, -1);
  const parentNode = findNode(root, parentSegments);
  if (parentNode && parentNode.type === "directory") {
    const ext = fileName.includes(".") ? fileName.split(".").pop() : undefined;
    parentNode.children[fileName] = {
      name: fileName,
      type: "file",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      content,
      size: content.length,
      extension: ext,
    };
    return true;
  }
  return false;
};

const createDirectory = (dirPath: string, name: string): boolean => {
  const segments = parsePath(dirPath);
  const parentNode = findNode(root, segments);
  if (parentNode && parentNode.type === "directory") {
    if (parentNode.children[name]) {
      return false; // Already exists
    }
    parentNode.children[name] = {
      name,
      type: "directory",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      children: {},
    };
    return true;
  }
  return false;
};

const deleteNode = (nodePath: string): boolean => {
  const segments = parsePath(nodePath);
  if (segments.length === 0) return false;
  const nodeName = segments[segments.length - 1];
  const parentSegments = segments.slice(0, -1);
  const parentNode = findNode(root, parentSegments);
  if (parentNode && parentNode.type === "directory") {
    if (parentNode.children[nodeName]) {
      delete parentNode.children[nodeName];
      return true;
    }
  }
  return false;
};

const changeDirectory = (targetPath: string): boolean => {
  let segments: string[] = [];
  if (targetPath.startsWith("/")) {
    segments = targetPath.split("/").filter(Boolean);
  } else {
    const currentSegments = currentPath.split("/").filter(Boolean);
    const relativeSegments = targetPath.split("/").filter(Boolean);
    for (const segment of relativeSegments) {
      if (segment === ".") {
        continue;
      } else if (segment === "..") {
        currentSegments.pop();
      } else {
        currentSegments.push(segment);
      }
    }
    segments = currentSegments;
  }
  const node = findNode(root, segments);
  if (node && node.type === "directory") {
    currentPath = "/" + segments.join("/");
    return true;
  }
  return false;
};

const renameNode = (nodePath: string, newName: string): boolean => {
  const segments = nodePath.split("/").filter(Boolean);
  if (segments.length === 0) return false;
  const oldName = segments[segments.length - 1];
  const parentSegments = segments.slice(0, -1);
  const parentNode = findNode(root, parentSegments);
  if (parentNode && parentNode.type === "directory") {
    const node = parentNode.children[oldName];
    if (node) {
      if (parentNode.children[newName]) {
        return false;
      }
      node.name = newName;
      node.updatedAt = Date.now();
      parentNode.children[newName] = node;
      delete parentNode.children[oldName];
      return true;
    }
  }
  return false;
};

const updateSettings = () => {};
const updateUser = () => {};
const addNotification = () => {};
const terminateApp = () => {};
const launchApp = () => null;

const makeContext = (): ShellContext => ({
  currentPath,
  listDirectory,
  changeDirectory,
  readFile,
  writeFile,
  createDirectory,
  deleteNode,
  renameNode,
  settings: {},
  updateSettings,
  currentUser: { username: "user" },
  updateUser,
  addNotification,
  processes: [],
  windows: [],
  terminateApp,
  launchApp,
  env,
  aliases,
  commandHistory: [],
  setHistory: (fn: any) => {
    if (typeof fn === "function") {
      historyLogs = fn(historyLogs);
    } else {
      historyLogs = fn;
    }
  },
  activeProgram,
  setActiveProgram: (prog) => { activeProgram = prog; },
});

const run = async (line: string): Promise<void> => {
  historyLogs = [];
  const ctx = makeContext();
  await executeCommandLine(line, ctx);
};

// Reset state between tests
const resetState = () => {
  root = JSON.parse(JSON.stringify(INITIAL_FS));
  currentPath = "/home/user";
  env = {
    USER: "user",
    HOME: "/home/user",
  };
  aliases = {
    ll: "ls -la",
    la: "ls -a",
  };
  historyLogs = [];
  activeProgram = "none";
};

// A simple test runner assertion library
const assert = (condition: boolean, message: string) => {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
};

const assertStdoutContains = (keyword: string) => {
  const found = historyLogs.filter(log => !log.startsWith("user@aresos:")).some(log => log.includes(keyword));
  assert(found, `Expected history output to contain "${keyword}"`);
};

const assertPath = (expected: string) => {
  assert(currentPath === expected, `Expected path to be "${expected}", got "${currentPath}"`);
};

const runAllTests = async () => {
  console.log("🚀 Running ARESOS Shell Regression Tests...\n");

  // 1. TEST_CD
  resetState();
  console.log("  [1/9] Testing CD navigation...");
  await run("cd Desktop");
  assertPath("/home/user/Desktop");
  await run("cd ..");
  assertPath("/home/user");
  await run("cd /bin");
  assertPath("/bin");
  await run("cd non_existent_dir"); // should fail and not change path
  assertPath("/bin");

  // 2. TEST_PWD
  resetState();
  console.log("  [2/9] Testing PWD print...");
  await run("pwd");
  assertStdoutContains("/home/user");

  // 3. TEST_CHAINING
  resetState();
  console.log("  [3/9] Testing Chaining Operators (; && ||)...");
  await run("pwd ; cd Desktop ; pwd");
  assertStdoutContains("/home/user");
  assertStdoutContains("/home/user/Desktop");
  assertPath("/home/user/Desktop");

  resetState();
  await run("cd Desktop && touch test.txt && cd ..");
  assertPath("/home/user");
  assert(readFile("/home/user/Desktop/test.txt") !== null, "test.txt should have been created");

  resetState();
  await run("non_existent_command || echo 'fallback'");
  assertStdoutContains("fallback");

  resetState();
  await run("echo first && non_existent_command && echo second");
  assertStdoutContains("first");
  const secondFound = historyLogs.filter(log => !log.startsWith("user@aresos:")).some(log => log.includes("second"));
  assert(!secondFound, "Should not execute 'echo second' because of command failure in the chain");

  // 4. TEST_PIPES
  resetState();
  console.log("  [4/9] Testing Multi-stage Pipelines...");
  await run("cat Desktop/README.md | grep Features");
  assertStdoutContains("Features:");
  const nonFeatureFound = historyLogs.filter(log => !log.startsWith("user@aresos:")).some(log => log.includes("glassmorphism") && !log.includes("Features:"));
  assert(!nonFeatureFound, "Should have filtered out other lines");

  resetState();
  await run("echo hello world | wc -w");
  assertStdoutContains("2");

  // 5. TEST_REDIRECTION
  resetState();
  console.log("  [5/9] Testing Redirection (>, >>, <, 2>, 2>>)...");
  await run("echo 'Redirected Text' > redirect.txt");
  let fileNode = readFile("/home/user/redirect.txt");
  assert(fileNode !== null && fileNode.content.trim() === "Redirected Text", "Redirection file content mismatch");

  await run("echo 'Second Line' >> redirect.txt");
  fileNode = readFile("/home/user/redirect.txt");
  assert(fileNode !== null && fileNode.content.replace(/\r\n/g, "\n").trim() === "Redirected Text\nSecond Line", "Redirection append mismatch");

  await run("cat < redirect.txt");
  assertStdoutContains("Redirected Text");
  assertStdoutContains("Second Line");

  await run("non_existent_command 2> error.txt");
  let errFile = readFile("/home/user/error.txt");
  assert(errFile !== null && errFile.content.includes("sh: command not found: non_existent_command"), "Error redirection content mismatch");

  // 6. TEST_VARIABLES
  resetState();
  console.log("  [6/9] Testing Environment Variables (export, unset, expansion)...");
  await run("export TEST_VAR=awesome");
  assert(env.TEST_VAR === "awesome", "Environment variable not exported");
  await run("echo $TEST_VAR");
  assertStdoutContains("awesome");
  await run("unset TEST_VAR");
  assert(env.TEST_VAR === undefined, "Environment variable not unset");

  // 7. TEST_ALIAS
  resetState();
  console.log("  [7/9] Testing Alias Engine (alias, unalias)...");
  await run("alias my_ls='ls -la'");
  assert(aliases.my_ls === "ls -la", "Alias not created");
  await run("my_ls");
  assertStdoutContains("Desktop");
  await run("unalias my_ls");
  assert(aliases.my_ls === undefined, "Alias not removed");

  // 8. TEST_HISTORY
  resetState();
  console.log("  [8/9] Testing Command History command...");
  // History list accumulates commands in context commandHistory. We must feed commandHistory for testing the command
  const ctxWithHistory = makeContext();
  ctxWithHistory.commandHistory = ["ls", "cd Desktop"];
  const resHistory = await executeSingleCommand("history", ctxWithHistory, currentPath);
  assert(resHistory.stdout.some(l => l.includes("ls")) && resHistory.stdout.some(l => l.includes("cd Desktop")), "History command output mismatch");

  // 9. TEST_GROUPING / TEST_SUBSHELLS
  resetState();
  console.log("  [9/11] Testing Parentheses Grouping sub-shell isolation...");
  await run("(mkdir sub_demo && cd sub_demo && touch item.txt)");
  assertPath("/home/user"); // Path should remain parent path
  assert(readFile("/home/user/sub_demo/item.txt") !== null, "item.txt inside sub_demo directory should be created");

  // 10. TEST_MULTILINE
  resetState();
  console.log("  [10/11] Testing pasted multi-line command blocks...");
  await run("export USER=ankit\necho $USER");
  assert(env.USER === "ankit", "Multi-line env export failed");
  assertStdoutContains("ankit");

  // 11. TEST_EXIT_CODES
  resetState();
  console.log("  [11/11] Testing exit codes propagation...");
  const ctxExit = makeContext();
  const resSuccess = await executeSingleCommand("pwd", ctxExit, currentPath);
  assert(resSuccess.exitCode === 0, "pwd must have exitCode 0 on success");
  const resFail = await executeSingleCommand("cat missing.txt", ctxExit, currentPath);
  assert(resFail.exitCode !== 0, "cat missing.txt must have non-zero exitCode");

  // 12. TEST_OR_OUTPUT_ORDER
  resetState();
  console.log("  [12/16] Testing OR output stream ordering...");
  await run("cat missing.txt || echo recovered");
  const errIdx = historyLogs.slice(1).findIndex(log => log.includes("cat: file not found: missing.txt"));
  const succIdx = historyLogs.slice(1).findIndex(log => log.includes("recovered"));
  assert(errIdx !== -1 && succIdx !== -1 && errIdx < succIdx, `OR execution stream order mismatch. Logs: ${JSON.stringify(historyLogs)}, errIdx: ${errIdx}, succIdx: ${succIdx}`);

  // 13. TEST_SUBSHELL_ISOLATION
  resetState();
  console.log("  [13/16] Testing subshell state changes isolation...");
  await run("(export TEST_VAR=subshell_val && cd Desktop)");
  assertPath("/home/user");
  assert(env.TEST_VAR === undefined, "Subshell env variables leaked to parent context");

  // 14. TEST_APPEND_REDIRECTION
  resetState();
  console.log("  [14/16] Testing append redirection file contents...");
  await run("echo first > append_test.txt && echo second >> append_test.txt");
  const appendFile = readFile("/home/user/append_test.txt");
  assert(appendFile !== null && appendFile.content.replace(/\r\n/g, "\n").trim() === "first\nsecond", "Append redirection file mismatch");

  // 15. TEST_HISTORY_EXPANSION
  resetState();
  console.log("  [15/16] Testing history bang expansions (!! and !n)...");
  const ctxHist = makeContext();
  ctxHist.commandHistory = ["pwd", "echo hello"];
  const resHist1 = await executeSingleCommand("!!", ctxHist, currentPath);
  assert(resHist1.stdout[0] === "echo hello", "!! display expansion failed");
  assert(resHist1.stdout[1] === "hello", "!! execution failed");
  
  const resHist2 = await executeSingleCommand("!1", ctxHist, currentPath);
  assert(resHist2.stdout[0] === "pwd", "!1 display expansion failed");
  assert(resHist2.stdout[1] === "/home/user", "!1 execution failed");

  // Error case: out of bounds
  const resHistError = await executeSingleCommand("!9999", ctxHist, currentPath);
  assert(resHistError.stderr.includes("history: event not found: 9999"), "Error message format for out of bounds history expansion mismatch");

  // Loop protection & nested resolution
  const ctxHistLoop = makeContext();
  ctxHistLoop.commandHistory = ["pwd", "!!", "!!"];
  const resHistLoop = await executeSingleCommand("!!", ctxHistLoop, currentPath);
  assert(resHistLoop.stdout[0] === "pwd", "Loop protection nested resolution display failed");
  assert(resHistLoop.stdout[1] === "/home/user", "Loop protection nested resolution execution failed");

  // 16. TEST_JOB_CONTROL
  resetState();
  console.log("  [16/16] Testing simulated job control commands safety...");
  await run("jobs");
  assertStdoutContains("No background jobs.");
  await run("bg");
  assertStdoutContains("bg: no such job");
  await run("fg");
  assertStdoutContains("fg: no such job");
  const resKill = await executeSingleCommand("kill", makeContext(), currentPath);
  assert(resKill.exitCode !== 0, "kill without arguments should return non-zero exit code");

  console.log("\n✅ All 16 regression tests passed successfully!\n");
};

runAllTests().catch(err => {
  console.error("❌ Test run failed with error: ", err);
  process.exit(1);
});
