export interface PropertyNode {
  name: string;
  type: string;
  path: string;
  size: number;
  createdAt: number;
  updatedAt: number;
  permissions: {
    read: boolean;
    write: boolean;
    execute: boolean;
  };
}
