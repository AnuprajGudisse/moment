import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SideNav from "../components/SideNav";
import BottomNav from "../components/BottomNav";
import Button from "../components/Button";
import Select from "../components/Select";
import { supabase } from "../lib/supabase";

function StatusChip({ children }) {
  return (
    <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: 'var(--hover)', color: 'var(--muted)' }}>{children}</span>
  );
}

export default function MyJobs() {
  const nav = useNavigate();
  const [query, setQuery] = useState("");
  const [me, setMe] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appsByJob, setAppsByJob] = useState({}); // jobId -> apps[]
  const [togglingJob, setTogglingJob] = useState({}); // jobId -> bool
  const [jobTab, setJobTab] = useState('open'); // open | closed | all
  const [expanded, setExpanded] = useState({}); // reserved (no longer used)

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => { if (active) setMe(data.user ?? null); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!me) return;
      setLoading(true);
      let q = supabase
        .from('gag_jobs')
        .select('id, title, status, created_at, pay_type, pay_min, pay_max, pay_currency, location, is_remote, job_type')
        .eq('created_by', me.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (query.trim()) {
        const term = `%${query.trim()}%`;
        q = q.or(`title.ilike.${term},location.ilike.${term}`);
      }
      const { data, error } = await q;
      if (!active) return;
      if (error) { setJobs([]); setAppsByJob({}); setLoading(false); return; }
      setJobs(data || []);
      const ids = (data || []).map((j) => j.id);
      if (ids.length) {
        const { data: apps } = await supabase
          .from('gag_applications')
          .select('id, job_id')
          .in('job_id', ids)
          .order('created_at', { ascending: false });
        const map = {};
        (apps || []).forEach((a) => { (map[a.job_id] ||= []).push(a); });
        setAppsByJob(map);
      } else {
        setAppsByJob({});
      }
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [me, query]);

  // Application review now happens on the gig detail page

  async function toggleJobStatus(job) {
    const next = job.status === 'open' ? 'closed' : 'open';
    setTogglingJob((m) => ({ ...m, [job.id]: true }));
    const { error } = await supabase.from('gag_jobs').update({ status: next }).eq('id', job.id);
    setTogglingJob((m) => ({ ...m, [job.id]: false }));
    if (error) return;
    setJobs((arr) => arr.map((j) => j.id === job.id ? { ...j, status: next } : j));
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <SideNav active="gags" onNavigate={(p) => nav(p)} onLogout={() => {}} query={query} setQuery={setQuery} />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-16 md:pl-[260px]">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">My Jobs</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => nav('/gags/new')}>Post a Gig</Button>
            <Button variant="outline" onClick={() => nav('/gags')}>Browse</Button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button size="sm" variant={jobTab === 'open' ? 'secondary' : 'outline'} onClick={() => setJobTab('open')}>Open</Button>
          <Button size="sm" variant={jobTab === 'closed' ? 'secondary' : 'outline'} onClick={() => setJobTab('closed')}>Closed</Button>
          <Button size="sm" variant={jobTab === 'all' ? 'secondary' : 'outline'} onClick={() => setJobTab('all')}>All</Button>
          <div className="ml-auto">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search my jobs"
              className="rounded-xl bg-[var(--hover)] px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>You haven’t posted any gigs yet.</p>
            </div>
          ) : (
            <ul className="grid gap-4">
              {jobs
                .filter((j) => jobTab === 'all' ? true : j.status === jobTab)
                .map((job) => (
                <li key={job.id} className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/gags/${job.id}`} className="text-base font-semibold underline break-words" style={{ color: 'var(--text)' }}>{job.title}</Link>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                        <StatusChip>{job.status}</StatusChip>
                        {job.job_type && <StatusChip>{job.job_type}</StatusChip>}
                        {job.location || job.is_remote ? <StatusChip>{job.location || 'Remote'}</StatusChip> : null}
                        {(job.pay_type || job.pay_min || job.pay_max) && (
                          <StatusChip>{job.pay_type || 'project'} {job.pay_currency ?? 'USD'} {job.pay_min ?? ''}{job.pay_max ? `–${job.pay_max}` : ''}</StatusChip>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => toggleJobStatus(job)} loading={!!togglingJob[job.id]}>
                        {job.status === 'open' ? 'Close' : 'Reopen'}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl p-3" style={{ background: 'var(--hover)' }}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium" style={{ color: 'var(--text)' }}>Applications</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>{(appsByJob[job.id]?.length || 0)} total</span>
                        <Button size="sm" variant="outline" onClick={() => nav(`/gags/${job.id}`)}>View Applicants</Button>
                      </div>
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
