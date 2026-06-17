import { FSNode, FSFile } from "@/types/webos/fs";
import { DBNode, putNode, deleteNodeFromDB } from "./IndexedDBStorage";

export async function persistNodeUpdate(path: string, node: FSNode): Promise<void> {
  const childrenKeys = node.type === "directory" && node.children 
    ? Object.keys(node.children).map(name => path === "/" ? `/${name}` : `${path}/${name}`)
    : undefined;

  let binData = node.type === "file" ? (node as FSFile).binaryData : undefined;
  if (binData && !(binData instanceof Uint8Array)) {
    binData = new Uint8Array(Object.values(binData));
  }

  const dbNode: DBNode = {
    path,
    name: node.name,
    type: node.type,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    content: node.type === "file" ? node.content : "",
    size: node.type === "file" ? node.size : 0,
    extension: node.type === "file" ? node.extension : undefined,
    binaryData: binData,
    childrenKeys
  };

  await putNode(dbNode);
}

export async function persistNodeDelete(path: string): Promise<void> {
  await deleteNodeFromDB(path);
}
export { getStorageStats } from "./IndexedDBStorage";
