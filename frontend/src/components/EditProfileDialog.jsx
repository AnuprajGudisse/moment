import Button from "./Button";
import Input from "./Input";
import Label from "./Label";
import Tag from "./Tag";
import Select from "./Select";

export default function EditProfileDialog({
  open,
  onClose,
  onSave,
  saving,
  err,
  ok,
  fullName,
  setFullName,
  username,
  setUsername,
  location,
  setLocation,
  level,
  setLevel,
  levels = [],
  genres = [],
  setGenres,
}) {
  if (!open) return null;

  function toggleGenre(g) {
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-2xl" style={{ background: "var(--card-bg)" }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Edit Profile</h3>
            <button className="text-sm muted" onClick={onClose}>Close</button>
          </div>
          <p className="text-sm muted mt-1">Update how others see you on moment.</p>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={setFullName} placeholder="Annie Leibovitz" />
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={setUsername} placeholder="@yourhandle" />
              <p className="mt-1 text-xs muted">Min. 3 characters. Must be unique.</p>
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={location} onChange={setLocation} placeholder="Chicago, IL" />
            </div>
            <div>
              <Label htmlFor="level">Experience level</Label>
              <Select id="level" value={level} onChange={(v) => setLevel(v)} className="mt-1">
                {levels.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Genres</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {GENRES.map((g) => (
                  <Tag key={g} label={g} selected={genres.includes(g)} toggle={() => toggleGenre(g)} />
                ))}
              </div>
            </div>
          </div>

          {err && <p className="mt-3 text-sm text-rose-600">{err}</p>}
          {ok && <p className="mt-3 text-sm text-emerald-600">{ok}</p>}

          <div className="mt-5 flex items-center gap-3 justify-end">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={onSave} loading={saving} disabled={saving}>Save changes</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

const GENRES = [
  "Street","Portrait","Landscape","Astro","Wildlife","Travel","Urban","Macro","Documentary"
];
