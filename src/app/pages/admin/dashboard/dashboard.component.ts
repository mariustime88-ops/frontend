import { Component, OnInit, OnDestroy, Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CrudImports } from '@app/cores/utils/crud.imports';
import { AdvancedResourceService } from '@app/cores/services/advanced-resource.service';
import { MessageService } from 'primeng/api';
import { getDefaultUser } from '@app/cores/utils/get-user';
import { User } from '@app/cores/types/user';
import { ApiRoutes } from '@app/api.routes';



@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CrudImports],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  providers: [MessageService],
})
export class DashboardComponent implements OnInit {
  loading = true;
  currentUser: User | null = null;

  constructor(
    private advancedService: AdvancedResourceService,
    private messageService: MessageService,
    private router: Router,
    private injector: Injector,
  ) {
  }

  ngOnInit() {
    this.currentUser = getDefaultUser(this.injector);
    this.loadDashboard();
  }

 
  loadDashboard() {
    this.loading = true;
    this.advancedService
      .chainLoad([ApiRoutes.DASHBOARD])
      .subscribe({
        next: (response) => {
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de charger le tableau de bord',
          });
        },
      });
  }

  

  formatDate(dateString: string | null): string {
    if (!dateString) return 'Non définie';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  navigateTo(path: string, queryParams?: any) {
    this.router.navigate([path], queryParams ? { queryParams } : {});
  }
}
