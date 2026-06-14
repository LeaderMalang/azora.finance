"use client";
import { createContext, useContext } from "react";

export const SidebarContext = createContext({ open: false, toggle: () => {} });
export const useSidebar = () => useContext(SidebarContext);
