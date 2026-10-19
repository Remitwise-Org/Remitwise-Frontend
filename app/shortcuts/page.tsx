import type { Metadata } from "next";
import ShortcutsCheatSheet from "@/components/ShortcutsCheatSheet";

export const metadata: Metadata = {
  title: "Keyboard Shortcuts - RemitWise",
  description:
    "Printable cheat sheet of every RemitWise keyboard shortcut for navigation, command palette, and overlays.",
};

export default function ShortcutsPage() {
  return <ShortcutsCheatSheet />;
}
