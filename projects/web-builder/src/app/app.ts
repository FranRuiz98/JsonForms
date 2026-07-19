import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { BuilderStore } from './builder/builder-store';
import { importJson, toDocument } from './builder/builder-model';
import { TEMPLATES, Template } from './builder/templates';
import { PaletteComponent } from './components/palette.component';
import { CanvasComponent } from './components/canvas.component';
import { PreviewComponent } from './components/preview.component';
import { InspectorComponent } from './components/inspector.component';
import { IconComponent } from './components/icon.component';
import { CdkDropListGroup } from '@angular/cdk/drag-drop';

@Component({
  selector: 'wb-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PaletteComponent, CanvasComponent, PreviewComponent, InspectorComponent, IconComponent, CdkDropListGroup],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly store = inject(BuilderStore);
  readonly templates = TEMPLATES;

  /** Center pane: 'design' (editable canvas) or 'preview' (real form). */
  readonly centerTab = signal<'design' | 'preview'>('design');

  readonly importOpen = signal(false);
  readonly importText = signal('');
  readonly importError = signal<string | null>(null);
  readonly templatesOpen = signal(false);

  readonly validation = computed(() => this.store.validation());

  setTab(tab: 'design' | 'preview'): void {
    this.centerTab.set(tab);
  }

  // --- export ---------------------------------------------------------------

  copyJson(): void {
    void navigator.clipboard?.writeText(this.store.toJson());
  }

  downloadJson(): void {
    const blob = new Blob([this.store.toJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'form.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- templates ------------------------------------------------------------

  openTemplates(): void {
    this.templatesOpen.set(true);
  }
  closeTemplates(): void {
    this.templatesOpen.set(false);
  }
  loadTemplate(t: Template): void {
    this.store.setDocument(toDocument(t.config));
    this.templatesOpen.set(false);
  }

  // --- import ---------------------------------------------------------------

  openImport(): void {
    this.importText.set(this.store.toJson());
    this.importError.set(null);
    this.importOpen.set(true);
  }

  applyImport(): void {
    try {
      this.store.setDocument(importJson(this.importText()));
      this.importOpen.set(false);
    } catch (e) {
      this.importError.set((e as Error).message);
    }
  }

  cancelImport(): void {
    this.importOpen.set(false);
  }
}
