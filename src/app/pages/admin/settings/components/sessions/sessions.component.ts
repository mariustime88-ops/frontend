import { Component, OnInit, inject } from '@angular/core';
import { AbstractCrudComponent } from '@app/cores/abstracts/abstract-crud-component';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { Column } from '@app/shared/components/forms/data-table/data-table.component';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '@app/environments/environment';

export interface Session {
  id: number;
  libelle: string;
  start_date: string;
  end_date: string;
  is_actif: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [CrudImports],
  templateUrl: './sessions.component.html',
  styleUrl: './sessions.component.scss',
})
export class SessionsComponent extends AbstractCrudComponent<Session> implements OnInit {
  override resourceName: string = 'diss_sessions';
  override modalId: string = 'sessionModal';
  override deleteId: string = 'delete_session';

  toggleId: string = 'toggle_session';

  protected apiHttp = inject(HttpClient);
  toggling: boolean = false;
  toggleTarget: Session | null = null;

  // Champs séparés date / heure utilisés uniquement par le formulaire.
  // On les recombine en un seul champ juste avant l'envoi (voir onSubmit).
  startDatePart: string = '';
  startTimePart: string = '';
  endDatePart: string = '';
  endTimePart: string = '';

  searchFilters = {
    search: '',
    is_actif: ''
  };

  columns: Column[] = [
    { field: 'libelle', header: 'Nom de la session', filterType: 'text' },
    {
      field: 'start_date',
      header: 'Date de début',
      filterType: 'text',
      formatter: (row: any) => row.start_date ? this.formatDate(row.start_date) : '-'
    },
    {
      field: 'end_date',
      header: 'Date de fin',
      filterType: 'text',
      formatter: (row: any) => row.end_date ? this.formatDate(row.end_date) : '-'
    },
    {
      field: 'is_actif',
      header: 'Statut',
      filterType: 'text',
      htmlFormatted: true,
      formatter: (row: any) =>
        row.is_actif
          ? '<span class="badge-pill badge-pill-green">En Cours</span>'
          : '<span class="badge-pill badge-pill-gray">Non en cours</span>',
    },
  ];

  globalFilterFields = ['libelle'];

  override ngOnInit(): void {
    this.filter['trashed'] = 'with';
    super.ngOnInit();
  }

  /**
   * Formate une date pour l'affichage dans le tableau
   */
  private formatDate(date: string): string {
    if (!date) return '-';
    try {
      const parts = date.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
      if (parts) {
        return `${parts[3]}/${parts[2]}/${parts[1]} ${parts[4]}:${parts[5]}`;
      }
      const parts2 = date.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
      if (parts2) {
        return `${parts2[3]}/${parts2[2]}/${parts2[1]} ${parts2[4]}:${parts2[5]}`;
      }
      const parts3 = date.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
      if (parts3) {
        return `${parts3[3]}/${parts3[2]}/${parts3[1]} ${parts3[4]}:${parts3[5]}`;
      }
      return date;
    } catch (e) {
      return date;
    }
  }

  protected override afterDataLoaded(items: Session[]): void {
    items.sort((a, b) => {
      if (!a.start_date) return 1;
      if (!b.start_date) return -1;
      return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
    });
  }

  applyFilters() {
    this.filter['search'] = this.searchFilters.search;
    if (this.searchFilters.is_actif !== '') {
      this.filter['is_actif'] = this.searchFilters.is_actif;
    } else {
      this.filter['is_actif'] = '';
    }
    this.filter['trashed'] = 'with';
    this.data = [];
    this.loadData();
  }

  resetFilters() {
    this.searchFilters = { search: '', is_actif: '' };
    this.filter['search'] = '';
    this.filter['is_actif'] = '';
    this.filter['trashed'] = 'with';
    this.data = [];
    this.loadData();
  }

  /**
   * Date et heure LOCALES actuelles (pas UTC), au format attendu par
   * les inputs <input type="date"> et <input type="time">.
   */
  private nowLocalParts(): { date: string; time: string } {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    return { date, time };
  }

  /**
   * Sépare une date venant du backend ("YYYY-MM-DD HH:mm:ss" ou ISO)
   * en { date, time } pour remplir les 2 inputs séparés du formulaire.
   */
  private toLocalParts(value: string | null | undefined): { date: string; time: string } {
    if (!value) return { date: '', time: '' };
    let clean = value.replace('Z', '').replace(' ', 'T');
    if (clean.length > 16) clean = clean.slice(0, 16);
    const [date, time] = clean.split('T');
    return { date: date || '', time: time || '00:00' };
  }

  override showAddForm(): void {
    super.showAddForm();
    const { date, time } = this.nowLocalParts();

    this.startDatePart = date;
    this.startTimePart = time;
    this.endDatePart = date;
    this.endTimePart = time;

    this.currentItem = {
      id: 0,
      libelle: '',
      start_date: `${date}T${time}`,
      end_date: `${date}T${time}`,
      is_actif: false
    };
  }

  override editItem(item: Session): void {
    super.editItem(item);

    const s = this.toLocalParts(item.start_date);
    const e = this.toLocalParts(item.end_date);

    this.startDatePart = s.date;
    this.startTimePart = s.time;
    this.endDatePart = e.date;
    this.endTimePart = e.time;
  }

  /**
   * Recombine les 2 champs séparés (date + heure) en un seul champ
   * "YYYY-MM-DDTHH:mm" juste avant l'envoi au backend.
   *
   * IMPORTANT : on n'appelle volontairement PAS super.onSubmit() ici.
   * Sa logique interne reformate automatiquement tout champ qui
   * ressemble à une date en "YYYY-MM-DD" (sans l'heure), ce qui
   * écrasait systématiquement l'heure choisie par l'utilisateur.
   * On appelle donc directement createItem()/updateItem(), qui eux
   * n'ont pas ce comportement.
   */
  override onSubmit(event?: any): void {
    if (this.startDatePart) {
      this.currentItem.start_date = `${this.startDatePart}T${this.startTimePart || '00:00'}`;
    }
    if (this.endDatePart) {
      this.currentItem.end_date = `${this.endDatePart}T${this.endTimePart || '00:00'}`;
    }

    const itemToSubmit = this.currentItem;
    if (this.editMode && itemToSubmit?.id) {
      this.updateItem(itemToSubmit);
    } else {
      this.createItem(itemToSubmit);
    }
  }

  /**
   * Récupère le token depuis les cookies
   */
  private getAuthToken(): string | null {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'indicateurs_token') {
        return decodeURIComponent(value);
      }
    }
    return null;
  }

  prepareToggle(item: Session): void {
    this.toggleTarget = item;
  }

  closeToggleModal(): void {
    const closeBtn = document.querySelector(`#${this.toggleId} [data-modal-dismiss]`);
    if (closeBtn) {
      (closeBtn as HTMLElement).click();
    }
    this.toggleTarget = null;
  }

  executeToggle(): void {
    if (!this.toggleTarget || this.toggling) {
      return;
    }

    const item = this.toggleTarget;
    this.toggling = true;

    const token = this.getAuthToken();
    if (!token) {
      this.toggling = false;
      this.messageService.add({
        severity: 'error',
        summary: "Erreur d'authentification",
        detail: 'Vous devez être connecté pour effectuer cette action.',
        life: 5000
      });
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });

    const baseUrl = environment.URL_API.replace(/\/$/, '');
    const url = `${baseUrl}/diss_sessions/${item.id}/toggle-status`;

    this.apiHttp.patch<any>(url, {}, { headers }).subscribe({
      next: (response: any) => {
        this.toggling = false;

        const updatedSession = response.response;

        this.data = this.data.map((s) => {
          if (s.id === item.id) {
            return { ...s, is_actif: updatedSession.is_actif };
          }
          if (updatedSession.is_actif && s.is_actif) {
            return { ...s, is_actif: false };
          }
          return s;
        });

        this.messageService.add({
          severity: 'success',
          summary: 'Statut modifié',
          detail: response.message || `La session "${item.libelle}" a été ${item.is_actif ? 'désactivée' : 'activée'}.`,
          life: 3000
        });

        this.closeToggleModal();

        setTimeout(() => {
          this.loadData();
        }, 500);
      },
      error: (error: any) => {
        this.toggling = false;
        console.error('❌ Erreur toggle:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: error.error?.message || "Impossible de modifier le statut.",
          life: 5000
        });
      },
    });
  }

  override loadData(): void {
    if (!this.filter['trashed']) {
      this.filter['trashed'] = 'with';
    }
    super.loadData();
  }
}