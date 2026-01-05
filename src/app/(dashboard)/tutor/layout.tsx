import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { TutorSidebar } from "@/components/layouts/tutor-sidebar";

export default async function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  const userName = user?.firstName || user?.emailAddresses[0]?.emailAddress?.split("@")[0] || "Tutor";
  const userEmail = user?.emailAddresses[0]?.emailAddress || "";

  return (
    <TutorSidebar userName={userName} userEmail={userEmail}>
      {children}
    </TutorSidebar>
  );
}
