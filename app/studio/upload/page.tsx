import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { sessionUser } from '@/server/auth/session';
import { AppShell } from '@/components/shell/AppShell';
import { PageHead } from '@/components/ui/PageHead';
import { StudioNav } from '../StudioNav';
import { UploadWizard } from './UploadWizard';

export const metadata: Metadata = { title: 'Upload' };

export default async function UploadPage() {
  const user = await sessionUser();
  if (!user) redirect('/signin?next=%2Fstudio%2Fupload');

  return (
    <AppShell>
      <StudioNav />
      <PageHead kicker="Creator Studio" title="Upload a video" subtitle="Four quick steps and you’re live." />
      <UploadWizard author={user.handle ? `@${user.handle}` : user.name} />
    </AppShell>
  );
}
