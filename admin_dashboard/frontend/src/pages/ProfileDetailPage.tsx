import { useState, type ReactNode } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useProfile,
  useProfileSummary,
  useProfileAiSummary,
} from '../hooks/useProfiles';
import { ProfilesApi } from '../api/endpoints';
import { toApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ProfileHeader } from '../components/ProfileHeader';
import { FlagBadge } from '../components/FlagBadge';
import { TraitBar } from '../components/TraitBar';
import { FinancialRadar } from '../components/FinancialRadar';
import { PsychometricRadar } from '../components/PsychometricRadar';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { OverrideForm } from '../components/OverrideForm';
import { AccessDenied } from '../components/AccessDenied';
import { recommendProducts } from '../utils/productRecommendation';
import type { Role } from '../types/api';

type ViewMode = 'analyst' | 'rm';

const OVERRIDE_ROLES: Role[] = ['product_analyst', 'tier1_admin', 'tier2_admin'];

function defaultViewFor(role: Role | undefined): ViewMode {
  return role === 'product_analyst' ? 'analyst' : 'rm';
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export function ProfileDetailPage() {
  const { playerId } = useParams<{ playerId: string }>();
  const { user } = useAuth();
  const [view, setView] = useState<ViewMode>(defaultViewFor(user?.role));

  if (!playerId) return null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/profiles"
          className="flex items-center gap-1 text-sm font-medium text-on-surface-variant hover:text-primary"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to profiles
        </Link>
        <div className="inline-flex rounded-lg border border-outline-variant bg-surface-container-lowest p-1 text-sm shadow-sm">
          <button
            onClick={() => setView('analyst')}
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              view === 'analyst'
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            Analyst view
          </button>
          <button
            onClick={() => setView('rm')}
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              view === 'rm'
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            RM quick-scan view
          </button>
        </div>
      </div>

      {view === 'analyst' ? (
        <AnalystLayout
          playerId={playerId}
          canOverride={!!user && OVERRIDE_ROLES.includes(user.role)}
        />
      ) : (
        <RmLayout playerId={playerId} />
      )}
    </div>
  );
}

function AnalystLayout({
  playerId,
  canOverride,
}: {
  playerId: string;
  canOverride: boolean;
}) {
  const { data: profile, isLoading, isError, error } = useProfile(playerId);
  const { data: summary } = useProfileSummary(playerId);
  const [overrideOpen, setOverrideOpen] = useState(false);

  if (isLoading) return <LoadingState />;
  if (isError) {
    const apiErr = toApiError(error);
    if (apiErr.status === 403) return <AccessDenied />;
    return <ErrorState detail={apiErr.detail} />;
  }
  if (!profile) return null;

  // Flatten a handful of psychometric sub-groups into one metric list, mirroring
  // player_profile_analyst_view/code.html's single "Psychometric Profile" card
  // (Loss Aversion / Decision Speed / ... all in one list rather than one card
  // per sub-group).
  const traitSources: Record<string, unknown>[] = [
    profile.psychometric_profile.personality_traits_lite ?? {},
    profile.psychometric_profile.decision_style ?? {},
    profile.psychometric_profile.risk_psychology ?? {},
    profile.psychometric_profile.time_preference ?? {},
    profile.psychometric_profile.social_and_influence ?? {},
    profile.psychometric_profile.stress_response ?? {},
  ];
  // Include null values too (not just measured ones) so unmeasured traits render as a visible
  // greyed-out row via TraitBar rather than silently vanishing from the list.
  const traitEntries: [string, number | null][] = [];
  for (const group of traitSources) {
    for (const [k, v] of Object.entries(group)) {
      if (typeof v === 'number' || v === null) traitEntries.push([k, v]);
    }
  }

  const consentEntries = Object.entries(profile.player.consent_status ?? {});
  const productRecs = recommendProducts(profile.financial_profile);

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Header strip */}
      <div className="relative overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
        <div className="pointer-events-none absolute right-0 top-0 h-full w-64 bg-gradient-to-l from-primary-fixed-dim/20 to-transparent" />
        <div className="relative z-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-surface bg-surface-container-high text-xl font-semibold text-on-surface-variant shadow-sm">
              {initials(profile.player.name)}
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-on-surface">
                  {profile.player.name}
                </h1>
                <span className="text-xs font-semibold uppercase tracking-wide text-outline">
                  {profile.player.external_game_id}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                  Joined {new Date(profile.player.signup_date).toLocaleDateString('en-IN')}
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  Last active {new Date(profile.player.last_active_at).toLocaleString('en-IN')}
                </span>
                <span className="flex items-center gap-1 text-primary">
                  <span className="material-symbols-outlined icon-fill text-[14px]">star</span>
                  Level {profile.player.current_game_level}
                </span>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col items-start gap-3 md:w-auto md:items-end">
            <div className="flex flex-wrap gap-2">
              {profile.segment_tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-outline-variant/50 bg-surface-container-high px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant"
                >
                  {tag}
                </span>
              ))}
            </div>
            <ConfidenceBadge level={profile.confidence_level} />
          </div>
        </div>
      </div>

      {/* 3-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Column 1 */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          <Card icon="radar" title="Competency Radar">
            <FinancialRadar financialLiteracy={profile.financial_profile.financial_literacy} />
          </Card>

          <Card icon="timeline" title="Recent Quests">
            {summary && summary.top_quests.length > 0 ? (
              <ol className="space-y-4 border-l-2 border-surface-container-highest pl-4">
                {summary.top_quests.slice(0, 4).map((q, i) => (
                  <li key={q.quest_id} className="relative">
                    <span
                      className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${
                        i === 0 ? 'bg-secondary' : 'border border-secondary bg-secondary-container'
                      }`}
                    />
                    <p
                      className={`text-sm font-medium ${
                        q.quest_type ? 'text-on-surface' : 'italic text-on-surface-variant/60'
                      }`}
                    >
                      {q.quest_type ?? q.quest_id.replace(/_/g, ' ')}
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-xs text-outline">
                        {new Date(q.completed_at).toLocaleDateString('en-IN')}
                      </p>
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                          q.outcome_score === null
                            ? 'italic text-on-surface-variant/60'
                            : 'bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        {q.outcome_score === null ? 'No score' : `${(q.outcome_score * 100).toFixed(0)}% score`}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-on-surface-variant">No quest history.</p>
            )}
          </Card>

          <div className="rounded-lg border border-[#FFE082] bg-[#FFF8E1] p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#F57F17]">
              <span className="material-symbols-outlined icon-fill text-[18px]">flag</span>
              Behavioral Flags
            </h3>
            {profile.open_mismatches.length === 0 ? (
              <p className="text-sm text-[#5D4037]/70">No open behavioral flags.</p>
            ) : (
              <div className="space-y-2">
                {profile.open_mismatches.map((m) => (
                  <div
                    key={m.id}
                    className="rounded border border-[#FFECB3] bg-white/60 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[#5D4037]">{m.mismatch_type}</span>
                      <span className="text-xs text-outline">
                        {new Date(m.detected_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#5D4037]/80">{m.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Column 2 */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          <Card icon="psychology" title="Psychometric Profile" className="flex-1">
            {/* Renders its own "No data" state when traitEntries is empty, and steps aside
                (null) rather than a degenerate radar when there are 1-2 axes -- the bar list
                below still covers that case either way. */}
            <PsychometricRadar traits={traitEntries} />
            {traitEntries.length > 0 && (
              <div className="mt-5 space-y-5">
                {traitEntries.slice(0, 6).map(([key, val], i) => (
                  <TraitBar key={key} label={key} value={val} colorIndex={i} />
                ))}
              </div>
            )}
            {!!profile.psychometric_profile.trait_summary_tags?.length && (
              <div className="mt-8 border-t border-surface-variant pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-outline">
                  Trait Summary Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {profile.psychometric_profile.trait_summary_tags.map((t) => (
                    <span
                      key={t}
                      className="rounded border border-outline-variant/30 bg-surface-container px-3 py-1 text-xs text-on-surface"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Column 3 */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          {profile.open_mismatches[0] && (
            <div className="relative overflow-hidden rounded-lg border-y border-r border-[#FFE0B2] border-l-4 border-l-[#FF9800] bg-[#FFF3E0] p-4 shadow-sm">
              <span className="material-symbols-outlined pointer-events-none absolute -right-4 -top-4 text-[80px] text-black/5">
                warning
              </span>
              <h3 className="relative z-10 mb-2 flex items-center gap-2 text-sm font-semibold text-[#E65100]">
                <span className="material-symbols-outlined text-[18px]">error</span>
                Mismatch Alert
              </h3>
              <p className="relative z-10 text-sm text-[#5D4037]">
                {profile.open_mismatches[0].description}
              </p>
            </div>
          )}

          {/* Rule-based (not ML) recommendation computed from this player's own
              financial_profile fields -- see utils/productRecommendation.ts for exactly which
              fields drive each pick, and why real vs. seeded/mock data take different paths. */}
          <Card icon="lightbulb" title="Recommended Products">
            {productRecs.length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                Not enough profile data yet to compute a recommendation.
              </p>
            ) : (
              <ul className="space-y-3">
                {productRecs.map((rec) => (
                  <li key={rec.product} className="flex items-start gap-3">
                    <span className="material-symbols-outlined mt-0.5 text-[18px] text-secondary">
                      add_circle
                    </span>
                    <div>
                      <p className="text-sm font-medium text-on-surface">{rec.product}</p>
                      <p className="mt-0.5 text-xs text-on-surface-variant">{rec.reason}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card icon="gavel" title="Compliance & Data" iconColor="text-outline" className="mt-auto">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-surface-variant/50 py-1">
                <span className="text-sm text-on-surface-variant">Minor-flag</span>
                <span className="rounded bg-surface-container px-1.5 py-0.5 text-xs text-outline">
                  {profile.player.minor_flag ? 'Yes' : 'No'}
                </span>
              </div>
              {consentEntries.length === 0 ? (
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-on-surface-variant">Consent status</span>
                  <span className="text-xs text-outline">Not recorded</span>
                </div>
              ) : (
                consentEntries.map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-1">
                    <span className="text-sm capitalize text-on-surface-variant">
                      {k.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-on-surface">{String(v)}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {overrideOpen && canOverride && <OverrideForm playerId={playerId} />}

      {/* Sticky bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-end gap-3 border-t border-outline-variant bg-surface-container-low px-4 shadow-lg md:left-[260px] md:px-6">
        <a
          href={ProfilesApi.exportUrl(playerId, 'json')}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container"
        >
          <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
          Export Snapshot
        </a>
        {canOverride && (
          <button
            onClick={() => setOverrideOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            Edit/Override Field
          </button>
        )}
        {canOverride && (
          <button
            onClick={() => setOverrideOpen(true)}
            title="Flagging for review is recorded as an override with a reason, since the API has no dedicated flag endpoint."
            className="flex items-center gap-2 rounded-lg bg-error-container px-4 py-2 text-sm font-medium text-on-error-container transition-opacity hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[18px]">flag</span>
            Flag for Review
          </button>
        )}
      </div>
    </div>
  );
}

function Card({
  icon,
  title,
  iconColor = 'text-primary',
  className = '',
  children,
}: {
  icon: string;
  title: string;
  iconColor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-lg border border-outline-variant bg-surface-container-lowest p-4 shadow-sm ${className}`}>
      <h3 className="mb-4 flex items-center gap-2 border-b border-surface-variant pb-2 text-sm font-semibold text-on-surface">
        <span className={`material-symbols-outlined ${iconColor}`}>{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function RmLayout({ playerId }: { playerId: string }) {
  const { data: summary, isLoading, isError, error } = useProfileSummary(playerId);
  const { data: aiSummary, isLoading: aiLoading } = useProfileAiSummary(playerId);
  const [basedOnOpen, setBasedOnOpen] = useState(false);

  if (isLoading) return <LoadingState />;
  if (isError) {
    const apiErr = toApiError(error);
    if (apiErr.status === 403) return <AccessDenied />;
    return <ErrorState detail={apiErr.detail} />;
  }
  if (!summary) return null;

  return (
    <div className="space-y-6">
      <ProfileHeader name={summary.name} segmentTags={summary.segment_tags} size="lg" />

      {/* AI summary callout, wired to GET /api/profiles/{id}/summary/ai */}
      <div className="rounded-xl border border-primary-fixed-dim bg-primary-fixed p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined mt-1 text-primary">smart_toy</span>
          <div className="flex-1">
            {aiLoading ? (
              <p className="text-sm text-on-primary-fixed-variant/70">Generating summary…</p>
            ) : (
              <p className="text-base font-medium leading-relaxed text-on-primary-fixed-variant">
                {aiSummary?.summary_text ?? 'No AI summary available for this player yet.'}
              </p>
            )}
            {!!aiSummary?.based_on.length && (
              <>
                <button
                  onClick={() => setBasedOnOpen((v) => !v)}
                  className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  Based on
                  <span
                    className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${
                      basedOnOpen ? 'rotate-180' : ''
                    }`}
                  >
                    expand_more
                  </span>
                </button>
                {basedOnOpen && (
                  <div className="mt-2 rounded border border-outline-variant bg-surface-container-lowest p-3 text-sm text-on-surface-variant">
                    <ul className="space-y-1.5">
                      {aiSummary.based_on.map((point, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="material-symbols-outlined mt-0.5 text-[16px]">chat</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiSummary.is_cached && (
                  <p className="mt-2 text-[11px] text-on-primary-fixed-variant/60">
                    Cached · generated {new Date(aiSummary.generated_at).toLocaleString('en-IN')}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Flag chip row, single source of truth via FlagBadge/flagColors.ts */}
      {summary.active_flags.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {summary.active_flags.map((f, i) => (
            <FlagBadge key={i} kind={f.kind} label={f.label} title={f.detail} variant="chip" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 border-b border-surface-container pb-2 text-base font-semibold text-on-surface">
            <span className="material-symbols-outlined text-on-surface-variant">sports_esports</span>
            Last 3 Quests
          </h3>
          {summary.top_quests.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No quest history.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {summary.top_quests.slice(0, 3).map((q) => (
                <li key={q.quest_id} className="flex items-center gap-3">
                  <span className="material-symbols-outlined icon-fill text-secondary">
                    check_circle
                  </span>
                  <div>
                    <p
                      className={`text-sm ${
                        q.quest_type ? 'text-on-surface' : 'italic text-on-surface-variant/60'
                      }`}
                    >
                      {q.quest_type ?? q.quest_id.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      Completed {new Date(q.completed_at).toLocaleDateString('en-IN')} ·{' '}
                      {q.outcome_score === null ? (
                        <span className="italic text-on-surface-variant/60">no score</span>
                      ) : (
                        `${(q.outcome_score * 100).toFixed(0)}% score`
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 border-b border-surface-container pb-2 text-base font-semibold text-on-surface">
            <span className="material-symbols-outlined text-on-surface-variant">forum</span>
            Last 3 Interactions
          </h3>
          {summary.top_interactions.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No interaction history.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {summary.top_interactions.slice(0, 3).map((it, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
                      i === 0 ? 'bg-primary' : 'bg-outline-variant'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-on-surface">{it.product_discussed}</p>
                    <p className="text-xs text-on-surface-variant">
                      {new Date(it.occurred_at).toLocaleDateString('en-IN')} ·{' '}
                      {it.interaction_type.replace(/_/g, ' ')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-8 text-center text-on-surface-variant">
      Loading profile…
    </div>
  );
}

function ErrorState({ detail }: { detail: string }) {
  return (
    <div className="rounded-lg border border-error-container bg-error-container/40 p-8 text-center text-on-error-container">
      {detail}
    </div>
  );
}
