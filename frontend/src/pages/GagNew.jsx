import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SideNav from "../components/SideNav";
import BottomNav from "../components/BottomNav";
import Label from "../components/Label";
import Input from "../components/Input";
import Button from "../components/Button";
import ErrorText from "../components/ErrorText";
import Select from "../components/Select";
import { supabase } from "../lib/supabase";

export default function GagNew() {
  const nav = useNavigate();
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    is_remote: false,
    job_type: "one-off",
    pay_type: "project",
    pay_min: "",
    pay_max: "",
    pay_currency: "USD",
    tags: "",
    contact_email: "",
    contact_url: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.title.trim() || !form.description.trim()) {
      setError("Title and description are required");
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      created_by: user?.id,
      title: form.title.trim(),
      description: form.description.trim(),
      location: form.location.trim() || null,
      is_remote: !!form.is_remote,
      job_type: form.job_type,
      pay_type: form.pay_type,
      pay_min: form.pay_min ? Number(form.pay_min) : null,
      pay_max: form.pay_max ? Number(form.pay_max) : null,
      pay_currency: form.pay_currency || 'USD',
      tags: form.tags
        ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
      contact_email: form.contact_email.trim() || null,
      contact_url: form.contact_url.trim() || null,
      status: 'open',
    };
    const { data, error } = await supabase.from('gag_jobs').insert(payload).select('id').single();
    setLoading(false);
    if (error) {
      console.error(error);
      setError(error.message || 'Failed to post gig');
      return;
    }
    nav(`/gags/${data.id}`);
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <SideNav active="gags" onNavigate={(p) => nav(p)} onLogout={() => {}} query={query} setQuery={setQuery} />
      <main className="mx-auto max-w-3xl px-4 py-6 pb-16 md:pl-[260px]">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Post a Gig</h1>
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          {error && <ErrorText>{error}</ErrorText>}

          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={form.title} onChange={(v) => update('title', v)} placeholder="e.g. Wedding photographer for 10/20" />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Scope, requirements, deliverables, timeline…"
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
              rows={6}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={form.location} onChange={(v) => update('location', v)} placeholder="City, Country" />
            </div>
            <div className="flex items-end gap-2 pt-6">
              <input id="remote" type="checkbox" checked={form.is_remote} onChange={(e) => update('is_remote', e.target.checked)} />
              <label htmlFor="remote" className="text-sm" style={{ color: 'var(--text)' }}>Remote OK</label>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label htmlFor="job_type">Job Type</Label>
              <Select id="job_type" value={form.job_type} onChange={(v) => update('job_type', v)} className="mt-1">
                <option value="one-off">One-off</option>
                <option value="part-time">Part-time</option>
                <option value="full-time">Full-time</option>
                <option value="collab">Collaboration</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="pay_type">Pay Type</Label>
              <Select id="pay_type" value={form.pay_type} onChange={(v) => update('pay_type', v)} className="mt-1">
                <option value="project">Per project</option>
                <option value="day">Per day</option>
                <option value="hourly">Hourly</option>
                <option value="fixed">Fixed</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" value={form.pay_currency} onChange={(v) => update('pay_currency', v.toUpperCase())} placeholder="USD" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="pay_min">Pay Min</Label>
              <Input id="pay_min" type="number" value={form.pay_min} onChange={(v) => update('pay_min', v)} placeholder="e.g. 200" />
            </div>
            <div>
              <Label htmlFor="pay_max">Pay Max</Label>
              <Input id="pay_max" type="number" value={form.pay_max} onChange={(v) => update('pay_max', v)} placeholder="e.g. 500" />
            </div>
          </div>

          <div>
            <Label htmlFor="tags">Tags</Label>
            <Input id="tags" value={form.tags} onChange={(v) => update('tags', v)} placeholder="wedding, portrait, film, editorial" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input id="contact_email" type="email" value={form.contact_email} onChange={(v) => update('contact_email', v)} placeholder="you@example.com" />
            </div>
            <div>
              <Label htmlFor="contact_url">Contact URL</Label>
              <Input id="contact_url" value={form.contact_url} onChange={(v) => update('contact_url', v)} placeholder="https://yourform or profile link" />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" loading={loading}>Publish</Button>
            <Button variant="outline" onClick={() => nav(-1)} disabled={loading}>Cancel</Button>
          </div>
        </form>
      </main>
      <BottomNav active="gags" onNavigate={(p) => nav(p)} />
    </div>
  );
}
