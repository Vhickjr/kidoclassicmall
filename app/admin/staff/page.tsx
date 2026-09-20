import type { Metadata } from "next";
import { getPrisma } from "@/lib/prisma";
import { getSessionUser, requireSuperAdmin } from "@/lib/auth";
import PasswordInput from "@/app/_components/password-input";
import { createStaff, setUserActive, setUserRole } from "@/app/_actions/staff";

export const metadata: Metadata = { title: "Staff & roles" };

const ROLE_COPY: Record<string, string> = {
  CUSTOMER: "Shops. No admin access.",
  ADMIN: "Products, orders, categories, discounts, reviews.",
  SUPER_ADMIN: "Everything, including this page.",
};

export default async function AdminStaffPage() {
  // This page is the one place staff access is granted, so it is super-admin
  // only — an ADMIN can run the shop but cannot promote themselves.
  if (!(await requireSuperAdmin())) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Staff &amp; roles</h1>
        <p className="mt-4 max-w-xl text-sm text-muted">
          Only a super admin can change who the staff are. Ask one to make the
          change, or sign in with a super admin account.
        </p>
      </div>
    );
  }

  const me = await getSessionUser();

  const users = await getPrisma().user.findMany({
    orderBy: [{ role: "desc" }, { createdAt: "asc" }],
    take: 200,
  });

  const staff = users.filter((user) => user.role !== "CUSTOMER");
  const customers = users.filter((user) => user.role === "CUSTOMER");

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Staff &amp; roles</h1>

      <ul className="mt-6 grid gap-3 sm:grid-cols-3">
        {Object.entries(ROLE_COPY).map(([role, copy]) => (
          <li key={role} className="border border-line p-4">
            <p className="text-sm font-semibold">{role}</p>
            <p className="mt-1 text-sm text-muted">{copy}</p>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 font-semibold">Add a staff account</h2>
      <form action={createStaff} className="mt-4 flex max-w-3xl flex-wrap gap-3">
        <label className="min-w-40 flex-1">
          <span className="text-xs text-muted">Name</span>
          <input
            name="firstName"
            className="mt-1.5 w-full border border-line px-3 py-2.5 text-sm"
          />
        </label>
        <label className="min-w-48 flex-1">
          <span className="text-xs text-muted">Email</span>
          <input
            name="email"
            type="email"
            required
            className="mt-1.5 w-full border border-line px-3 py-2.5 text-sm"
          />
        </label>
        <label className="min-w-40 flex-1">
          <span className="text-xs text-muted">Password (min 8)</span>
          <span className="mt-1.5 block">
            <PasswordInput
              name="password"
              required
              minLength={8}
              className="w-full border border-line px-3 py-2.5 text-sm"
            />
          </span>
        </label>
        <label className="w-40">
          <span className="text-xs text-muted">Role</span>
          <select
            name="role"
            defaultValue="ADMIN"
            className="mt-1.5 w-full border border-line px-3 py-2.5 text-sm"
          >
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super admin</option>
          </select>
        </label>
        <button
          type="submit"
          className="self-end bg-brand px-6 py-2.5 text-sm text-white"
        >
          Create
        </button>
      </form>

      <h2 className="mt-12 font-semibold">Staff ({staff.length})</h2>
      <UserTable users={staff} meId={me?.id} />

      <h2 className="mt-12 font-semibold">Customers ({customers.length})</h2>
      <UserTable users={customers} meId={me?.id} />
    </div>
  );
}

type Row = {
  id: string;
  email: string;
  firstName: string | null;
  role: string;
  isActive: boolean;
};

function UserTable({ users, meId }: { users: Row[]; meId: string | undefined }) {
  if (users.length === 0) {
    return <p className="mt-4 text-sm text-muted">Nobody here yet.</p>;
  }

  return (
    <ul className="mt-4 divide-y divide-line border-y border-line">
      {users.map((user) => {
        const isMe = user.id === meId;

        return (
          <li key={user.id} className="flex flex-wrap items-center gap-4 py-4">
            <div className="min-w-48 flex-1">
              <p className="text-sm font-semibold">
                {user.firstName ?? "No name"}
                {isMe && <span className="ml-2 text-xs text-muted">(you)</span>}
              </p>
              <p className="mt-0.5 text-sm text-muted">{user.email}</p>
            </div>

            <span
              className={`px-2 py-1 text-xs ${
                user.isActive ? "bg-green-100 text-green-800" : "bg-line text-muted"
              }`}
            >
              {user.isActive ? "Active" : "Disabled"}
            </span>

            <form action={setUserRole} className="flex items-center gap-2">
              <input type="hidden" name="userId" value={user.id} />
              <select
                name="role"
                defaultValue={user.role}
                aria-label={`Role for ${user.email}`}
                className="border border-line px-2 py-1.5 text-sm"
              >
                <option value="CUSTOMER">Customer</option>
                <option value="ADMIN">Admin</option>
                <option value="SUPER_ADMIN">Super admin</option>
              </select>
              <button type="submit" className="text-sm underline">
                Set
              </button>
            </form>

            <form action={setUserActive}>
              <input type="hidden" name="userId" value={user.id} />
              <input
                type="hidden"
                name="active"
                value={user.isActive ? "false" : "true"}
              />
              <button
                type="submit"
                disabled={isMe}
                className="text-sm underline disabled:opacity-30"
              >
                {user.isActive ? "Disable" : "Enable"}
              </button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
