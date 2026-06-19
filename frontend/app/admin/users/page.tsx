"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ClinicalShell } from "@/components/clinical/ClinicalShell";
import { PersonaGuard } from "@/components/clinical/PersonaGuard";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { AdminUserRecord } from "@/app/api/admin/users/route";
import { fetchWithTimeout } from "@/lib/api/fetch-with-timeout";
import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";
import type { ClinicalPersona } from "@/types";

type FormState = {
  email: string;
  displayName: string;
  password: string;
  role: Exclude<ClinicalPersona, never>;
};

const emptyForm: FormState = {
  email: "",
  displayName: "",
  password: "",
  role: "coordinator",
};

export default function AdminUsersPage() {
  const { locale } = useLocale();
  const ui = useClinicalUi();
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithTimeout("/api/admin/users");
      const payload = (await response.json()) as { users?: AdminUserRecord[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load users.");
      }
      setUsers(payload.users ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetchWithTimeout("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create user.");
      }
      setForm(emptyForm);
      await loadUsers();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create user.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(user: AdminUserRecord) {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetchWithTimeout("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          displayName: user.displayName,
          role: user.role,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update user.");
      }
      setEditingId(null);
      await loadUsers();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update user.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(locale === "vi" ? "Xóa người dùng này?" : "Delete this user?")) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetchWithTimeout(`/api/admin/users?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete user.");
      }
      await loadUsers();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete user.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PersonaGuard require="admin">
      <ClinicalShell
        eyebrow={locale === "vi" ? "Quản trị" : "Administration"}
        title={ui.nav.users}
        description={
          locale === "vi"
            ? "Tạo, cập nhật và gán vai trò cho người dùng hệ thống."
            : "Create, update, and assign roles for system users."
        }
      >
        <div className="grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
          <section className="dashboard-surface h-fit rounded-[1.15rem] p-4">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-[color:var(--cs-teal)]">
              <Plus className="h-4 w-4" />
              {locale === "vi" ? "Thêm người dùng" : "Add user"}
            </h2>
            <form className="mt-3 space-y-2.5" onSubmit={(event) => void handleCreate(event)}>
              <Field
                label={locale === "vi" ? "Email" : "Email"}
                value={form.email}
                onChange={(value) => setForm((current) => ({ ...current, email: value }))}
              />
              <Field
                label={locale === "vi" ? "Tên hiển thị" : "Display name"}
                value={form.displayName}
                onChange={(value) => setForm((current) => ({ ...current, displayName: value }))}
              />
              <Field
                label={locale === "vi" ? "Mật khẩu (tùy chọn)" : "Password (optional)"}
                value={form.password}
                onChange={(value) => setForm((current) => ({ ...current, password: value }))}
                type="password"
              />
              <label className="block">
                <span className="text-[10px] font-semibold text-[color:var(--cs-text-soft)]">
                  {ui.roles.demoRoleLabel}
                </span>
                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      role: event.target.value as FormState["role"],
                    }))
                  }
                  className="dashboard-input mt-1 h-10 w-full rounded-[0.7rem] px-3 text-[12px]"
                >
                  <option value="coordinator">{ui.roles.coordinator}</option>
                  <option value="doctor">{ui.roles.doctor}</option>
                  <option value="admin">{ui.roles.admin}</option>
                </select>
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-10 w-full items-center justify-center rounded-[0.7rem] bg-[linear-gradient(135deg,var(--cs-primary),var(--cs-teal))] text-[12px] font-semibold text-white disabled:opacity-60"
              >
                {locale === "vi" ? "Tạo người dùng" : "Create user"}
              </button>
            </form>
          </section>

          <section className="dashboard-surface rounded-[1.15rem] p-4">
            <h2 className="text-[14px] font-semibold text-[color:var(--cs-heading)]">
              {locale === "vi" ? "Danh sách người dùng" : "User list"}
            </h2>
            {error ? (
              <p className="mt-2 text-[12px] text-[color:var(--cs-danger)]">{error}</p>
            ) : null}
            {loading ? (
              <p className="mt-3 text-[12px] text-[color:var(--cs-text-soft)]">
                {locale === "vi" ? "Đang tải..." : "Loading..."}
              </p>
            ) : (
              <div className="mt-3 overflow-hidden rounded-[0.8rem] border border-white/55">
                <div className="grid grid-cols-[1.2fr_1fr_120px_88px] border-b border-white/45 bg-[color:rgba(13,71,161,0.08)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cs-heading)]">
                  <span>{locale === "vi" ? "Người dùng" : "User"}</span>
                  <span>Email</span>
                  <span>{ui.roles.demoRoleLabel}</span>
                  <span />
                </div>
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="grid grid-cols-[1.2fr_1fr_120px_88px] items-center gap-2 border-b border-white/35 px-3 py-2 last:border-0"
                  >
                    {editingId === user.id ? (
                      <input
                        value={user.displayName}
                        onChange={(event) =>
                          setUsers((current) =>
                            current.map((item) =>
                              item.id === user.id
                                ? { ...item, displayName: event.target.value }
                                : item,
                            ),
                          )
                        }
                        className="dashboard-input h-8 rounded-[0.6rem] px-2 text-[11px]"
                      />
                    ) : (
                      <span className="text-[12px] font-semibold text-[color:var(--cs-heading)]">
                        {user.displayName}
                      </span>
                    )}
                    <span className="truncate text-[11px] text-[color:var(--cs-text-soft)]">
                      {user.email}
                    </span>
                    {editingId === user.id ? (
                      <select
                        value={user.role}
                        onChange={(event) =>
                          setUsers((current) =>
                            current.map((item) =>
                              item.id === user.id
                                ? {
                                    ...item,
                                    role: event.target.value as AdminUserRecord["role"],
                                  }
                                : item,
                            ),
                          )
                        }
                        className="dashboard-input h-8 rounded-[0.6rem] px-2 text-[11px]"
                      >
                        <option value="coordinator">{ui.roles.coordinator}</option>
                        <option value="doctor">{ui.roles.doctor}</option>
                        <option value="admin">{ui.roles.admin}</option>
                      </select>
                    ) : (
                      <span className="text-[11px] text-[color:var(--cs-text)]">
                        {user.role === "admin"
                          ? ui.roles.admin
                          : user.role === "doctor"
                            ? ui.roles.doctor
                            : ui.roles.coordinator}
                      </span>
                    )}
                    <div className="flex justify-end gap-1">
                      {editingId === user.id ? (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => void handleUpdate(user)}
                          className="dashboard-input h-8 rounded-[0.6rem] px-2 text-[10px] font-semibold text-[color:var(--cs-primary)]"
                        >
                          {locale === "vi" ? "Lưu" : "Save"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingId(user.id)}
                          className="dashboard-input flex h-8 w-8 items-center justify-center rounded-[0.6rem]"
                          aria-label={locale === "vi" ? "Sửa" : "Edit"}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => void handleDelete(user.id)}
                        className="dashboard-input flex h-8 w-8 items-center justify-center rounded-[0.6rem] text-[color:var(--cs-danger)]"
                        aria-label={locale === "vi" ? "Xóa" : "Delete"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </ClinicalShell>
    </PersonaGuard>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold text-[color:var(--cs-text-soft)]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="dashboard-input mt-1 h-10 w-full rounded-[0.7rem] px-3 text-[12px]"
      />
    </label>
  );
}
