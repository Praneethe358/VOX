import { useEffect, useState } from "react";
import { bridge } from "../api/bridge";

export function useKiosk() {
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    void bridge.getKioskStatus().then(setIsLocked);
  }, []);

  return { isLocked };
}
