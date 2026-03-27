import { redirect } from "next/navigation"

// /dashboard → /personal (main admin section)
export default function DashboardRedirectPage() {
  redirect("/personal")
}
