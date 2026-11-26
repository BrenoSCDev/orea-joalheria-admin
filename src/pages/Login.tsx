import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import logo from "@/assets/brand/logo-orea.png";
import logoLight from "@/assets/brand/logo-orea-light.png";
import visual from "@/assets/brand/login-visual.webp";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand visual */}
      <div className="relative hidden overflow-hidden bg-primary lg:block">
        <img src={visual} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#35333D]/85 via-[#35333D]/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white">
          <img src={logoLight} alt="Oréa" className="h-10 w-auto" />
          <p className="mt-4 max-w-sm text-[15px] text-white/80">Painel de gestão do catálogo, das coleções e do site da Oréa Joalheria.</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          <img src={logo} alt="Oréa" className="mb-10 h-9 w-auto lg:hidden" />
          <h1 className="text-2xl">Entrar no painel</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Use seu e-mail e senha de administrador.</p>

          <div className="mt-8 space-y-4">
            <Field label="E-mail" htmlFor="email">
              <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </Field>
            <Field label="Senha" htmlFor="password">
              <div className="relative">
                <Input id="password" type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-10" />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                  aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
          </div>

          {error && <p className="mt-4 rounded-lg bg-destructive-light px-3 py-2 text-[13px] text-destructive">{error}</p>}

          <Button type="submit" className="mt-6 h-10 w-full" disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />} Entrar
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
