import type { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata: Metadata = { title: 'Sign in' };
export const revalidate = 600;

export default function SignInPage() {
  return (
    <AuthLayout>
      <AuthForm mode="signin" />
    </AuthLayout>
  );
}
