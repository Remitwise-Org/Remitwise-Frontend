"use client";

import { useEffect } from "react";
import { registerUnhandledRejectionHandler } from "@/lib/client/unhandledRejection";

/** Reports unhandled promise rejections through the shared error reporter. Renders nothing. */
export default function UnhandledRejectionListener() {
  useEffect(() => {
    return registerUnhandledRejectionHandler();
  }, []);

  return null;
}
