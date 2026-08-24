import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ProfilesApi } from '../api/endpoints';
import { toApiError } from '../api/client';

export function OverrideForm({ playerId }: { playerId: string }) {
  const queryClient = useQueryClient();
  const [fieldPath, setFieldPath] = useState('');
  const [newValue, setNewValue] = useState('');
  const [reason, setReason] = useState('');
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      ProfilesApi.override(playerId, {
        field_path: fieldPath,
        new_value: newValue,
        reason,
      }),
    onSuccess: () => {
      setSuccess(true);
      setFieldPath('');
      setNewValue('');
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['profile', playerId] });
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSuccess(false);
    mutation.mutate();
  }

  const fieldClass =
    'w-full rounded-md border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-4 shadow-sm"
    >
      <h3 className="text-sm font-semibold text-on-surface">Manual override</h3>
      <div>
        <label className="mb-1 block text-xs font-medium text-on-surface-variant">
          Field path
        </label>
        <input
          required
          value={fieldPath}
          onChange={(e) => setFieldPath(e.target.value)}
          placeholder="financial_profile.segment_tags"
          className={fieldClass}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-on-surface-variant">
          New value
        </label>
        <input
          required
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          className={fieldClass}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-on-surface-variant">
          Reason
        </label>
        <textarea
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className={fieldClass}
        />
      </div>

      {mutation.isError && (
        <div className="rounded-md bg-error-container px-3 py-2 text-xs text-on-error-container">
          {toApiError(mutation.error).detail}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-[#E0F2F1] px-3 py-2 text-xs text-[#00695C]">
          Override recorded.
        </div>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-on-primary hover:bg-primary-container disabled:opacity-60"
      >
        {mutation.isPending ? 'Submitting…' : 'Submit override'}
      </button>
    </form>
  );
}
