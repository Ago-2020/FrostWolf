import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import PasswordInput from "../components/PasswordInput";

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!accepted) {
      setError("Please accept the Terms of Service and Privacy Policy to continue.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      return;
    }

    if (!data.session) {
      setError("Check your email to confirm your account, then log in.");
      return;
    }

    navigate("/dashboard");
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <h1 className="mb-6 text-2xl font-bold text-white">Sign up</h1>

      {error && (
        <p className="mb-4 rounded bg-red-900/50 p-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
        />
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            required
            className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
          />
          <span>
            I agree to the{" "}
            <Link to="/terms" className="text-blue-400 hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-blue-400 hover:underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        <button
          disabled={!accepted}
          className="rounded bg-blue-600 py-2 font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sign up
        </button>
      </form>

      <p className="mt-4 text-sm text-zinc-400">
        Already have an account?{" "}
        <Link to="/login" className="text-blue-400 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

export default Signup;