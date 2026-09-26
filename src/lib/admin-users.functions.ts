import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLE_VALUES = ["super_admin", "admin", "operator", "technician", "customer", "operations_manager", "sales", "consultant", "support", "finance", "content_manager"] as const;
const STATUS_VALUES = ["active", "pending", "suspended", "disabled", "locked"] as const;

type Ctx = { supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "super_admin" }) => PromiseLike<{ data: unknown }> }; userId: string };

async function assertSuperAdmin(context: Ctx) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" });
  if (data !== true) throw new Error("Only the super admin can do this");
}

async function audit(actor: string, action: string, recordId: string, details: Record<string, unknown>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("audit_logs").insert({ actor_id: actor, action, table_name: "users", record_id: recordId, details: details as never });
}

/** Last sign-in and email-confirmed time for every account (from the sign-in system). */
export const listAuthMeta = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const out: Record<string, { last_sign_in_at: string | null; confirmed: boolean; banned: boolean }> = {};
    for (let page = 1; page < 50; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      for (const u of data.users) {
        const bannedUntil = (u as { banned_until?: string | null }).banned_until;
        out[u.id] = { last_sign_in_at: u.last_sign_in_at ?? null, confirmed: !!u.email_confirmed_at, banned: !!bannedUntil && new Date(bannedUntil) > new Date() };
      }
      if (data.users.length < 200) break;
    }
    return out;
  });

const createSchema = z.object({
  first_name: z.string().trim().min(1).max(60),
  last_name: z.string().trim().min(1).max(60),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30).optional().default(""),
  username: z.string().trim().max(40).regex(/^[a-zA-Z0-9_.-]*$/, "Username: letters, numbers, . _ - only").optional().default(""),
  company_name: z.string().trim().max(120).optional().default(""),
  job_title: z.string().trim().max(120).optional().default(""),
  country: z.string().trim().max(80).optional().default(""),
  city: z.string().trim().max(80).optional().default(""),
  address: z.string().trim().max(250).optional().default(""),
  mode: z.enum(["password", "invite"]),
  password: z.string().max(72).optional().default(""),
  account_status: z.enum(STATUS_VALUES),
  roles: z.array(z.enum(ROLE_VALUES)).min(1).max(11),
});

export const createUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as unknown as Ctx);
    if (data.mode === "password" && data.password.length < 8) throw new Error("Password must be at least 8 characters");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const full_name = `${data.first_name} ${data.last_name}`;
    const res = data.mode === "invite"
      ? await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, { data: { full_name } })
      : await supabaseAdmin.auth.admin.createUser({ email: data.email, password: data.password, email_confirm: true, user_metadata: { full_name } });
    if (res.error || !res.data.user) throw new Error(res.error?.message ?? "Could not create user");
    const id = res.data.user.id;
    const { error: pe } = await supabaseAdmin.from("profiles").update({
      full_name, phone: data.phone || null, username: data.username || null, company_name: data.company_name || null,
      job_title: data.job_title || null, country: data.country || null, city: data.city || null, address: data.address || null,
      account_status: data.account_status,
    }).eq("id", id);
    if (pe) throw new Error(pe.message);
    // signup trigger gave "customer"; replace with chosen roles
    await supabaseAdmin.from("user_roles").delete().eq("user_id", id);
    const { error: re } = await supabaseAdmin.from("user_roles").insert(data.roles.map((role) => ({ user_id: id, role })));
    if (re) throw new Error(re.message);
    await audit(context.userId, "create_user", id, { email: data.email, roles: data.roles, mode: data.mode, status: data.account_status });
    return { id };
  });

export const setAccountStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), status: z.enum(STATUS_VALUES), reason: z.string().max(300).optional().default("") }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as unknown as Ctx);
    if (data.userId === context.userId) throw new Error("You can't change your own account status");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update({ account_status: data.status, status_reason: data.reason || null }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    // Blocked statuses are also banned at sign-in level so existing sessions can't refresh
    const blocked = data.status === "suspended" || data.status === "disabled" || data.status === "locked";
    const { error: be } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: blocked ? "876000h" : "none" });
    if (be) throw new Error(be.message);
    await audit(context.userId, "status_change", data.userId, { status: data.status, reason: data.reason || null });
    return { ok: true };
  });

export const sendPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), redirectTo: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u, error } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (error || !u.user?.email) throw new Error(error?.message ?? "User has no email");
    const { createClient } = await import("@supabase/supabase-js");
    const pub = createClient(process.env['SUPABASE_URL']!, (process.env['SUPABASE_PUBLISHABLE_KEY'] ?? process.env['SUPABASE_ANON_KEY'])!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: e2 } = await pub.auth.resetPasswordForEmail(u.user.email, { redirectTo: data.redirectTo });
    if (e2) throw new Error(e2.message);
    await audit(context.userId, "password_reset_sent", data.userId, {});
    return { ok: true };
  });

const editSchema = z.object({
  userId: z.string().uuid(),
  full_name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(30),
  username: z.string().trim().max(40).regex(/^[a-zA-Z0-9_.-]*$/),
  company_name: z.string().trim().max(120),
  job_title: z.string().trim().max(120),
  country: z.string().trim().max(80),
  city: z.string().trim().max(80),
  address: z.string().trim().max(250),
});

export const editUserProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => editSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId, ...rest } = data;
    const clean = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v === "" && k !== "full_name" ? null : v]));
    const { error } = await supabaseAdmin.from("profiles").update(clean as never).eq("id", userId);
    if (error) throw new Error(error.message.includes("username") ? "That username is taken" : error.message);
    await audit(context.userId, "edit_profile", userId, { fields: Object.keys(rest) });
    return { ok: true };
  });
