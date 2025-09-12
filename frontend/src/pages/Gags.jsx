import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import SideNav from "../components/SideNav";
import BottomNav from "../components/BottomNav";
import Input from "../components/Input";
import Button from "../components/Button";
import Label from "../components/Label";
import { supabase } from "../lib/supabase";
import { ChevronRightIcon, PlusIcon } from "../components/icons";
import Select from "../components/Select";

function GigCard({ gig }) {
  return (
    <Link to={`/gags/${gig.id}`} className="block rounded-2xl border p-4 hover:bg-[var(--hover)]" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold" style={{ color: 'var(--text)' }}>{gig.title}</h3>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            {gig.location || (gig.is_remote ? 'Remote' : 'Unspecified')}
            {gig.job_type ? ` • ${gig.job_type}` : ''}
          </p>
          {(gig.pay_min || gig.pay_max || gig.pay_type) && (
            <div className="mt-1 inline-flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
              <span className="rounded border px-2 py-0.5" style={{ borderColor: 'var(--border)' }}>{gig.pay_type || 'project'}</span>
              <span>
                {gig.pay_currency ?? 'USD'} {gig.pay_min ?? ''}{gig.pay_max ? ` - ${gig.pay_max}` : ''}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="shrink-0 rounded-full border px-2 py-1 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>{gig.status}</span>
          <ChevronRightIcon size={18} className="opacity-60" />
        </div>
      </div>
      {gig.tags?.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {gig.tags.slice(0, 6).map((t) => (
            <span key={t} className="rounded-lg bg-[var(--hover)] px-2 py-0.5 text-xs" style={{ color: 'var(--muted)' }}>{t}</span>
          ))}
        </div>
      ) : null}
    </Link>
  );
}

export default function Gags() {
  const nav = useNavigate();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [gigs, setGigs] = useState([]);
  const [me, setMe] = useState(null);
  const [filters, setFilters] = useState({
    remoteOnly: false,
    jobType: "", // one-off | part-time | full-time | collab
    payType: "", // project | day | hourly | fixed
    minPay: "",
    tags: "", // comma separated
  });
  const [appsLoading, setAppsLoading] = useState(true);
  const [myApps, setMyApps] = useState([]); // [{ job_id, status, created_at, title, job_status }]
  const [showAdvanced, setShowAdvanced] = useState(false);

  function ActiveFilters() {
    const chips = [];
    const push = (label, onClear) => chips.push(
      <button key={label} onClick={onClear} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs" style={{ background: 'var(--hover)', color: 'var(--text)' }}>
        {label} <span aria-hidden>×</span>
      </button>
    );
    if (query.trim()) push(`“${query.trim()}”`, () => setQuery(""));
    if (filters.remoteOnly) push('Remote', () => setFilters((f) => ({ ...f, remoteOnly: false })));
    if (filters.jobType) push(filters.jobType, () => setFilters((f) => ({ ...f, jobType: "" })));
    if (filters.payType) push(filters.payType, () => setFilters((f) => ({ ...f, payType: "" })));
    if (filters.minPay) push(`≥ ${filters.minPay}`, () => setFilters((f) => ({ ...f, minPay: "" })));
    if (filters.tags.trim()) push(filters.tags.split(',').map((t) => t.trim()).filter(Boolean).join(', '), () => setFilters((f) => ({ ...f, tags: "" })));
    if (chips.length === 0) return null;
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {chips}
        <button onClick={() => { setQuery(""); setFilters({ remoteOnly: false, jobType: "", payType: "", minPay: "", tags: "" }); }} className="text-xs underline" style={{ color: 'var(--muted)' }}>Clear all</button>
      </div>
    );
  }

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      let q = supabase
        .from('gag_jobs')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(50);
      if (query.trim()) {
        const term = `%${query.trim()}%`;
        q = q.or(
          [
            `title.ilike.${term}`,
            `description.ilike.${term}`,
            `location.ilike.${term}`,
          ].join(',')
        );
      }
      if (filters.remoteOnly) q = q.eq('is_remote', true);
      if (filters.jobType) q = q.eq('job_type', filters.jobType);
      if (filters.payType) q = q.eq('pay_type', filters.payType);
      if (filters.minPay) {
        const v = Number(filters.minPay);
        if (!Number.isNaN(v)) {
          q = q.or(`pay_min.gte.${v},pay_max.gte.${v}`);
        }
      }
      if (filters.tags.trim()) {
        const arr = filters.tags.split(',').map((t) => t.trim()).filter(Boolean);
        if (arr.length) q = q.contains('tags', arr);
      }
      const { data, error } = await q;
      if (!active) return;
      if (error) {
        console.error('Failed to load gigs', error);
        setGigs([]);
      } else {
        setGigs(data ?? []);
      }
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [query, filters]);

  // Load current user and their recent applications for sidebar
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
    async function loadApps() {
      if (!me) return;
      setAppsLoading(true);
      const { data: apps, error } = await supabase
        .from('gag_applications')
        .select('job_id, status, created_at')
        .eq('applicant_id', me.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (!active) return;
      if (error || !apps?.length) {
        setMyApps([]);
        setAppsLoading(false);
        return;
      }
      const ids = Array.from(new Set(apps.map((a) => a.job_id)));
      const { data: jobs } = await supabase
        .from('gag_jobs')
        .select('id, title, status')
        .in('id', ids);
      const byId = new Map((jobs || []).map((j) => [j.id, j]));
      setMyApps(apps.map((a) => ({
        ...a,
        title: byId.get(a.job_id)?.title || 'Gig',
        job_status: byId.get(a.job_id)?.status || 'open',
      })));
      setAppsLoading(false);
    }
    loadApps();
    return () => { active = false; };
  }, [me]);

  const emptyState = useMemo(() => (
    <div className="rounded-2xl border p-6 text-center" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>No gigs found. Try adjusting your search.</p>
    </div>
  ), []);

  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <SideNav active="gags" onNavigate={(p) => nav(p)} onLogout={() => {}} query={query} setQuery={setQuery} />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-16 md:pl-[260px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Gags</h1>
            <p className="text-sm muted mt-1">Find gigs, collaborations, and paid opportunities.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div className="md:col-span-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs" style={{ color: 'var(--muted)' }}>{gigs.length} {gigs.length === 1 ? 'gig' : 'gigs'}</div>
            </div>
            <ActiveFilters />
            {loading ? (
              <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading gigs…</p>
              </div>
            ) : gigs.length === 0 ? (
              emptyState
            ) : (
              <div className="grid gap-3">
                {gigs.map((g) => <GigCard key={g.id} gig={g} />)}
              </div>
            )}
          </div>
          <aside className="md:sticky top-6 space-y-4">
            <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
              <h2 className="text-sm font-medium" style={{ color: 'var(--text)' }}>Post a Gig</h2>
              <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>Share a job, collab, or assignment.</p>
              <Button className="mt-3 w-full" onClick={() => nav('/gags/new')}>
                <PlusIcon size={18} className="mr-2" /> Post a Gig
              </Button>
              <Button className="mt-2 w-full" variant="outline" onClick={() => nav('/gags/my-jobs')}>
                Manage My Jobs
              </Button>
            </div>

            <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
              <h2 className="text-sm font-medium" style={{ color: 'var(--text)' }}>Search</h2>
              <div className="mt-3 space-y-3">
                <Input id="q" value={query} onChange={setQuery} placeholder="Title, location, description" />
                <div className="flex items-center justify-between text-xs">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input id="remoteOnly" type="checkbox" checked={filters.remoteOnly} onChange={(e) => setFilters((f) => ({ ...f, remoteOnly: e.target.checked }))} />
                    <span style={{ color: 'var(--text)' }}>Remote only</span>
                  </label>
                  <button type="button" onClick={() => setShowAdvanced((v) => !v)} className="underline" style={{ color: 'var(--muted)' }}>
                    {showAdvanced ? 'Hide filters' : 'More filters'}
                  </button>
                </div>
                {showAdvanced && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="jobType">Job Type</Label>
                        <Select id="jobType" size="sm" value={filters.jobType} onChange={(v) => setFilters((f) => ({ ...f, jobType: v }))} className="mt-1">
                          <option value="">Any</option>
                          <option value="one-off">One-off</option>
                          <option value="part-time">Part-time</option>
                          <option value="full-time">Full-time</option>
                          <option value="collab">Collaboration</option>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="payType">Pay Type</Label>
                        <Select id="payType" size="sm" value={filters.payType} onChange={(v) => setFilters((f) => ({ ...f, payType: v }))} className="mt-1">
                          <option value="">Any</option>
                          <option value="project">Project</option>
                          <option value="day">Per day</option>
                          <option value="hourly">Hourly</option>
                          <option value="fixed">Fixed</option>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 items-end">
                      <div>
                        <Label htmlFor="minPay">Min Pay</Label>
                        <Input id="minPay" type="number" value={filters.minPay} onChange={(v) => setFilters((f) => ({ ...f, minPay: v }))} placeholder="e.g. 200" />
                      </div>
                      <div>
                        <Label htmlFor="tags">Tags</Label>
                        <Input id="tags" value={filters.tags} onChange={(v) => setFilters((f) => ({ ...f, tags: v }))} placeholder="wedding, portrait" />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" onClick={() => setFilters({ remoteOnly: false, jobType: "", payType: "", minPay: "", tags: "" })}>Clear</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => nav('/gags/applications')} className="text-left">
                  <h2 className="text-sm font-medium underline" style={{ color: 'var(--text)' }}>My Applications</h2>
                </button>
                {!appsLoading && myApps.length > 0 && (
                  <span className="text-xs rounded-full border px-2 py-0.5" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>{myApps.length}</span>
                )}
              </div>
              {appsLoading ? (
                <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>
              ) : myApps.length === 0 ? (
                <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>No recent applications.</p>
              ) : (
                <>
                  <ul className="mt-2 max-h-72 overflow-auto space-y-2 pr-1">
                    {myApps.map((a) => (
                      <li key={`${a.job_id}-${a.created_at}`} className="text-sm">
                        <Link to={`/gags/${a.job_id}`} className="underline" style={{ color: 'var(--text)' }}>{a.title}</Link>
                        <div className="mt-0.5 text-xs inline-flex items-center gap-2" style={{ color: 'var(--muted)' }}>
                          <span className="rounded-full border px-2 py-0.5" style={{ borderColor: 'var(--border)' }}>{a.status}</span>
                          <span>job {a.job_status}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 text-right">
                    <button type="button" onClick={() => nav('/gags/applications')} className="text-xs underline" style={{ color: 'var(--muted)' }}>
                      View all
                    </button>
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      </main>
      <BottomNav active="gags" onNavigate={(p) => nav(p)} />
    </div>
  );
}
