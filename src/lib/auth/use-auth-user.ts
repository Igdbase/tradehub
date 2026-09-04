"use client";

import { useContext } from "react";
import { AuthContext } from "@/components/auth/auth-provider";

export function useAuthUser() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthUser must be used inside AuthProvider.");
  }

  return context;
}
