import { buildMetadata } from "@/config/app";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = buildMetadata({
  title: "Login",
  description: "Email and password sign-in for Super Admin, influencer workspace, and student TradeHub routes.",
  pathname: "/login"
});

type LoginPageProps = {
  searchParams?: {
    next?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return <LoginForm initialNextPath={searchParams?.next} />;
}
