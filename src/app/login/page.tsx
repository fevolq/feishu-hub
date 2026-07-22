import { redirect } from "next/navigation";
import { isAuthenticated } from "@/modules/auth/server/guards";
import { LoginForm } from "@/modules/auth/ui/LoginForm";
import styles from "@/modules/auth/ui/Auth.module.css";

export default async function LoginPage() {
  if (await isAuthenticated()) {
    redirect("/");
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <h1 className={styles.title}>飞书组织</h1>
        <LoginForm />
      </section>
    </main>
  );
}

