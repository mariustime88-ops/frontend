import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AdminLayoutComponent } from '@app/layouts/admin-layout/admin-layout.component';
import { TabsModule } from 'primeng/tabs';
import { Router, ActivatedRoute } from '@angular/router';

export interface TabOption {
  label: string;
  value: string;
  content?: any;
  count?: number;
}
@Component({
  selector: 'app-tabs',
  imports: [CommonModule, TabsModule],
  templateUrl: './tabs.component.html',
  styleUrl: './tabs.component.scss',
})
export class TabsComponent implements OnInit {
  @Input() options: TabOption[] = [];
  @Input() defaultTab: string = '';
  @Input() urlParamName: string = 'tab';
  @Input() contentTemplates: { [key: string]: any } | null = null;

  @Output() tabChange = new EventEmitter<string>();

  activeTab: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    if (!this.options || this.options.length === 0) {
      return;
    }

    const defaultTabValue = this.defaultTab || this.options[0].value;

    this.route.queryParams.subscribe(params => {
      const tabParam = params[this.urlParamName];

      if (tabParam && this.options.some(opt => opt.value === tabParam)) {
        this.activeTab = tabParam;
      } else {
        this.activeTab = defaultTabValue;

        this.updateUrlParam(this.activeTab);
      }

      this.tabChange.emit(this.activeTab);
    });
  }

  onTabChange(event: any) {
    const selectedTab = event.index !== undefined ?
      this.options[event.index].value : event;

    this.activeTab = selectedTab;

    // Mettre à jour l'URL
    this.updateUrlParam(selectedTab);

    this.tabChange.emit(selectedTab);
  }

  private updateUrlParam(tabValue: string) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [this.urlParamName]: tabValue },
      queryParamsHandling: 'merge'
    });
  }
}
