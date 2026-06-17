import { FSDirectory, FSNode, FSFile } from "@/types/webos/fs";
import { DBNode, putNode, getAllNodes, clearAll } from "./IndexedDBStorage";

const LOCAL_STORAGE_KEY = "aresos_vfs_root";

export function treeToFlat(root: FSDirectory): DBNode[] {
  const flatNodes: DBNode[] = [];

  function traverse(node: FSNode, currentPath: string) {
    const path = currentPath === "/" ? "/" : currentPath;
    if (node.type === "directory") {
      const childrenKeys: string[] = [];
      const childrenEntries = Object.entries(node.children || {});
      for (const [name, child] of childrenEntries) {
        const childPath = path === "/" ? `/${name}` : `${path}/${name}`;
        childrenKeys.push(childPath);
        traverse(child, childPath);
      }
      flatNodes.push({
        path,
        name: node.name,
        type: "directory",
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
        content: "",
        size: 0,
        childrenKeys
      });
    } else {
      let binData = node.type === "file" ? (node as FSFile).binaryData : undefined;
      if (binData && !(binData instanceof Uint8Array)) {
        binData = new Uint8Array(Object.values(binData));
      }
      flatNodes.push({
        path,
        name: node.name,
        type: "file",
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
        content: node.content,
        size: node.size,
        extension: node.extension,
        binaryData: binData
      });
    }
  }

  traverse(root, "/");
  return flatNodes;
}

export function flatToTree(flatNodes: DBNode[]): FSDirectory {
  const nodeMap = new Map<string, DBNode>();
  for (const n of flatNodes) {
    nodeMap.set(n.path, n);
  }

  const rootDB = nodeMap.get("/");
  if (!rootDB) {
    return {
      name: "/",
      type: "directory",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      children: {}
    };
  }

  function buildNode(dbNode: DBNode): FSNode {
    if (dbNode.type === "directory") {
      const children: { [name: string]: FSNode } = {};
      const keys = dbNode.childrenKeys || [];
      for (const key of keys) {
        const childDB = nodeMap.get(key);
        if (childDB) {
          children[childDB.name] = buildNode(childDB);
        }
      }
      return {
        name: dbNode.name,
        type: "directory",
        createdAt: dbNode.createdAt,
        updatedAt: dbNode.updatedAt,
        children
      };
    } else {
      let binData = dbNode.binaryData;
      if (binData && !(binData instanceof Uint8Array)) {
        binData = new Uint8Array(Object.values(binData));
      }
      return {
        name: dbNode.name,
        type: "file",
        createdAt: dbNode.createdAt,
        updatedAt: dbNode.updatedAt,
        content: dbNode.content,
        size: dbNode.size,
        extension: dbNode.extension,
        binaryData: binData
      };
    }
  }

  return buildNode(rootDB) as FSDirectory;
}

export async function migrateLocalStorageToIndexedDB(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!saved) return false;

  try {
    const root = JSON.parse(saved) as FSDirectory;
    await clearAll();
    const flatNodes = treeToFlat(root);
    for (const node of flatNodes) {
      await putNode(node);
    }
    const readBack = await getAllNodes();
    if (readBack.length === flatNodes.length) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return true;
    }
  } catch (e) {
    console.error("Migration failed:", e);
  }
  return false;
}
