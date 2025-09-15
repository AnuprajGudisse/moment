import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";
import Label from "../components/Label";
import ErrorText from "../components/ErrorText";
import AuthShell from "../components/AuthShell";
import Tag from "../components/Tag";
import Select from "../components/Select";
import { supabase } from "../lib/supabase";

const validateEmail = (v) => /^[^ @]+@[^ @]+[.][^ @]+$/.test(v);
const minPassLen = 6;
const levels = ["Beginner", "Enthusiast", "Professional"];
const genresAll = ["Street","Portrait","Landscape","Astro","Wildlife","Travel","Urban","Macro","Documentary"];

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [level, setLevel] = useState(levels[0]);
  const [genres, setGenres] = useState([]);
  const [location, setLocation] = useState("");
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const canSubmit = useMemo(
    () => fullName.trim() && username.trim() && validateEmail(email) && password.length >= minPassLen && agree,
    [fullName, username, email, password, agree]
  );

  function toggleGenre(g) {
    console.log(`toggleGenre called for: ${g}, current genres:`, genres);
    setGenres((prev) => {
      const newGenres = prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g];
      console.log(`New genres state:`, newGenres);
      return newGenres;
    });
  }

  async function submit(e) {
    e.preventDefault();
    const next = {};
    if (!fullName.trim()) next.fullName = "Please enter your name.";
    if (!username.trim()) next.username = "Choose a username.";
    if (!validateEmail(email)) next.email = "Enter a valid email.";
    if (password.length < minPassLen) next.password = `Password must be at least ${minPassLen} characters.`;
    if (!agree) next.agree = "You must accept the Terms.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    // Store full_name in user metadata so the trigger can pick it up if needed
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, username, level, genres, location },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    setLoading(false);

    if (error) {
      setErrors({ password: error.message });
      return;
    }

    // If email confirmation is ON, there may be no active session after sign-up
    if (!data.session) {
      alert("Check your email to confirm your account, then log in.");
      nav("/login");
      return;
    }

    // Optional: write extra profile fields after signup (username, level, genres, location)
    // You can do this later on the Profile page too:
    try {
      const user = data.session.user;
      await supabase.from("profiles").update({
        username,
        full_name: fullName,
        location,
        level,
        genres,
        email, // keep profiles.email in sync for username login
      }).eq("id", user.id);
    } catch {
      /* swallow for now; user can complete profile later */
    }

    nav("/home");
  }

  return (
    <AuthShell
      onBackHome={() => nav("/login")}
      footer={
        <p className="text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="font-medium underline" style={{ color: "var(--text)" }}>Log in</Link>
        </p>
      }
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm muted mt-1">Join a community that cares about photography.</p>

        <form onSubmit={submit} className="mt-6 grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" value={fullName} onChange={setFullName} placeholder="Annie Leibovitz" />
            <ErrorText>{errors.fullName}</ErrorText>
          </div>

          <div>
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={username} onChange={setUsername} placeholder="@yourhandle" />
            <ErrorText>{errors.username}</ErrorText>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" />
            <ErrorText>{errors.email}</ErrorText>
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={setPassword} placeholder="Create a strong password" autoComplete="new-password" />
            <ErrorText>{errors.password}</ErrorText>
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

          <div>
            <Label>Genres</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {genresAll.map((g) => (
                <Tag key={g} label={g} selected={genres.includes(g)} toggle={() => toggleGenre(g)} />
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <input id="agree" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
            <label htmlFor="agree" className="text-sm" style={{ color: "var(--text)" }}>
              I agree to the <a className="underline" style={{ color: "var(--text)" }} href="#">Terms</a> and <a className="underline" style={{ color: "var(--text)" }} href="#">Privacy</a>.
            </label>
          </div>

          <ErrorText>{errors.agree}</ErrorText>
          <Button type="submit" disabled={!canSubmit || loading}>{loading ? "Creating…" : "Create account"}</Button>
        </form>
      </div>
    </AuthShell>
  );
}
