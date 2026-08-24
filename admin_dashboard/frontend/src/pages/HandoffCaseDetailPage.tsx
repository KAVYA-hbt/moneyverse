import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useHandoffCase } from '../hooks/useHandoffs';
import { useProfileAiSummary } from '../hooks/useProfiles';
import { HandoffsApi } from '../api/endpoints';
import { toApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { FlagBadge } from '../components/FlagBadge';
import { ProfileHeader } from '../components/ProfileHeader';
import { TranscriptList } from '../components/TranscriptList';
import { AccessDenied } from '../components/AccessDenied';

export function HandoffCaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useHandoffCase(caseId);

  if (!caseId) return null;
  if (isLoading) {
    return (
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-8 text-center text-on-surface-variant">
        Loading case…
      </div>
    );
  }
  if (isError) {
    const apiErr = toApiError(error);
    if (apiErr.status === 403) {
      return <AccessDenied message="This case belongs to a tier your role can't access." />;
    }
    return (
      <div className="rounded-lg border border-error-container bg-error-container/40 p-8 text-center text-on-error-container">
        {apiErr.detail}
      </div>
    );
  }
  if (!data) return null;

  const { case: caseObj, transcript, profile_summary } = data;
  const isReadOnly = user?.role === 'product_analyst';

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['handoff-case', caseId] });
    queryClient.invalidateQueries({ queryKey: ['handoffs'] });
  }

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-on-surface-variant">
        <Link to="/handoffs" className="flex items-center gap-1 hover:text-primary">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Hand-off Queue
        </Link>
        <span>/</span>
        <span className="text-on-surface">Case #{caseObj.id.slice(0, 8)}</span>
        <StatusPill status={caseObj.status} className="ml-auto" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        {/* LEFT: transcript */}
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm lg:w-[60%] lg:flex-none">
          <div className="flex shrink-0 items-center justify-between border-b border-surface-variant px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                <span className="material-symbols-outlined text-[18px]">forum</span>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-on-surface">Conversation Transcript</h2>
                <p className="text-xs text-on-surface-variant">
                  Trigger: {caseObj.trigger_reason.replace(/_/g, ' ')} · Tier {caseObj.tier_required}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-1.5">
              {profile_summary.active_flags.map((f, i) => (
                <FlagBadge key={i} kind={f.kind} label={f.label} title={f.detail} />
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <TranscriptList messages={transcript} botReasoningText={caseObj.bot_reasoning_text} />
          </div>
        </section>

        {/* RIGHT: stacked cards */}
        <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-1 lg:w-[40%] lg:flex-none">
          <PlayerSummaryCard
            playerId={caseObj.player_id}
            name={profile_summary.name}
            segmentTags={profile_summary.segment_tags}
          />

          <div className="flex flex-col gap-2 rounded-xl border border-tertiary-fixed-dim bg-tertiary-fixed/30 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-on-tertiary-container">
              <span className="material-symbols-outlined">lightbulb</span>
              <h3 className="text-base font-bold">Suggested Next Action</h3>
            </div>
            <p className="ml-7 text-sm leading-relaxed text-on-surface">
              {caseObj.bot_reasoning_text || 'No reasoning recorded by the bot for this case.'}
            </p>
            {caseObj.escalation_reason_text && (
              <p className="ml-7 mt-1 text-xs text-on-surface-variant">
                <span className="font-semibold">Escalation reason:</span>{' '}
                {caseObj.escalation_reason_text}
              </p>
            )}
          </div>

          <ActionsPanel
            caseId={caseId}
            status={caseObj.status}
            tierRequired={caseObj.tier_required}
            isReadOnly={isReadOnly}
            userRole={user?.role}
            escalationSource={caseObj.escalation_source}
            onDone={invalidate}
          />
        </section>
      </div>
    </div>
  );
}

function PlayerSummaryCard({
  playerId,
  name,
  segmentTags,
}: {
  playerId: string;
  name: string;
  segmentTags: string[];
}) {
  const { data: aiSummary } = useProfileAiSummary(playerId);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-on-surface">
          <span className="material-symbols-outlined text-on-surface-variant">account_circle</span>
          Player Profile Summary
        </h3>
        <Link
          to={`/profiles/${playerId}`}
          className="rounded p-1 text-primary transition-colors hover:bg-primary-fixed/40"
          title="Open full profile"
        >
          <span className="material-symbols-outlined text-[20px]">open_in_new</span>
        </Link>
      </div>
      <ProfileHeader name={name} segmentTags={segmentTags} size="sm" />
      {aiSummary && (
        <div className="mt-1 flex gap-3 rounded-lg border border-surface-variant bg-surface p-3 text-[13px] leading-relaxed text-on-surface">
          <span className="material-symbols-outlined mt-0.5 shrink-0 text-[18px] text-primary">
            auto_awesome
          </span>
          <p>{aiSummary.summary_text}</p>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status, className = '' }: { status: string; className?: string }) {
  const styles: Record<string, string> = {
    open: 'bg-error-container text-on-error-container border-error/20',
    claimed: 'bg-[#E3F2FD] text-[#0d47a1] border-[#90CAF9]',
    resolved: 'bg-[#E0F2F1] text-[#00695C] border-[#B2DFDB]',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${styles[status] ?? ''} ${className}`}
    >
      {status}
    </span>
  );
}

function ActionsPanel({
  caseId,
  status,
  tierRequired,
  isReadOnly,
  userRole,
  escalationSource,
  onDone,
}: {
  caseId: string;
  status: string;
  tierRequired: number;
  isReadOnly: boolean;
  userRole: string | undefined;
  escalationSource: string | null;
  onDone: () => void;
}) {
  if (isReadOnly) {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-sm text-on-surface-variant shadow-sm">
        Product analysts have read-only access to hand-off cases.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-on-surface">Case Actions</h3>
        {escalationSource && (
          <span className="flex items-center gap-1 rounded-full border border-primary-fixed-dim bg-primary-container px-2 py-1 text-[10px] font-medium text-on-primary-container">
            <span className="material-symbols-outlined text-[12px]">bolt</span>
            {escalationSource === 'auto' ? 'Auto-triggered' : 'Manually escalated'}
          </span>
        )}
      </div>

      <ClaimAction caseId={caseId} status={status} onDone={onDone} />
      <div className="grid grid-cols-1 gap-2">
        <ResolveAction caseId={caseId} status={status} onDone={onDone} />
        <SendBackAction caseId={caseId} onDone={onDone} />
      </div>
      {userRole === 'tier1_admin' && tierRequired === 1 && (
        <EscalateAction caseId={caseId} onDone={onDone} />
      )}

      {/* Both this and "Resolve Fast" above call POST /handoffs/{id}/resolve —
          the wireframe deliberately offers two affordances (a quick one-line
          resolve and a fuller Resolution Log with a structured outcome +
          notes), so we keep both UI entry points rather than collapsing them
          into one form. */}
      <ResolutionLog caseId={caseId} onDone={onDone} />
    </div>
  );
}

function ClaimAction({
  caseId,
  status,
  onDone,
}: {
  caseId: string;
  status: string;
  onDone: () => void;
}) {
  const mutation = useMutation({
    mutationFn: () => HandoffsApi.claim(caseId),
    onSuccess: onDone,
  });

  return (
    <div>
      <button
        onClick={() => mutation.mutate()}
        disabled={status !== 'open' || mutation.isPending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-on-primary transition-all hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-[18px]">pan_tool</span>
        {mutation.isPending ? 'Claiming…' : 'Claim Case & Initiate Contact'}
      </button>
      {mutation.isError && (
        <p className="mt-1.5 text-xs text-error">{toApiError(mutation.error).detail}</p>
      )}
    </div>
  );
}

function ResolveAction({
  caseId,
  status,
  onDone,
}: {
  caseId: string;
  status: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () => HandoffsApi.resolve(caseId, { outcome, notes }),
    onSuccess: () => {
      onDone();
      setOutcome('');
      setNotes('');
      setOpen(false);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={status === 'resolved'}
        className="flex items-center justify-center gap-2 rounded-lg border border-outline-variant py-2 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-[18px]">check_circle</span>
        Resolve Fast
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="col-span-full flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface p-3"
    >
      <input
        required
        value={outcome}
        onChange={(e) => setOutcome(e.target.value)}
        placeholder="Outcome"
        className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <textarea
        required
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Resolution notes"
        rows={2}
        className="w-full resize-none rounded-md border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-3 py-1.5 text-sm text-on-surface-variant hover:bg-surface-container"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-on-secondary hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? 'Resolving…' : 'Resolve case'}
        </button>
      </div>
      {mutation.isError && (
        <p className="text-xs text-error">{toApiError(mutation.error).detail}</p>
      )}
    </form>
  );
}

function SendBackAction({ caseId, onDone }: { caseId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const mutation = useMutation({
    mutationFn: () => HandoffsApi.sendBack(caseId, { note }),
    onSuccess: () => {
      onDone();
      setNote('');
      setOpen(false);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 rounded-lg border border-outline-variant py-2 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container"
      >
        <span className="material-symbols-outlined text-[18px]">undo</span>
        Send Back to Bot
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="col-span-full flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface p-3"
    >
      <textarea
        required
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note for the next reviewer"
        rows={2}
        className="w-full resize-none rounded-md border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-3 py-1.5 text-sm text-on-surface-variant hover:bg-surface-container"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md border border-outline-variant px-3 py-1.5 text-sm font-medium text-on-surface hover:bg-surface-container disabled:opacity-50"
        >
          {mutation.isPending ? 'Sending…' : 'Send back'}
        </button>
      </div>
      {mutation.isError && (
        <p className="text-xs text-error">{toApiError(mutation.error).detail}</p>
      )}
    </form>
  );
}

function EscalateAction({ caseId, onDone }: { caseId: string; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const mutation = useMutation({
    mutationFn: () => HandoffsApi.escalate(caseId, { escalation_reason_text: reason }),
    onSuccess: () => {
      onDone();
      setReason('');
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 border-t border-surface-variant pt-3"
    >
      <label className="text-xs font-medium text-on-surface-variant">
        Escalate to Tier 2 (requires reasoning)
      </label>
      <textarea
        required
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Detail the specific regulatory or risk factors requiring senior review…"
        rows={2}
        className="w-full resize-none rounded-md border border-outline-variant bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      />
      <button
        type="submit"
        disabled={mutation.isPending}
        className="flex items-center gap-1 self-end rounded border border-error/50 px-3 py-1.5 text-sm font-medium text-error transition-colors hover:bg-error-container disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
        {mutation.isPending ? 'Escalating…' : 'Escalate'}
      </button>
      {mutation.isError && (
        <p className="text-xs text-error">{toApiError(mutation.error).detail}</p>
      )}
    </form>
  );
}

function ResolutionLog({ caseId, onDone }: { caseId: string; onDone: () => void }) {
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const mutation = useMutation({
    mutationFn: () => HandoffsApi.resolve(caseId, { outcome, notes }),
    onSuccess: () => {
      onDone();
      setOutcome('');
      setNotes('');
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 flex flex-col gap-3 border-t border-surface-variant pt-3"
    >
      <h4 className="flex items-center gap-2 text-sm font-semibold text-on-surface">
        <span className="material-symbols-outlined text-on-surface-variant">edit_document</span>
        Resolution Log
      </h4>
      <div>
        <label className="mb-1 block text-xs font-medium text-on-surface-variant">Outcome</label>
        <select
          required
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          className="w-full rounded-md border border-outline-variant bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        >
          <option value="" disabled>
            Select an outcome…
          </option>
          <option value="resolved_advised">User advised — resolved</option>
          <option value="escalation_declined">Escalation declined — monitoring</option>
          <option value="account_restricted">Account temporarily restricted</option>
          <option value="approved_with_limits">Approved with strict limits</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-on-surface-variant">
          Analyst Notes (internal)
        </label>
        <textarea
          required
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Document actions taken, user's response, and any follow-up required…"
          rows={3}
          className="w-full resize-none rounded-md border border-outline-variant bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>
      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex items-center gap-1 rounded-md bg-surface-tint px-4 py-1.5 text-sm font-medium text-on-primary shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[16px]">save</span>
          {mutation.isPending ? 'Saving…' : 'Save Log'}
        </button>
      </div>
      {mutation.isError && (
        <p className="text-xs text-error">{toApiError(mutation.error).detail}</p>
      )}
    </form>
  );
}
