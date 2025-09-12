import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import SideNav from "../components/SideNav";
import BottomNav from "../components/BottomNav";
import Button from "../components/Button";
import Input from "../components/Input";
import Label from "../components/Label";
import ErrorText from "../components/ErrorText";
import { ChevronLeftIcon } from "../components/icons";

function ApplyDialog({ open, onClose, onSubmit, applying }) {
  const [msg, setMsg] = useState("");
  const [url, setUrl] = useState("");
  const [err, setErr] = useState("");

  // Reset fields when opening
  useEffect(() => {
    if (open) { setMsg(""); setUrl(""); setErr(""); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }} role="dialog" aria-modal="true">
        <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>Apply to this gig</h2>
        <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>Introduce yourself briefly and share a portfolio link.</p>
        <div className="mt-3 space-y-3">
          {err && <ErrorText>{err}</ErrorText>}
          <div>
            <Label htmlFor="dlg_msg">Message</Label>
            <textarea
              id="dlg_msg"
              rows={4}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Relevant experience, availability, approach…"
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
          <div>
            <Label htmlFor="dlg_url">Portfolio URL</Label>
            <Input id="dlg_url" value={url} onChange={setUrl} placeholder="https://yourportfolio.com" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={applying}>Cancel</Button>
            <Button loading={applying} onClick={async () => {
              try {
                setErr("");
                await onSubmit?.({ message: msg, portfolio_url: url });
              } catch (e) {
                setErr(e?.message || 'Failed to apply');
              }
            }}>Submit</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
import { supabase } from "../lib/supabase";

export default function GagDetail() {
  const nav = useNavigate();
  const { id } = useParams();
  const [query, setQuery] = useState("");
  const [gig, setGig] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [ownerApps, setOwnerApps] = useState([]);
  const [applicantNames, setApplicantNames] = useState({}); // id -> { username, full_name }
  const [updating, setUpdating] = useState({}); // appId -> bool

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const [{ data: sessionData }, { data, error }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('gag_jobs').select('*').eq('id', id).single(),
      ]);
      if (!active) return;
      setMe(sessionData.user ?? null);
      if (error) {
        console.error(error);
        setGig(null);
      } else {
        setGig(data);
      }
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    let active = true;
    async function loadAux() {
      if (!gig || !me) return;
      // Check if applicant already applied
      if (gig.created_by !== me.id) {
        const { data: myApp } = await supabase
          .from('gag_applications')
          .select('id')
          .eq('job_id', gig.id)
          .eq('applicant_id', me.id)
          .maybeSingle();
        if (!active) return;
        setAlreadyApplied(!!myApp);
      } else {
        // Owner: load applications list (id, applicant_id, status, created_at)
        const { data: apps } = await supabase
          .from('gag_applications')
          .select('id, applicant_id, status, created_at, portfolio_url, message')
          .eq('job_id', gig.id)
          .order('created_at', { ascending: false });
        if (!active) return;
        setOwnerApps(apps || []);
        // Load applicant profiles for nicer display
        const ids = Array.from(new Set((apps || []).map((a) => a.applicant_id)));
        if (ids.length) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, username, full_name')
            .in('id', ids);
          if (!active) return;
          const map = Object.fromEntries((profs || []).map((p) => [p.id, { username: p.username, full_name: p.full_name }]));
          setApplicantNames(map);
        } else {
          setApplicantNames({});
        }
      }
    }
    loadAux();
    return () => { active = false; };
  }, [gig, me]);

  async function closeGig() {
    if (!gig) return;
    setClosing(true);
    const { error } = await supabase.from('gag_jobs').update({ status: 'closed' }).eq('id', gig.id);
    setClosing(false);
    if (error) {
      console.error(error);
      return;
    }
    nav('/gags');
  }

  const isOwner = gig && me && gig.created_by === me.id;

  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <SideNav active="gags" onNavigate={(p) => nav(p)} onLogout={() => {}} query={query} setQuery={setQuery} />
      <main className="mx-auto max-w-3xl px-4 py-6 pb-16 md:pl-[260px]">
        {loading ? (
          <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>
          </div>
        ) : !gig ? (
          <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Gig not found or not accessible.</p>
          </div>
        ) : (
          <article className="space-y-6">
            <div>
              <Button variant="outline" size="sm" onClick={() => nav(-1)}>
                <ChevronLeftIcon size={18} className="mr-1" /> Back
              </Button>
            </div>
            <header className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight break-words">{gig.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                  <span className="rounded-full border px-2 py-0.5" style={{ borderColor: 'var(--border)' }}>{gig.location || (gig.is_remote ? 'Remote' : 'Unspecified')}</span>
                  {gig.job_type && (
                    <span className="rounded-full border px-2 py-0.5" style={{ borderColor: 'var(--border)' }}>{gig.job_type}</span>
                  )}
                  {gig.pay_type && (
                    <span className="rounded-full border px-2 py-0.5" style={{ borderColor: 'var(--border)' }}>{gig.pay_type}</span>
                  )}
                  {(gig.pay_min || gig.pay_max) && (
                    <span className="rounded-full border px-2 py-0.5" style={{ borderColor: 'var(--border)' }}>{gig.pay_currency ?? 'USD'} {gig.pay_min ?? ''}{gig.pay_max ? ` - ${gig.pay_max}` : ''}</span>
                  )}
                </div>
              </div>
              <span className="shrink-0 rounded-full border px-2 py-1 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>{gig.status}</span>
            </header>

            {gig.tags?.length ? (
              <div className="flex flex-wrap gap-2">
                {gig.tags.map((t) => (
                  <span key={t} className="rounded-lg bg-[var(--hover)] px-2 py-0.5 text-xs" style={{ color: 'var(--muted)' }}>{t}</span>
                ))}
              </div>
            ) : null}

            <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
              <h2 className="text-sm font-medium" style={{ color: 'var(--text)' }}>About this gig</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{gig.description}</p>
            </section>

            <section className="flex flex-wrap items-center gap-3">
              {!isOwner && gig.status === 'open' && (
                alreadyApplied ? (
                  <span className="text-sm" style={{ color: 'var(--muted)' }}>You have applied to this gig.</span>
                ) : (
                  <Button onClick={() => setApplyOpen(true)}>Apply</Button>
                )
              )}
              {isOwner && (
                <Button variant="danger" onClick={closeGig} loading={closing}>Close Gig</Button>
              )}
            </section>

            <ApplyDialog
              open={!isOwner && applyOpen && !alreadyApplied}
              onClose={() => setApplyOpen(false)}
              applying={applying}
              onSubmit={async ({ message, portfolio_url }) => {
                if (!me || !gig) return;
                setApplying(true);
                const { error } = await supabase.from('gag_applications').insert({
                  job_id: gig.id,
                  applicant_id: me.id,
                  message: message || null,
                  portfolio_url: portfolio_url || null,
                });
                setApplying(false);
                if (error) {
                  console.error(error);
                  throw error;
                }
                setAlreadyApplied(true);
                setApplyOpen(false);
              }}
            />

            {isOwner && (
              <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium" style={{ color: 'var(--text)' }}>Applications</h2>
                  <span className="text-xs rounded-full border px-2 py-0.5" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>{ownerApps.length}</span>
                </div>
                {ownerApps.length === 0 ? (
                  <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>No applications yet.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {ownerApps.map((a) => (
                      <li key={a.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex items-start justify-between gap-3 text-sm">
                          <div className="min-w-0">
                            <div className="font-medium" style={{ color: 'var(--text)' }}>
                              Applicant: {(
                                <Link to={`/profile?user=${a.applicant_id}`} className="underline">
                                  {applicantNames[a.applicant_id]?.username || applicantNames[a.applicant_id]?.full_name || `${a.applicant_id.slice(0,8)}…`}
                                </Link>
                              )}
                            </div>
                            {a.message && (
                              <div className="mt-1 whitespace-pre-wrap" style={{ color: 'var(--muted)' }}>{a.message}</div>
                            )}
                            {a.portfolio_url && (
                              <a href={a.portfolio_url} className="mt-1 inline-block underline" target="_blank" rel="noreferrer">Portfolio</a>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={a.status}
                              onChange={async (e) => {
                                const next = e.target.value;
                                setUpdating((m) => ({ ...m, [a.id]: true }));
                                const { error } = await supabase.from('gag_applications').update({ status: next }).eq('id', a.id);
                                setUpdating((m) => ({ ...m, [a.id]: false }));
                                if (!error) {
                                  setOwnerApps((list) => list.map((row) => row.id === a.id ? { ...row, status: next } : row));
                                }
                              }}
                              className="rounded-xl bg-[var(--hover)] px-2 py-1 text-xs"
                            >
                              <option value="applied">applied</option>
                              <option value="reviewed">reviewed</option>
                              <option value="accepted">accepted</option>
                              <option value="rejected">rejected</option>
                            </select>
                            <Button size="sm" variant="outline" onClick={() => nav(`/messages?to=${a.applicant_id}`)}>
                              Message
                            </Button>
                            {updating[a.id] && <span className="text-xs" style={{ color: 'var(--muted)' }}>Saving…</span>}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </article>
        )}
      </main>
      <BottomNav active="gags" onNavigate={(p) => nav(p)} />
    </div>
  );
}
