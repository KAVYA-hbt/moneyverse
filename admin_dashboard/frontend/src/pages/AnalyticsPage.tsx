import type { ReactNode } from 'react';
import { useProfileAnalytics } from '../hooks/useProfiles';
import { TagBarChart } from '../components/TagBarChart';
import { ConfidenceBreakdownChart } from '../components/ConfidenceBreakdownChart';

export function AnalyticsPage() {
  const { data, isLoading, isError } = useProfileAnalytics();

  if (isLoading) {
    return (
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-8 text-center text-on-surface-variant">
        Loading analytics…
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="rounded-lg border border-error-container bg-error-container/40 p-8 text-center text-on-error-container">
        Could not load analytics.
      </div>
    );
  }

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-xl font-semibold text-primary">Cohort Analytics</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Aggregated across all {data.total_players.toLocaleString('en-IN')} profiles this account
          can see — live-synced real players alongside any seeded/mock demo data.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card icon="verified" title="Profile Confidence Breakdown">
          <ConfidenceBreakdownChart breakdown={data.confidence_breakdown} />
        </Card>

        <Card icon="psychology" title="Psychometric Trait Tags">
          <TagBarChart
            data={data.trait_tag_counts}
            emptyLabel="No psychometric trait tags detected yet."
          />
        </Card>

        <Card icon="sell" title="Financial Segment Tags" className="lg:col-span-2">
          <TagBarChart data={data.segment_tag_counts} limit={10} emptyLabel="No segment tags detected yet." />
        </Card>

        <Card icon="storefront" title="Product / Category Interest" className="lg:col-span-2">
          <p className="mb-3 text-xs italic text-on-surface-variant">
            Mixes two signal shapes: real players show quiz-engagement category labels (e.g.
            "insurance"), seeded/demo players show specific declared products (e.g.
            "SIP-Mutual-Fund") — see API_CONTRACT.md for why these aren't merged into one
            taxonomy.
          </p>
          <TagBarChart
            data={data.product_interest_counts}
            limit={10}
            emptyLabel="No product interest signal detected yet."
          />
        </Card>
      </div>
    </div>
  );
}

function Card({
  icon,
  title,
  className = '',
  children,
}: {
  icon: string;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-lg border border-outline-variant bg-surface-container-lowest p-4 shadow-sm ${className}`}>
      <h3 className="mb-4 flex items-center gap-2 border-b border-surface-variant pb-2 text-sm font-semibold text-on-surface">
        <span className="material-symbols-outlined text-primary">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}
