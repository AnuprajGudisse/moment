import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";
import Label from "../components/Label";
import ErrorText from "../components/ErrorText";
import AuthShell from "../components/AuthShell";
import Divider from "../components/Divider";
import { supabase } from "../lib/supabase";

const validateEmail = (v) => /^[^ @]+@[^ @]+[.][^ @]+$/.test(v);

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    const next = {};
    if (!validateEmail(email)) next.email = "Enter a valid email.";
    if (password.length < 6) next.password = "Password must be at least 6 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setErrors({ email: " ", password: error.message }); // surface message near password
      return;
    }
    nav("/home");
  }

  return (
    <AuthShell
      onBackHome={async () => {
        // demo “guest” → anonymous sign-in pattern: use magic link / temp account later if you want
        nav("/home");
      }}
      footer={
        <p className="text-sm text-gray-600">
          New here?{" "}
          <Link to="/signup" className="font-medium underline" style={{ color: "var(--text)" }}>
            Create an account
          </Link>
        </p>
      }
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm muted mt-1">Log in to continue exploring moment.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" />
            <ErrorText>{errors.email}</ErrorText>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button type="button" className="text-xs underline" style={{ color: "var(--text)" }} onClick={() => setShow((s) => !s)}>
                {show ? "Hide" : "Show"}
              </button>
            </div>
            <Input
              id="password"
              type={show ? "text" : "password"}
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <ErrorText>{errors.password}</ErrorText>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Logging in…" : "Log in"}
          </Button>
        </form>

        <Divider label="or" />

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => alert("OAuth coming soon (enable in Supabase Auth)")}>
            Google
          </Button>
          <Button variant="outline" onClick={() => alert("OAuth coming soon (enable in Supabase Auth)")}>
            Apple
          </Button>
        </div>
      </div>
    </AuthShell>
  );
}
