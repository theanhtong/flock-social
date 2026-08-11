import { ReportsManagerView } from '@/components/dashboard/reports-manager-view';

export const metadata = {
  title: 'Reports Queue | Admin & Moderation Console',
  description: 'Review and resolve user and content violation reports.',
};

export default function ReportsQueuePage() {
  return <ReportsManagerView />;
}
