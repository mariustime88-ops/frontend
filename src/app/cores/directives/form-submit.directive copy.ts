import { Directive, HostListener, Input } from '@angular/core';
import { NgForm } from '@angular/forms';

@Directive({
  selector: 'form[validateForm]'
})
export class FormSubmitDirective {
  constructor(private ngForm: NgForm) {}
  @Input() onValidSubmit: (form: NgForm) => void = () => {};

  @HostListener('submit', ['$event'])
  onSubmit(event: Event) {
    event.preventDefault();

    if (!this.ngForm) {
      // console.error('NgForm non trouvé dans la directive FormSubmitDirective.');
      return;
    }

    console.log('Soumission du formulaire. État:', {
      valid: this.ngForm.valid,
      invalid: this.ngForm.invalid,
      touched: this.ngForm.touched,
      dirty: this.ngForm.dirty,
      controls: Object.keys(this.ngForm.controls)
    });

    // Marquer tous les contrôles comme touchés pour déclencher la validation
    Object.keys(this.ngForm.controls).forEach(key => {
      const control = this.ngForm.controls[key];
      control.markAsTouched();
      control.markAsDirty();
      control.updateValueAndValidity();

      // console.log(`État du contrôle ${key}:`, {
      //   valid: control.valid,
      //   invalid: control.invalid,
      //   errors: control.errors
      // });

      // Déclencher les événements sur les éléments DOM
      const formElement = event.target as HTMLFormElement;
      const inputElement = formElement.querySelector(`[name="${key}"]`);
      if (inputElement) {
        inputElement.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    });

    // Vérifier si le formulaire est valide
    if (this.ngForm.valid) {
      // console.log('Formulaire valide, soumission autorisée');
      this.onValidSubmit(this.ngForm);

      // Laisser le formulaire être soumis, ne pas appeler event.preventDefault()
      // pour permettre aux gestionnaires (ngSubmit) de s'exécuter
    } else {
      // console.log('Formulaire invalide, soumission bloquée');

      // Faire défiler jusqu'à la première erreur
      const formElement = event.target as HTMLFormElement;
      const firstError = formElement.querySelector('.validation-error');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        const firstInvalidInput = formElement.querySelector('.ng-invalid');
        if (firstInvalidInput) {
          firstInvalidInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }
}
