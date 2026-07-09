import { redirect } from "next/navigation";
import { isAuthenticated } from "@/server/auth/guards";
import { LoginForm } from "@/app/login/LoginForm";

export default async function LoginPage() {
  if (await isAuthenticated()) {
    redirect("/");
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <h1 className="login-title">飞书组织后台</h1>
        <LoginForm />
      </section>
    </main>
  );
}

