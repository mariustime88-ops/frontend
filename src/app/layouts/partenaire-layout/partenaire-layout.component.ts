import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FooterComponent } from '@app/shared/components/footer/footer.component';
import { PartenaireNavbarComponent } from '@app/shared/components/partenaire/navbar/partenaire-navbar.component';
import { PartenaireSidebarComponent } from '@app/shared/components/partenaire/sidebar/partenaire-sidebar.component';
import { DatePicker } from 'primeng/datepicker';
import { ProgressSpinner } from 'primeng/progressspinner';

@Component({
  selector: 'app-partenaire-layout',
  imports: [PartenaireNavbarComponent, PartenaireSidebarComponent, FormsModule, FooterComponent],
  templateUrl: './partenaire-layout.component.html',
  styleUrl: './partenaire-layout.component.scss',
})
export class PartenaireLayoutComponent {
  title: string = 'Le titre de la page';
  subtitle: string = 'Le sous titre';
}
