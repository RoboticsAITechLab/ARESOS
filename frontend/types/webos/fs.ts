export type FSNodeType = "file" | "directory";

export interface BaseFSNode {
  name: string;
  type: FSNodeType;
  createdAt: number;
  updatedAt: number;
}

export interface FSFile extends BaseFSNode {
  type: "file";
  content: string;
  size: number;
  extension?: string;
  binaryData?: Uint8Array;
}

export interface FSDirectory extends BaseFSNode {
  type: "directory";
  children: { [name: string]: FSNode };
}

export type FSNode = FSFile | FSDirectory;

export interface FileSystemState {
  root: FSDirectory;
  currentPath: string; // E.g., "/home/user"
}
