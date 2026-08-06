'use client';

import { Button, ConfirmDialog, IconButton, Select, useToast } from '@salonomia/ui';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../lib/api-client';

interface AssignedService {
  id: string;
  name: string;
}

interface ServiceListItem {
  id: string;
  name: string;
  isActive: boolean;
}

interface ServiceListResponse {
  items: ServiceListItem[];
}

export function ServiceAssignment({
  salonId,
  employeeId,
}: {
  salonId: string;
  employeeId: string;
}) {
  const { showToast } = useToast();
  const [assigned, setAssigned] = useState<AssignedService[] | null>(null);
  const [allServices, setAllServices] = useState<ServiceListItem[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [unassignTarget, setUnassignTarget] = useState<AssignedService | null>(null);
  const [unassigning, setUnassigning] = useState(false);

  const basePath = `/salons/${salonId}/employees/${employeeId}/services`;

  function load() {
    apiFetch<AssignedService[]>(basePath)
      .then(setAssigned)
      .catch(() => setAssigned([]));
  }

  useEffect(load, [salonId, employeeId]);

  useEffect(() => {
    apiFetch<ServiceListResponse>(`/salons/${salonId}/services?isActive=true&pageSize=100`)
      .then((res) => setAllServices(res.items))
      .catch(() => undefined);
  }, [salonId]);

  const assignedIds = new Set((assigned ?? []).map((s) => s.id));
  const availableToAssign = allServices.filter((s) => !assignedIds.has(s.id));

  async function handleAssign() {
    if (!selectedServiceId) return;
    setAssigning(true);
    try {
      await apiFetch(basePath, {
        method: 'POST',
        body: JSON.stringify({ serviceId: selectedServiceId }),
      });
      showToast('Service assigned');
      setSelectedServiceId('');
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not assign service.', 'danger');
    } finally {
      setAssigning(false);
    }
  }

  async function handleUnassignConfirm() {
    if (!unassignTarget) return;
    setUnassigning(true);
    try {
      await apiFetch(`${basePath}/${unassignTarget.id}`, { method: 'DELETE' });
      showToast('Service unassigned');
      setUnassignTarget(null);
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not unassign service.', 'danger');
    } finally {
      setUnassigning(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Select
          value={selectedServiceId}
          onChange={(e) => setSelectedServiceId(e.target.value)}
          className="sm:max-w-xs"
          aria-label="Service to assign"
        >
          <option value="">Select a service…</option>
          {availableToAssign.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </Select>
        <Button
          type="button"
          onClick={handleAssign}
          loading={assigning}
          disabled={assigning || !selectedServiceId}
        >
          Assign
        </Button>
      </div>

      {!assigned || assigned.length === 0 ? (
        <p className="text-sm text-text-secondary">No services assigned yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {assigned.map((service) => (
            <li
              key={service.id}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border p-3"
            >
              <span>{service.name}</span>
              <IconButton
                label={`Unassign ${service.name}`}
                icon={<span aria-hidden="true">✕</span>}
                onClick={() => setUnassignTarget(service)}
              />
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={unassignTarget !== null}
        onOpenChange={(open) => !open && setUnassignTarget(null)}
        title={`Unassign ${unassignTarget?.name ?? 'this service'}?`}
        description="The employee will no longer be bookable for this service."
        confirmLabel="Unassign"
        destructive
        confirming={unassigning}
        onConfirm={handleUnassignConfirm}
      />
    </div>
  );
}
