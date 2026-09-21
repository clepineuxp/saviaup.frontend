import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiAlertComponent } from '../../../shared/components/ui-alert/ui-alert.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { OrganizationDatePipe } from '../../../shared/pipes/organization-date.pipe';
import { PrintingStore } from '../data-access/printing-store.service';
import {
  AvailablePrinter,
  DEFAULT_PRINT_JOB_QUERY,
  PrintAgent,
  Printer,
  PrintingTab,
  PrintingZone,
  PrintJob,
  PrintJobQuery,
  PrinterConnectionType,
} from '../models/printing.model';

interface PrintTicketItem {
  quantity: number;
  name: string;
  modifiers: readonly string[];
  notes: string | null;
}

interface PrintTicketPreview {
  documentType: string;
  orderNumber: string;
  table: string | null;
  waiter: string;
  createdAt: string | null;
  items: readonly PrintTicketItem[];
  notes: string | null;
  isReprint: boolean;
  printerName: string | null;
  organizationName: string | null;
  footerMessage: string | null;
}

@Component({
  selector: 'app-printing-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    OrganizationDatePipe,
    UiAlertComponent,
  ],
  templateUrl: './printing-page.component.html',
  styleUrl: './printing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintingPageComponent implements OnInit {
  readonly store = inject(PrintingStore);
  private readonly fb = inject(FormBuilder);

  readonly activeTab = signal<PrintingTab>('agents');
  readonly editingPrinter = signal<Printer | null>(null);
  readonly editingZone = signal<PrintingZone | null>(null);
  readonly selectedAgent = signal<PrintAgent | null>(null);
  readonly selectedJob = signal<PrintJob | null>(null);

  readonly pairingForm = this.fb.nonNullable.group({
    agentName: ['', [Validators.maxLength(120)]],
    locationId: [''],
  });

  readonly printerForm = this.fb.nonNullable.group({
    printAgentId: ['', Validators.required],
    name: ['', [Validators.required, Validators.maxLength(120)]],
    connectionType: ['WINDOWS_SPOOLER' as PrinterConnectionType, Validators.required],
    localPrinterName: [''],
    ipAddress: [''],
    port: [9100, [Validators.min(1), Validators.max(65535)]],
    paperWidth: [80, Validators.required],
    enabled: [true],
  });

  readonly zoneForm = this.fb.nonNullable.group({
    locationId: [''],
    printAgentId: ['', Validators.required],
    name: ['', [Validators.required, Validators.maxLength(120)]],
    enabled: [true],
    printerIds: [[] as string[]],
    categoryIds: [[] as string[]],
    productIds: [[] as string[]],
  });

  readonly filterForm = this.fb.nonNullable.group({
    search: [''],
    status: [''],
    zoneId: [''],
    agentId: [''],
    printerId: [''],
    fromDate: [''],
    toDate: [''],
  });

  ngOnInit(): void {
    this.store.initialize().subscribe(() => {
      const firstLocation = this.store.locations()[0]?.id ?? '';
      const firstAgent = this.store.agents()[0]?.id ?? '';
      this.pairingForm.patchValue({ locationId: firstLocation });
      this.printerForm.patchValue({ printAgentId: firstAgent });
      this.zoneForm.patchValue({ locationId: firstLocation, printAgentId: firstAgent });
      if (!this.canShowAgents()) this.activeTab.set(this.canShowZones() ? 'zones' : 'queue');
      if (firstAgent && this.canShowAgents())
        this.store.loadAvailablePrinters(firstAgent).subscribe();
    });
  }

  canShowAgents(): boolean {
    return (
      this.store.hasPermission('printing.agents.read') ||
      this.store.hasPermission('printing.agents.manage')
    );
  }

  canShowZones(): boolean {
    return (
      this.store.hasPermission('printing.zones.read') ||
      this.store.hasPermission('printing.zones.manage')
    );
  }

  canManageAgents(): boolean {
    return this.store.hasPermission('printing.agents.manage');
  }

  canManageZones(): boolean {
    return this.store.hasPermission('printing.zones.manage');
  }

  setTab(tab: PrintingTab): void {
    this.activeTab.set(tab);
    this.selectedJob.set(null);
  }

  linkDiscoveredAgent(discoveryId: string): void {
    if (this.pairingForm.invalid) return this.pairingForm.markAllAsTouched();
    const value = this.pairingForm.getRawValue();
    this.store
      .linkDiscoveredAgent(discoveryId, value.locationId || null, value.agentName.trim() || null)
      .subscribe((agent) => this.selectAgent(agent));
  }

  selectAgent(agent: PrintAgent): void {
    this.selectedAgent.set(agent);
    this.printerForm.patchValue({ printAgentId: agent.id });
    this.store.loadAvailablePrinters(agent.id).subscribe();
  }

  onPrinterAgentChange(): void {
    this.printerForm.patchValue({ localPrinterName: '' });
    this.store.loadAvailablePrinters(this.printerForm.controls.printAgentId.value).subscribe();
  }

  discoverPrinters(): void {
    const agentId = this.printerForm.controls.printAgentId.value;
    if (!agentId) return;
    this.store.requestPrinterDiscovery(agentId).subscribe();
  }

  selectAvailablePrinter(): void {
    const localName = this.printerForm.controls.localPrinterName.value;
    if (!localName || this.printerForm.controls.name.value.trim()) return;
    this.printerForm.patchValue({ name: localName });
  }

  availableWindowsPrinters(): readonly AvailablePrinter[] {
    const agentId = this.printerForm.controls.printAgentId.value;
    const currentName = this.editingPrinter()?.localPrinterName;
    return this.store
      .availablePrinters()
      .filter(
        (printer) =>
          printer.printAgentId === agentId &&
          printer.isAvailable &&
          (!printer.isConfigured || printer.name === currentName),
      );
  }

  currentPrinterIsMissingFromDiscovery(): boolean {
    const currentName = this.editingPrinter()?.localPrinterName;
    return (
      !!currentName && !this.availableWindowsPrinters().some((item) => item.name === currentName)
    );
  }

  toggleAgent(agent: PrintAgent): void {
    this.store.updateAgent(agent.id, agent.name, !agent.enabled).subscribe();
  }

  deleteAgent(agent: PrintAgent): void {
    this.store.deleteAgent(agent.id).subscribe(() => {
      if (this.selectedAgent()?.id === agent.id) this.selectedAgent.set(null);
    });
  }

  editPrinter(printer: Printer): void {
    this.editingPrinter.set(printer);
    this.printerForm.reset({
      printAgentId: printer.printAgentId,
      name: printer.name,
      connectionType: printer.connectionType,
      localPrinterName: printer.localPrinterName ?? '',
      ipAddress: printer.ipAddress ?? '',
      port: printer.port ?? 9100,
      paperWidth: printer.paperWidth,
      enabled: printer.enabled,
    });
    this.store.loadAvailablePrinters(printer.printAgentId).subscribe();
  }

  cancelPrinterEdit(): void {
    const agentId = this.selectedAgent()?.id ?? this.store.agents()[0]?.id ?? '';
    this.editingPrinter.set(null);
    this.printerForm.reset({
      printAgentId: agentId,
      name: '',
      connectionType: 'WINDOWS_SPOOLER',
      localPrinterName: '',
      ipAddress: '',
      port: 9100,
      paperWidth: 80,
      enabled: true,
    });
  }

  savePrinter(): void {
    if (
      this.printerForm.controls.connectionType.value === 'WINDOWS_SPOOLER' &&
      !this.printerForm.controls.localPrinterName.value
    ) {
      this.printerForm.controls.localPrinterName.setErrors({ required: true });
    }
    if (this.printerForm.invalid) return this.printerForm.markAllAsTouched();
    const value = this.printerForm.getRawValue();
    this.store
      .savePrinter(this.editingPrinter()?.id ?? null, {
        printAgentId: value.printAgentId,
        name: value.name.trim(),
        connectionType: value.connectionType,
        localPrinterName:
          value.connectionType === 'WINDOWS_SPOOLER' ? value.localPrinterName.trim() || null : null,
        ipAddress:
          value.connectionType !== 'WINDOWS_SPOOLER' ? value.ipAddress.trim() || null : null,
        port: value.connectionType !== 'WINDOWS_SPOOLER' ? value.port : null,
        paperWidth: Number(value.paperWidth),
        enabled: value.enabled,
      })
      .subscribe(() => this.cancelPrinterEdit());
  }

  deletePrinter(printer: Printer): void {
    this.store.deletePrinter(printer.id).subscribe();
  }

  testPrinter(printer: Printer): void {
    this.store.testPrint(printer.printAgentId, printer.id).subscribe();
  }

  printersForAgent(agentId: string): readonly Printer[] {
    return this.store.printers().filter((printer) => printer.printAgentId === agentId);
  }

  agentName(agentId: string): string {
    return this.store.agents().find((agent) => agent.id === agentId)?.name ?? agentId;
  }

  editZone(zone: PrintingZone): void {
    this.editingZone.set(zone);
    this.zoneForm.reset({
      locationId: zone.locationId,
      printAgentId: zone.printAgentId,
      name: zone.name,
      enabled: zone.enabled,
      printerIds: [...zone.printerIds],
      categoryIds: [...zone.categoryIds],
      productIds: [...zone.productIds],
    });
  }

  cancelZoneEdit(): void {
    this.editingZone.set(null);
    this.zoneForm.reset({
      locationId: this.store.locations()[0]?.id ?? '',
      printAgentId: this.store.agents()[0]?.id ?? '',
      name: '',
      enabled: true,
      printerIds: [],
      categoryIds: [],
      productIds: [],
    });
  }

  saveZone(): void {
    if (this.zoneForm.invalid) return this.zoneForm.markAllAsTouched();
    const value = this.zoneForm.getRawValue();
    this.store
      .saveZone(this.editingZone()?.id ?? null, {
        locationId: value.locationId || null,
        printAgentId: value.printAgentId,
        name: value.name.trim(),
        enabled: value.enabled,
        printerIds: value.printerIds,
        categoryIds: value.categoryIds,
        productIds: value.productIds,
      })
      .subscribe(() => this.cancelZoneEdit());
  }

  deleteZone(zone: PrintingZone): void {
    this.store.deleteZone(zone.id).subscribe();
  }

  optionNames(ids: readonly string[], source: 'categories' | 'products'): string {
    const lookup = new Map(this.store.routing()[source].map((item) => [item.id, item.name]));
    return ids.map((id) => lookup.get(id) ?? id).join(', ');
  }

  printerNames(ids: readonly string[]): string {
    const lookup = new Map(this.store.printers().map((item) => [item.id, item.name]));
    return ids.map((id) => lookup.get(id) ?? id).join(', ');
  }

  searchJobs(page = 1): void {
    const value = this.filterForm.getRawValue();
    const query: PrintJobQuery = {
      ...DEFAULT_PRINT_JOB_QUERY,
      page,
      search: value.search.trim() || null,
      status: value.status || null,
      zoneId: value.zoneId || null,
      agentId: value.agentId || null,
      printerId: value.printerId || null,
      fromDate: value.fromDate || null,
      toDate: value.toDate || null,
    };
    this.store.loadJobs(query).subscribe();
  }

  clearJobFilters(): void {
    this.filterForm.reset();
    this.searchJobs();
  }

  cancel(job: PrintJob): void {
    this.store.cancelJob(job.id).subscribe();
  }

  retry(job: PrintJob): void {
    this.store.retryJob(job.id).subscribe();
  }

  reprint(job: PrintJob): void {
    this.store.reprintJob(job.id).subscribe();
  }

  canCancel(job: PrintJob): boolean {
    return job.status !== 'PRINTED' && job.status !== 'CANCELLED';
  }

  ticket(job: PrintJob): PrintTicketPreview {
    try {
      const payload = JSON.parse(job.payloadJson) as Partial<PrintTicketPreview>;
      return {
        documentType: payload.documentType ?? job.documentType,
        orderNumber: payload.orderNumber ?? job.sourceId,
        table: payload.table ?? null,
        waiter: payload.waiter ?? '',
        createdAt: payload.createdAt ?? job.createdAt,
        items: Array.isArray(payload.items) ? payload.items : [],
        notes: payload.notes ?? null,
        isReprint: payload.isReprint ?? job.isReprint,
        printerName: payload.printerName ?? null,
        organizationName: payload.organizationName ?? null,
        footerMessage: payload.footerMessage ?? null,
      };
    } catch {
      return {
        documentType: job.documentType,
        orderNumber: job.sourceId,
        table: null,
        waiter: '',
        createdAt: job.createdAt,
        items: [],
        notes: null,
        isReprint: job.isReprint,
        printerName: null,
        organizationName: null,
        footerMessage: null,
      };
    }
  }

  orderNumber(job: PrintJob): string {
    return this.ticket(job).orderNumber;
  }

  tableName(job: PrintJob): string | null {
    return this.ticket(job).table;
  }
}
