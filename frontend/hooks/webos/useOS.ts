import { useContext } from "react";
import { OSContext } from "@/context/webos/OSContext";

export const useOS = () => {
  const context = useContext(OSContext);
  if (context === undefined) {
    throw new Error("useOS must be used within an OSProvider");
  }
  return context;
};
