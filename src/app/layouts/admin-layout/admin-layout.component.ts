import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FooterComponent } from '@app/shared/components/footer/footer.component';
import { NavbarComponent } from '@app/shared/components/navbar/navbar.component';
import { SidebarComponent } from '@app/shared/components/sidebar/sidebar.component';
import { DatePicker } from 'primeng/datepicker';
import { ProgressSpinner } from 'primeng/progressspinner';

@Component({
  selector: 'app-admin-layout',
  imports: [NavbarComponent, SidebarComponent, FormsModule, FooterComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent {
  title: string = 'Le titre de la page';
  subtitle: string = 'Le sous titre';
}
