import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DatePicker } from 'primeng/datepicker';
import { FormsModule } from '@angular/forms';
import { PrimeNG } from 'primeng/config';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FormsModule],
  providers: [MessageService],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'code-base-angular';
  date: Date | undefined;

  constructor(private primengConfig: PrimeNG) {}

  ngOnInit() {
    this.primengConfig.setTranslation({
      accept: 'Valider',
      reject: 'Annuler',
      choose: 'Choisir',
      upload: 'Téléverser',
      cancel: 'Annuler',
      dayNames: [
        'Dimanche',
        'Lundi',
        'Mardi',
        'Mercredi',
        'Jeudi',
        'Vendredi',
        'Samedi',
      ],
      dayNamesShort: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
      dayNamesMin: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
      monthNames: [
        'Janvier',
        'Février',
        'Mars',
        'Avril',
        'Mai',
        'Juin',
        'Juillet',
        'Août',
        'Septembre',
        'Octobre',
        'Novembre',
        'Décembre',
      ],
      monthNamesShort: [
        'Jan',
        'Fév',
        'Mar',
        'Avr',
        'Mai',
        'Juin',
        'Juil',
        'Août',
        'Sep',
        'Oct',
        'Nov',
        'Déc',
      ],
      today: "Aujourd'hui",
      clear: 'Effacer',
      startsWith: 'Commence par',
      contains: 'Contient',
      notContains: 'Ne contient pas',
      endsWith: 'Finit par',
      equals: 'Égal à',
      notEquals: 'Différent de',
      noFilter: 'Aucun filtre',
      lt: 'Inférieur à',
      lte: 'Inférieur ou égal à',
      gt: 'Supérieur à',
      gte: 'Supérieur ou égal à',
      dateIs: 'Date est',
      dateIsNot: "Date n'est pas",
      dateBefore: 'Date avant',
      dateAfter: 'Date après',
      apply: 'Appliquer',
      matchAll: 'Tous les critères',
      matchAny: 'Au moins un critère',
      addRule: 'Ajouter une règle',
      removeRule: 'Supprimer la règle',
      // Paginator
      // Empty message
      emptyMessage: 'Aucun résultat trouvé',
      emptyFilterMessage: 'Aucun résultat trouvé avec ce filtre',
    });
  }
}
