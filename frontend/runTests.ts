class MockIDBRequest {
  result: any;
  error: any = null;
  onsuccess: any = null;
  onerror: any = null;
}

class MockIDBOpenRequest extends MockIDBRequest {
  onupgradeneeded: any = null;
}

class MockIDBObjectStore {
  name: string;
  data = new Map<string, any>();

  constructor(name: string) {
    this.name = name;
  }

  put(value: any, key?: any) {
    const k = key !== undefined ? key : value.path;
    this.data.set(String(k), value);
    const req = new MockIDBRequest();
    req.result = k;
    setTimeout(() => { if (req.onsuccess) req.onsuccess(); }, 0);
    return req as any;
  }

  get(key: any) {
    const req = new MockIDBRequest();
    req.result = this.data.get(String(key));
    setTimeout(() => { if (req.onsuccess) req.onsuccess(); }, 0);
    return req as any;
  }

  getAll() {
    const req = new MockIDBRequest();
    req.result = Array.from(this.data.values());
    setTimeout(() => { if (req.onsuccess) req.onsuccess(); }, 0);
    return req as any;
  }

  delete(key: any) {
    this.data.delete(String(key));
    const req = new MockIDBRequest();
    setTimeout(() => { if (req.onsuccess) req.onsuccess(); }, 0);
    return req as any;
  }

  clear() {
    this.data.clear();
    const req = new MockIDBRequest();
    setTimeout(() => { if (req.onsuccess) req.onsuccess(); }, 0);
    return req as any;
  }
}

class MockIDBTransaction {
  db: any;
  oncomplete: any = null;
  onerror: any = null;
  
  constructor(db: any) {
    this.db = db;
    setTimeout(() => { if (this.oncomplete) this.oncomplete(); }, 0);
  }

  objectStore(name: string) {
    return this.db.stores[name];
  }
}

class MockIDBDatabase {
  objectStoreNames = {
    list: ["filesystem", "metadata", "settings", "archives"],
    contains(name: string) {
      return this.list.includes(name);
    }
  };
  stores: Record<string, MockIDBObjectStore> = {
    filesystem: new MockIDBObjectStore("filesystem"),
    metadata: new MockIDBObjectStore("metadata"),
    settings: new MockIDBObjectStore("settings"),
    archives: new MockIDBObjectStore("archives")
  };

  transaction(storeNames: any, mode?: any) {
    return new MockIDBTransaction(this) as any;
  }

  close() {}
}

const mockDbInstance = new MockIDBDatabase();

const mockIDBFactory = {
  open(name: string, version?: number) {
    const req = new MockIDBOpenRequest();
    req.result = mockDbInstance;
    setTimeout(() => {
      if (req.onupgradeneeded) req.onupgradeneeded({} as any);
      if (req.onsuccess) req.onsuccess();
    }, 0);
    return req as any;
  }
};

(globalThis as any).indexedDB = mockIDBFactory;

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
let oldRoot = JSON.parse(JSON.stringify(root));

let simulatedQuotaException: string | null = null;

async function persistTreeDiff(oldTree: FSDirectory, newTree: FSDirectory) {
  const oldPaths = new Set<string>();
  const newPaths = new Set<string>();
  const oldMap = new Map<string, FSNode>();
  const newMap = new Map<string, FSNode>();

  function collectPaths(node: FSNode, currentPath: string, paths: Set<string>, map: Map<string, FSNode>) {
    const path = currentPath;
    paths.add(path);
    map.set(path, node);
    if (node.type === "directory" && node.children) {
      for (const [name, child] of Object.entries(node.children)) {
        const childPath = path === "/" ? `/${name}` : `${path}/${name}`;
        collectPaths(child, childPath, paths, map);
      }
    }
  }

  collectPaths(oldTree, "/", oldPaths, oldMap);
  collectPaths(newTree, "/", newPaths, newMap);

  const { persistNodeUpdate, persistNodeDelete } = require("./utils/webos/storage/StorageManager");

  if (simulatedQuotaException) {
    throw new Error(simulatedQuotaException);
  }

  const completedOps: { type: "delete" | "update"; path: string; oldNode?: FSNode }[] = [];

  try {
    for (const path of oldPaths) {
      if (!newPaths.has(path)) {
        console.log("TEST PERSIST DELETE:", path);
        await persistNodeDelete(path);
        completedOps.push({ type: "delete", path, oldNode: oldMap.get(path) });
      }
    }

    for (const path of newPaths) {
      const newNode = newMap.get(path)!;
      const oldNode = oldMap.get(path);
      const hasChanged = !oldNode || 
                         oldNode.type !== newNode.type || 
                         oldNode.updatedAt !== newNode.updatedAt ||
                         (oldNode.type === "file" && (oldNode as FSFile).content !== (newNode as FSFile).content);
      if (hasChanged) {
        console.log("TEST PERSIST UPDATE:", path, newNode.type);
        await persistNodeUpdate(path, newNode);
        completedOps.push({ type: "update", path, oldNode });
      }
    }
  } catch (err) {
    // DB Rollback
    for (const op of completedOps.reverse()) {
      try {
        if (op.type === "delete" && op.oldNode) {
          await persistNodeUpdate(op.path, op.oldNode);
        } else if (op.type === "update") {
          if (op.oldNode) {
            await persistNodeUpdate(op.path, op.oldNode);
          } else {
            await persistNodeDelete(op.path);
          }
        }
      } catch (rErr) {}
    }
    throw err;
  }
}

let pendingSyncPromise: Promise<void> = Promise.resolve();

function syncToIndexedDB() {
  const currentRoot = JSON.parse(JSON.stringify(root));
  console.log("syncToIndexedDB called");
  const promise = persistTreeDiff(oldRoot, currentRoot).then(() => {
    oldRoot = currentRoot;
  }).catch(err => {
    // Rollback in-memory tree in test runner
    root = JSON.parse(JSON.stringify(oldRoot));
    throw err;
  });
  pendingSyncPromise = promise;
  if (typeof window !== "undefined") {
    (window as any).aresos_last_vfs_sync = promise;
  }
}

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
    if (node.binaryData && !(node.binaryData instanceof Uint8Array)) {
      node.binaryData = new Uint8Array(Object.values(node.binaryData));
    } else if (!node.binaryData && (node.extension === "zip" || node.name.endsWith(".zip"))) {
      const arr = new Uint8Array(node.content.length);
      for (let i = 0; i < node.content.length; i++) {
        arr[i] = node.content.charCodeAt(i) & 0xff;
      }
      node.binaryData = arr;
    }
    return node;
  }
  return null;
};

const writeFile = (filePath: string, content: string | Uint8Array): boolean => {
  const segments = parsePath(filePath);
  if (segments.length === 0) return false;
  const fileName = segments[segments.length - 1];
  const parentSegments = segments.slice(0, -1);
  const parentNode = findNode(root, parentSegments);
  if (parentNode && parentNode.type === "directory") {
    const ext = fileName.includes(".") ? fileName.split(".").pop() : undefined;
    
    let contentStr = "";
    let binData: Uint8Array | undefined;

    if (content instanceof Uint8Array) {
      binData = content;
      for (let i = 0; i < content.length; i++) {
        contentStr += String.fromCharCode(content[i]);
      }
    } else {
      contentStr = content;
      if (content.startsWith("PK\x03\x04") || content.startsWith("PK\u0003\u0004") || fileName.endsWith(".zip")) {
        binData = new Uint8Array(content.length);
        for (let i = 0; i < content.length; i++) {
          binData[i] = content.charCodeAt(i) & 0xff;
        }
      }
    }

    parentNode.children[fileName] = {
      name: fileName,
      type: "file",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      content: contentStr,
      size: binData ? binData.length : contentStr.length,
      extension: ext,
      binaryData: binData,
    };
    syncToIndexedDB();
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
    syncToIndexedDB();
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
      syncToIndexedDB();
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
      syncToIndexedDB();
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
  await pendingSyncPromise;
};

// Reset state between tests
const resetState = () => {
  root = JSON.parse(JSON.stringify(INITIAL_FS));
  oldRoot = JSON.parse(JSON.stringify(root));
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
  
  const ctxKill = makeContext();
  const resKill = await executeSingleCommand("kill", ctxKill, currentPath);
  assert(resKill.exitCode !== 0, "kill without arguments should return non-zero exit code");

  // Valid PID (12)
  const resKillValid = await executeSingleCommand("kill 12", ctxKill, currentPath);
  assert(resKillValid.success, "kill 12 should succeed");
  assert(resKillValid.stdout.includes("Process terminated."), "kill 12 output mismatch");

  // Invalid PID (999)
  const resKillInvalid = await executeSingleCommand("kill 999", ctxKill, currentPath);
  assert(!resKillInvalid.success, "kill 999 should fail");
  assert(resKillInvalid.stderr.includes("kill: process not found: 999"), "kill 999 error message mismatch");

  // Protected PID (1)
  const resKillProtected = await executeSingleCommand("kill 1", ctxKill, currentPath);
  assert(!resKillProtected.success, "kill 1 should fail");
  assert(resKillProtected.stderr.includes("kill: cannot terminate root system process: 1"), "kill 1 error message mismatch");

  // Nohup simulation not available
  const resNohup = await executeSingleCommand("nohup echo hello", ctxKill, currentPath);
  assert(!resNohup.success, "nohup should return failure");
  assert(resNohup.stderr.includes("nohup: background job simulation not available"), "nohup error message mismatch");

  // 17. TEST_FILESYSTEM_UTILITIES (cp and mv correctness)
  resetState();
  console.log("  [17] Testing cp and mv correctness (file vs directory checks)...");
  
  // Create test structure
  await run("touch a.txt");
  await run("write a.txt hello");
  await run("mkdir docs");
  await run("touch docs/b.txt");
  await run("write docs/b.txt world");

  // cp file
  await run("cp a.txt copy.txt");
  assertStdoutContains("Copied file 'a.txt' to 'copy.txt'");
  assert(readFile("/home/user/copy.txt")?.content === "hello", "cp file content mismatch");

  // cp directory
  await run("cp docs backup");
  assertStdoutContains("Copied directory 'docs' recursively to 'backup'");
  assert(readFile("/home/user/backup/b.txt")?.content === "world", "cp directory content mismatch");

  // mv nonexistent
  const resMvNonexistent = await executeSingleCommand("mv missing.txt dest.txt", makeContext(), currentPath);
  assert(!resMvNonexistent.success, "mv nonexistent source should fail");
  assert(resMvNonexistent.stderr.includes("mv: source not found: missing.txt"), "mv nonexistent error message mismatch");

  // mv file
  await run("mv a.txt renamed.txt");
  assert(readFile("/home/user/a.txt") === null, "mv source file should be deleted");
  assert(readFile("/home/user/renamed.txt")?.content === "hello", "mv destination file content mismatch");

  // 18. TEST_ARCHIVE_SYSTEM (zip, unzip, zipinfo)
  resetState();
  console.log("  [18] Testing real virtual zip, unzip, and zipinfo engine...");
  
  // Create test files
  await run("touch notes.txt");
  await run("write notes.txt importantinfo");
  await run("mkdir src");
  await run("touch src/main.ts");
  await run("write src/main.ts \"console.log('hello')\"");

  // zip file and directory
  await run("zip backup.zip notes.txt src");
  assertStdoutContains("backup.zip created in current directory");

  // zipinfo
  const ctxZipInfo = makeContext();
  const resZipInfo = await executeSingleCommand("zipinfo backup.zip", ctxZipInfo, currentPath);
  assert(resZipInfo.success, "zipinfo should succeed");
  assert(resZipInfo.stdout.some(l => l.includes("Archive Name: backup.zip")), "zipinfo archive name mismatch");
  assert(resZipInfo.stdout.some(l => l.includes("Files Count: 2")), "zipinfo files count mismatch");
  assert(resZipInfo.stdout.some(l => l.includes("Directories Count: 1")), "zipinfo directories count mismatch"); // src/

  // unzip list
  const resUnzipList = await executeSingleCommand("unzip -l backup.zip", ctxZipInfo, currentPath);
  assert(resUnzipList.success, "unzip -l should succeed");
  assert(resUnzipList.stdout.some(l => l.includes("notes.txt")), "unzip -l list mismatch");
  assert(resUnzipList.stdout.some(l => l.includes("src/main.ts")), "unzip -l list mismatch");

  // delete original files
  await run("rm notes.txt");
  await run("rm src/main.ts");
  await run("rm src");

  // unzip extract
  await run("unzip backup.zip");
  assertStdoutContains("notes.txt restored.");
  assert(readFile("/home/user/notes.txt")?.content === "importantinfo", "unzipped file content mismatch");
  assert(readFile("/home/user/src/main.ts")?.content === "console.log('hello')", "unzipped directory file content mismatch");

  // unzip overwrite protection
  const resUnzipOverwriteFail = await executeSingleCommand("unzip backup.zip", ctxZipInfo, currentPath);
  assert(!resUnzipOverwriteFail.success, "unzip without -o on existing file should fail");
  assert(resUnzipOverwriteFail.stdout.includes("replace notes.txt? [y/n]"), "unzip prompt mismatch");

  // unzip force overwrite
  const resUnzipOverwriteSuccess = await executeSingleCommand("unzip -o backup.zip", ctxZipInfo, currentPath);
  assert(resUnzipOverwriteSuccess.success, "unzip -o should succeed");

  // 19. TEST_EXTERNAL_ZIP
  resetState();
  console.log("  [19] Testing standard PKZIP file compatibility...");
  
  // Construct standard PKZIP in memory
  const zipBytes = new Uint8Array([
    0x50, 0x4B, 0x03, 0x04, // signature
    0x0a, 0x00,             // version
    0x00, 0x00,             // flags
    0x00, 0x00,             // compression (0 = store)
    0x00, 0x00,             // mod time
    0x00, 0x00,             // mod date
    0x00, 0x00, 0x00, 0x00, // crc32
    0x05, 0x00, 0x00, 0x00, // compressed size (5)
    0x05, 0x00, 0x00, 0x00, // uncompressed size (5)
    0x08, 0x00,             // name length (8)
    0x00, 0x00,             // extra length (0)
    // filename: "test.txt"
    0x74, 0x65, 0x73, 0x74, 0x2e, 0x74, 0x78, 0x74,
    // content: "hello"
    0x68, 0x65, 0x6c, 0x6c, 0x6f
  ]);

  writeFile("external.zip", zipBytes);

  // check zipinfo
  const ctxExt = makeContext();
  const resExtInfo = await executeSingleCommand("zipinfo external.zip", ctxExt, currentPath);
  assert(resExtInfo.success, "zipinfo on external zip should succeed");
  assert(resExtInfo.stdout.some(l => l.includes("Files Count: 1")), "zipinfo files count mismatch on external zip");
  assert(resExtInfo.stdout.some(l => l.includes("Total Size: 5 bytes")), "zipinfo total size mismatch on external zip");

  // check unzip -l
  const resExtList = await executeSingleCommand("unzip -l external.zip", ctxExt, currentPath);
  assert(resExtList.success, "unzip -l on external zip should succeed");
  assert(resExtList.stdout.some(l => l.includes("test.txt")), "unzip -l listing mismatch on external zip");

  // check unzip extract
  await run("unzip external.zip");
  assertStdoutContains("test.txt restored.");
  assert(readFile("/home/user/test.txt")?.content === "hello", "unzip external zip content mismatch");

  // 20. TEST_INDEXEDDB_PERSISTENCE
  resetState();
  console.log("  [20] Testing IndexedDB persistence...");
  await run("touch test_idb.txt && write test_idb.txt persistent");
  // Ensure that all background sync operations have settled
  await pendingSyncPromise;
  await new Promise(r => setTimeout(r, 100));
  const allDBNodes = await mockDbInstance.stores.filesystem.getAll().result;
  assert(allDBNodes.some((n: any) => n.path === "/home/user/test_idb.txt" && n.content === "persistent"), "IndexedDB persistence failed to write test_idb.txt");

  // 21. TEST_BINARY_FILE_STORAGE
  resetState();
  console.log("  [21] Testing binary file storage...");
  const binBytes = new Uint8Array([0x00, 0xFF, 0xAA, 0x55]);
  writeFile("binary.bin", binBytes);
  const readBin = readFile("/home/user/binary.bin");
  assert(readBin !== null && readBin.binaryData instanceof Uint8Array, "VFS node binaryData is not Uint8Array");
  const binData = readBin?.binaryData;
  assert(binData !== undefined && binData[1] === 0xFF, "Binary data byte mismatch");

  // 22. TEST_ZIP_EXTRACTION_1MB
  resetState();
  console.log("  [22] Testing 1MB ZIP extraction...");
  const oneMB = new Uint8Array(1024 * 1024);
  oneMB.fill(65);
  writeFile("large.txt", oneMB);
  await run("zip large.zip large.txt");
  await run("rm large.txt");
  await run("unzip large.zip");
  const restoredLarge = readFile("/home/user/large.txt");
  assert(restoredLarge !== null && restoredLarge.size === 1024 * 1024, "1MB ZIP extraction failed");

  // 23. TEST_ZIP_EXTRACTION_10MB
  resetState();
  console.log("  [23] Testing 10MB ZIP extraction...");
  const tenMB = new Uint8Array(10 * 1024 * 1024);
  tenMB.fill(66);
  writeFile("huge.txt", tenMB);
  await run("zip huge.zip huge.txt");
  await run("rm huge.txt");
  await run("unzip huge.zip");
  const restoredHuge = readFile("/home/user/huge.txt");
  assert(restoredHuge !== null && restoredHuge.size === 10 * 1024 * 1024, "10MB ZIP extraction failed");

  // 24. TEST_STORAGE_QUOTA_REPORTING
  resetState();
  console.log("  [24] Testing storage quota reporting...");
  const ctxQuota = makeContext();
  const resQuota = await executeSingleCommand("storageinfo", ctxQuota, currentPath);
  assert(resQuota.success, "storageinfo command failed");
  assert(resQuota.stdout.some(l => l.includes("Storage Backend:")), "storageinfo output missing Backend");
  assert(resQuota.stdout.some(l => l.includes("Quota:")), "storageinfo output missing Quota");

  // 25. TEST_VFS_MIGRATION
  resetState();
  console.log("  [25] Testing VFS migration...");
  const mockTree = {
    name: "/",
    type: "directory" as const,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    children: {
      "migrated.txt": {
        name: "migrated.txt",
        type: "file" as const,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        content: "migrated_data",
        size: 13
      }
    }
  };
  class MockLocalStorage {
    store: Record<string, string> = {};
    getItem(key: string) { return this.store[key] || null; }
    setItem(key: string, val: string) { this.store[key] = val; }
    removeItem(key: string) { delete this.store[key]; }
  }
  const mockLS = new MockLocalStorage();
  mockLS.setItem("aresos_vfs_root", JSON.stringify(mockTree));
  (globalThis as any).localStorage = mockLS;
  (globalThis as any).window = { indexedDB: mockIDBFactory };

  const { migrateLocalStorageToIndexedDB } = require("./utils/webos/storage/VFSPersistence");
  const migrationResult = await migrateLocalStorageToIndexedDB();
  assert(migrationResult === true, "VFS migration function returned false");
  assert(mockLS.getItem("aresos_vfs_root") === null, "Legacy VFS root not removed from localStorage after migration");

  const readMigrated = await mockDbInstance.stores.filesystem.get("/migrated.txt").result;
  assert(readMigrated !== undefined && readMigrated.content === "migrated_data", "Migrated node not found in IndexedDB");

  // 26. TEST_QUOTA_TOUCH
  resetState();
  console.log("  [26] Testing touch quota rollback...");
  simulatedQuotaException = "QuotaExceededError";
  try {
    await run("touch quota_file.txt");
    assert(false, "touch command should have failed under simulated QuotaExceededError");
  } catch (e) {}
  simulatedQuotaException = null;
  assert(readFile("/home/user/quota_file.txt") === null, "touch: file was created in VFS despite quota failure");

  // 27. TEST_QUOTA_WRITE
  resetState();
  console.log("  [27] Testing write quota rollback...");
  await run("touch write_quota.txt");
  simulatedQuotaException = "QuotaExceededError";
  try {
    await run("write write_quota.txt newcontent");
    assert(false, "write command should have failed under simulated QuotaExceededError");
  } catch (e) {}
  simulatedQuotaException = null;
  assert(readFile("/home/user/write_quota.txt")?.content === "", "write: file content mutated in VFS despite quota failure");

  // 28. TEST_QUOTA_RM
  resetState();
  console.log("  [28] Testing rm quota rollback...");
  await run("touch rm_quota.txt");
  simulatedQuotaException = "QuotaExceededError";
  try {
    await run("rm rm_quota.txt");
    assert(false, "rm command should have failed under simulated QuotaExceededError");
  } catch (e) {}
  simulatedQuotaException = null;
  assert(readFile("/home/user/rm_quota.txt") !== null, "rm: file was deleted from VFS despite quota failure");

  // 29. TEST_QUOTA_ZIP
  resetState();
  console.log("  [29] Testing zip quota rollback...");
  await run("touch restore.txt && write restore.txt hello");
  simulatedQuotaException = "QuotaExceededError";
  try {
    await run("zip backup.zip restore.txt");
    assert(false, "zip command should have failed under simulated QuotaExceededError");
  } catch (e) {}
  simulatedQuotaException = null;
  assert(readFile("/home/user/backup.zip") === null, "zip: archive was created in VFS despite quota failure");

  // 30. TEST_QUOTA_UNZIP
  resetState();
  console.log("  [30] Testing unzip quota rollback...");
  await run("touch restore.txt && write restore.txt hello && zip backup.zip restore.txt && rm restore.txt");
  simulatedQuotaException = "QuotaExceededError";
  try {
    await run("unzip backup.zip");
    assert(false, "unzip command should have failed under simulated QuotaExceededError");
  } catch (e) {}
  simulatedQuotaException = null;
  assert(readFile("/home/user/restore.txt") === null, "unzip: files extracted/mutated in VFS despite quota failure");

  console.log("\n✅ All 30 regression tests passed successfully!\n");
};

runAllTests().catch(err => {
  console.error("❌ Test run failed with error: ", err);
  process.exit(1);
});
