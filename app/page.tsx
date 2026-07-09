import { redirect } from "next/navigation";

export default function Home() {
  // /news was retired 2026-07-08 (see layout.tsx); /calendar is the real
  // landing page now -- content calendar + screenshot/inspo galleries.
  redirect("/calendar");
}
