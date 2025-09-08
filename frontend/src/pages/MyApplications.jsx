import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SideNav from "../components/SideNav";
import BottomNav from "../components/BottomNav";
import Button from "../components/Button";
import Input from "../components/Input";
import Select from "../components/Select";
import { ChevronLeftIcon } from "../components/icons";
import { supabase } from "../lib/supabase";

function StatusChip({ children }) {
  return (
    <span className="rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>{children}</span>
  );
}

export default function MyApplications() {
  const nav = useNavigate();
  const [query, setQuery] = useState("");
  const [me, setMe] = useState(null);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState(""); // applied | reviewed | accepted | rejected

  useEffect(() => {
    let active = true;
    async function loadMe() {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setMe(data.user ?? null);
    }
    loadMe();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!me) return;
      setLoading(true);
      let q = supabase
        .from('gag_applications')
        .select('id, job_id, status, created_at')
        .eq('applicant_id', me.id)
        .order('created_at', { ascending: false });
      if (statusFilter) q = q.eq('status', statusFilter);
      const { data: appsRows, error } = await q;
      if (!active) return;
      if (error || !appsRows?.length) {
        setApps([]);
        setLoading(false);
        return;
      }
      const ids = Array.from(new Set(appsRows.map((a) => a.job_id)));
      const { data: jobs } = await supabase
        .from('gag_jobs')
        .select('id, title, status, pay_type, pay_min, pay_max, pay_currency')
        .in('id', ids);
      const byId = new Map((jobs || []).map((j) => [j.id, j]));
      let combined = appsRows.map((a) => ({
        ...a,
        job: byId.get(a.job_id) || null,
      }));
      if (query.trim()) {
        const t = query.trim().toLowerCase();
        combined = combined.filter((r) => (r.job?.title || '').toLowerCase().includes(t));
      }
      setApps(combined);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [me, statusFilter, query]);

  async function withdraw(appId) {
    if (!appId) return;
    const ok = window.confirm('Withdraw this application? This cannot be undone.');
    if (!ok) return;
    setWithdrawingId(appId);
    const { error } = await supabase.from('gag_applications').delete().eq('id', appId);
    setWithdrawingId(null);
    if (error) { console.error(error); return; }
    setApps((prev) => prev.filter((a) => a.id !== appId));
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <SideNav active="gags" onNavigate={(p) => nav(p)} onLogout={() => {}} query={query} setQuery={setQuery} />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-16 md:pl-[260px]">
        <div className="flex items-end justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => nav(-1)}>
              <ChevronLeftIcon size={18} className="mr-1" /> Back
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight">My Applications</h1>
          </div>
          <div className="flex items-end gap-4">
            <div>
              <Select
                id="status"
                aria-label="Status"
                value={statusFilter}
                onChange={(v) => setStatusFilter(v)}
                className="w-full md:w-36 bg-[var(--hover)]"
              >
                <option value="">Status</option>
                <option value="applied">Applied</option>
                <option value="reviewed">Reviewed</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </Select>
            </div>
            <div>
              <Input
                id="q"
                aria-label="Search applications by job title"
                value={query}
                onChange={setQuery}
                placeholder="Search by job title"
                className="w-full md:w-56 border-none bg-[var(--hover)] focus:ring-offset-2 focus:ring-offset-[var(--app-bg)]"
              />
            </div>
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>
            </div>
          ) : apps.length === 0 ? (
            <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>No applications found.</p>
            </div>
          ) : (
            <ul className="grid gap-3">
              {apps.map((a) => (
                <li key={a.id} className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link to={`/gags/${a.job_id}`} className="text-base font-semibold underline break-words" style={{ color: 'var(--text)' }}>
                        {a.job?.title || 'Untitled gig'}
                      </Link>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
                        <StatusChip>{a.status}</StatusChip>
                        <StatusChip>job {a.job?.status || 'open'}</StatusChip>
                      </div>
                      {(a.job?.pay_type || a.job?.pay_min || a.job?.pay_max) && (
                        <div className="mt-2 inline-flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                          <span className="rounded border px-2 py-0.5" style={{ borderColor: 'var(--border)' }}>{a.job?.pay_type || 'project'}</span>
                          <span>
                            {a.job?.pay_currency ?? 'USD'} {a.job?.pay_min ?? ''}{a.job?.pay_max ? ` - ${a.job.pay_max}` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {a.status === 'applied' && (a.job?.status === 'open') && (
                        <Button variant="outline" size="sm" onClick={() => withdraw(a.id)} loading={withdrawingId === a.id}>Withdraw</Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <BottomNav active="gags" onNavigate={(p) => nav(p)} />
    </div>
  );
}
