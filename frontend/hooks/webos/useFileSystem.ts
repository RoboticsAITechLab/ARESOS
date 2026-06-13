import { useContext } from "react";
import { FSContext } from "@/context/webos/FSContext";

export const useFileSystem = () => {
  const context = useContext(FSContext);
  if (context === undefined) {
    throw new Error("useFileSystem must be used within an FSProvider");
  }
  return context;
};
