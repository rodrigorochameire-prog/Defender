import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { TutorSidebar } from "@/components/layouts/tutor-sidebar";

export default async function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <TutorSidebar userName={session.name} userEmail={session.email}>
      {children}
    </TutorSidebar>
  );
}
