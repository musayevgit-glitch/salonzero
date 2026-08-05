'use client';

import {
  Alert,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  Dialog,
  DropdownMenu,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  List,
  ListItem,
  MobileRecordList,
  Pagination,
  PermissionDeniedState,
  RadioGroup,
  Select,
  Skeleton,
  Table,
  Tabs,
  Textarea,
  useToast,
} from '@salonomia/ui';
import { useState } from 'react';

const sampleRows = [
  { id: '1', name: 'Aysel Mammadova', service: 'Haircut', status: 'Confirmed' },
  { id: '2', name: 'Leyla Huseynova', service: 'Manicure', status: 'Pending' },
];

export function ShowcaseClient() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [page, setPage] = useState(1);
  const { showToast } = useToast();

  return (
    <div className="flex flex-col gap-8 p-8">
      <Breadcrumbs items={[{ label: 'Dev', href: '/dev' }, { label: 'Showcase' }]} />

      <section className="flex flex-wrap gap-2">
        <Button onClick={() => showToast('Saved successfully')}>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
          Delete
        </Button>
      </section>

      <section className="flex flex-wrap gap-2">
        <Badge tone="success">Confirmed</Badge>
        <Badge tone="warning">Pending</Badge>
        <Badge tone="danger">Cancelled</Badge>
        <Badge tone="neutral">Draft</Badge>
      </section>

      <section className="flex flex-col gap-4 md:flex-row">
        <FormField label="Full name" error="This field is required">
          {(fieldProps) => <Input {...fieldProps} placeholder="Jane Doe" />}
        </FormField>
        <FormField label="Notes" optional>
          {(fieldProps) => <Textarea {...fieldProps} />}
        </FormField>
        <FormField label="Service">
          {(fieldProps) => (
            <Select {...fieldProps}>
              <option>Haircut</option>
              <option>Manicure</option>
            </Select>
          )}
        </FormField>
      </section>

      <section className="flex flex-wrap gap-6">
        <Checkbox label="Accept salon policy" />
        <RadioGroup
          options={[
            { value: 'a', label: 'Specific stylist' },
            { value: 'b', label: 'Any suitable stylist' },
          ]}
        />
      </section>

      <Alert tone="info" title="Booking pending confirmation">
        The salon will confirm your reservation shortly.
      </Alert>

      <Card>
        <p className="text-text-primary">Card content</p>
      </Card>

      <List>
        <ListItem>Item one</ListItem>
        <ListItem>Item two</ListItem>
      </List>

      <Table
        columns={[
          { key: 'name', header: 'Customer', render: (r) => r.name },
          { key: 'service', header: 'Service', render: (r) => r.service },
          { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
        ]}
        rows={sampleRows}
        getRowKey={(r) => r.id}
      />
      <MobileRecordList
        rows={sampleRows}
        getRowKey={(r) => r.id}
        renderPrimary={(r) => r.name}
        renderSecondary={(r) => r.service}
        renderAction={(r) => <Badge>{r.status}</Badge>}
      />

      <Pagination page={page} pageCount={5} onPageChange={setPage} />

      <Tabs
        tabs={[
          { value: 'upcoming', label: 'Upcoming', content: <p>No upcoming reservations.</p> },
          { value: 'history', label: 'History', content: <p>No past reservations.</p> },
        ]}
      />

      <div className="flex flex-wrap gap-4">
        <Skeleton className="h-6 w-40" />
        <EmptyState
          title="No reservations yet"
          description="Browse salons to book your first appointment."
        />
        <ErrorState title="Something went wrong" description="Please try again." />
        <PermissionDeniedState />
      </div>

      <DropdownMenu
        trigger={<Button variant="secondary">Actions</Button>}
        items={[
          { label: 'Edit', onSelect: () => showToast('Edit selected') },
          { label: 'Delete', onSelect: () => showToast('Delete selected'), destructive: true },
        ]}
      />

      <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Reservation details"
        description="Example dialog"
      >
        <p className="text-text-primary">Dialog body content.</p>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Cancel reservation?"
        description="This cannot be undone."
        destructive
        confirmLabel="Cancel reservation"
        onConfirm={() => setConfirmOpen(false)}
      />
    </div>
  );
}
