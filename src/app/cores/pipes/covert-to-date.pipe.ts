import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'convertToDate',
  standalone: true
})
export class ConvertToDatePipe implements PipeTransform {
  transform(serviceStartDate: string, retirementDate?: string): string {
    let start = this.parseDate(serviceStartDate);
    let end = retirementDate ? this.parseDate(retirementDate) : new Date();

    // Si la date de retraite est dans le futur, on prend la date d'aujourd'hui
    const today = new Date();
    if (end > today) {
      end = today;
    }

    // Assurer que start est avant end
    if (start > end) {
      [start, end] = [end, start]; // Échange propre des dates
    }

    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();

    // Ajustement des jours
    if (days < 0) {
      months--;
      const prevMonth = end.getMonth() === 0 ? 11 : end.getMonth() - 1;
      const prevYear = end.getMonth() === 0 ? end.getFullYear() - 1 : end.getFullYear();
      days += this.daysInMonth(prevMonth, prevYear);
    }

    // Ajustement des mois
    if (months < 0) {
      years--;
      months += 12;
    }

    return `${years} an(s) ${months} mois ${days} jour(s)`;
  }

  // Nombre de jours dans un mois donné (avec gestion des années bissextiles)
  private daysInMonth(month: number, year: number): number {
    return new Date(year, month + 1, 0).getDate();
  }

  // Convertir une date string en objet Date
  private parseDate(dateString: string): Date {
    const parts = dateString.split('-').map(Number);
    if (parts.length !== 3) {
      throw new Error('Format de date invalide');
    }
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
}
