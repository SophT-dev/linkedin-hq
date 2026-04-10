import { redirect } from "next/navigation";

// Stripped: legacy dashboard removed from the main flow.
// Old code lives in git history. Root lands on the batch engine.
export default function Home() {
  redirect("/batch");
}
