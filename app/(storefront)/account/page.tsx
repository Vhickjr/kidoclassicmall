import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import AccountProfileForm from "@/app/_components/account-profile-form";

export const metadata: Metadata = { title: "Personal Information" };

export default async function PersonalInformationPage() {
  const user = await getSessionUser();

  return (
    <div>
      <h2 className="font-semibold">Personal Information</h2>
      <AccountProfileForm user={user} />
    </div>
  );
}

