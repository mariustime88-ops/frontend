// validate.directive.ts
import {
  Directive,
  ElementRef,
  OnInit,
  Input,
  HostListener,
  AfterViewInit,
} from '@angular/core';
import { NgModel } from '@angular/forms';

@Directive({
  selector: '[validate]',
})
export class ValidateDirective implements OnInit, AfterViewInit {
  @Input() fieldName: string = 'Ce champ';

  constructor(private el: ElementRef<HTMLElement>, private ngModel: NgModel) {}

  ngOnInit() {
    // Écouter les changements de statut du contrôle
    this.ngModel.statusChanges?.subscribe(() => {
      // console.log(`Statut changé pour ${this.fieldName}:`, this.ngModel.status);
      this.checkValidation();
    });

    // Écouter les changements de valeur
    this.ngModel.valueChanges?.subscribe((value) => {
      // console.log(`Valeur changée pour ${this.fieldName}:`, value);
      this.checkValidation();
    });
  }

  ngAfterViewInit() {
    // Assurer que le checkValidation est appelé après l'initialisation de la vue
    setTimeout(() => {
      this.checkValidation();
    }, 0);
  }

  @HostListener('blur')
  onBlur() {
    // console.log(`Blur sur ${this.fieldName}`);
    this.ngModel.control.markAsTouched();
    this.checkValidation();
  }

  @HostListener('input')
  onInput() {
    // console.log(`Input sur ${this.fieldName}`);
    this.ngModel.control.markAsDirty();
    this.checkValidation();
  }

  private checkValidation() {
    // console.log(`Vérification validation pour ${this.fieldName}:`, {
    //   invalid: this.ngModel.invalid,
    //   valid: this.ngModel.valid,
    //   dirty: this.ngModel.dirty,
    //   touched: this.ngModel.touched,
    //   status: this.ngModel.status,
    //   errors: this.ngModel.errors
    // });

    if (!this.ngModel.touched && !this.ngModel.dirty && this.ngModel.pristine) {
      // Ne pas valider si le contrôle n'a pas été touché ou modifié
      return;
    }

    if (!this.ngModel.invalid) {
      this.removeErrorStyles();
      this.removeErrorMessage();
      return;
    }

    this.addErrorStyles();
    this.showErrorMessage();
  }

  private addErrorStyles() {
    // Ajouter classes d'erreur
    this.el.nativeElement.classList.add('ng-invalid');
    this.el.nativeElement.classList.add('border-red-500');

    // Pour PrimeNG, trouver le parent et ajouter les styles si nécessaire
    const parent = this.findParentWithClass(
      this.el.nativeElement,
      'p-inputgroup'
    );
    if (parent) {
      parent.classList.add('border-red-500');
    }
  }

  private removeErrorStyles() {
    // Supprimer classes d'erreur
    this.el.nativeElement.classList.remove('ng-invalid');
    this.el.nativeElement.classList.remove('border-red-500');

    // Pour PrimeNG, trouver le parent et supprimer les styles si nécessaire
    const parent = this.findParentWithClass(
      this.el.nativeElement,
      'p-inputgroup'
    );
    if (parent) {
      parent.classList.remove('border-red-500');
    }
  }

  private showErrorMessage() {
    this.removeErrorMessage();

    const errorText = document.createElement('p');
    errorText.innerText = this.getErrorMessage();
    errorText.className = 'text-red-500 text-sm mt-1 validation-error';

    // Trouver où insérer le message d'erreur
    let targetElement = this.el.nativeElement;
    const parent = this.findParentWithClass(targetElement, 'p-inputgroup');
    if (parent) {
      targetElement = parent;
    }

    targetElement.insertAdjacentElement('afterend', errorText);
  }

  private removeErrorMessage() {
    // Trouver où chercher le message d'erreur
    let targetElement = this.el.nativeElement;
    const parent = this.findParentWithClass(targetElement, 'p-inputgroup');
    if (parent) {
      targetElement = parent;
    }

    // Chercher le message d'erreur suivant et le supprimer s'il existe
    const nextSibling = targetElement.nextElementSibling;
    if (nextSibling && nextSibling.classList.contains('validation-error')) {
      nextSibling.remove();
    }
  }

  private findParentWithClass(
    element: HTMLElement,
    className: string
  ): HTMLElement | null {
    let current = element.parentElement;
    while (current) {
      if (current.classList.contains(className)) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  private getErrorMessage(): string {
    const errors = this.ngModel.errors;
    if (!errors) return '';

    if (errors['required']) return `${this.fieldName} est obligatoire.`;
    if (errors['email']) return `Veuillez entrer une adresse email valide.`;
    if (errors['minlength'])
      return `${this.fieldName} doit contenir au moins ${errors['minlength'].requiredLength} caractères.`;
    if (errors['maxlength'])
      return `${this.fieldName} ne doit pas dépasser ${errors['maxlength'].requiredLength} caractères.`;
    if (errors['pattern']) return `Format invalide pour ${this.fieldName}.`;
    if (errors['min'])
      return `${this.fieldName} doit être supérieur ou égal à ${errors['min'].min}.`;
    if (errors['max'])
      return `${this.fieldName} doit être inférieur ou égal à ${errors['max'].max}.`;
    if (errors['match']) return `Les champs ne correspondent pas.`;
    if (errors['number'])
      return `${this.fieldName} doit être un nombre valide.`;
    if (errors['url']) return `Veuillez entrer une URL valide.`;
    if (errors['phone'])
      return `Veuillez entrer un numéro de téléphone valide.`;
    if (errors['creditcard']) return `Numéro de carte de crédit invalide.`;
    if (errors['iban']) return `Numéro IBAN invalide.`;
    if (errors['passwordStrength'])
      return `Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial.`;

    return `Valeur invalide pour ${this.fieldName}.`;
  }
}
