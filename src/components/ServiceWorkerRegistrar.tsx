"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/serviceWorker";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
