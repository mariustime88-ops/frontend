import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { AdminLayoutComponent } from '@app/layouts/admin-layout/admin-layout.component';
import { GlobalConfig } from '@app/app.config';
import { decrypt, encrypt } from '@app/cores/utils/cryptage';
import { AdvancedResourceService } from '@app/cores/services/advanced-resource.service';
import { Paths } from '@app/paths';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ToastModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    AdminLayoutComponent,
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  providers: [MessageService],
})
export class ProfileComponent implements OnInit {
  profileForm!: FormGroup;
  isLoading = false;
  user: any = null;
  isError = false;
  errorMessage = '';

  private fb = inject(FormBuilder);
  private cookieService = inject(CookieService);
  private messageService = inject(MessageService);
  private router = inject(Router);
  private advancedService = inject(AdvancedResourceService);

  ngOnInit(): void {
    this.loadUserFromCookie();
    this.initForm();
  }

  private loadUserFromCookie(): void {
    const encrypted = this.cookieService.get(GlobalConfig.user);
    if (encrypted) {
      try {
        this.user = decrypt(encrypted);
        this.isError = false;
      } catch (e) {
        this.isError = true;
        this.errorMessage = 'Erreur lors du décryptage des données. Veuillez vous reconnecter.';
        console.error('❌ Erreur de décryptage', e);
      }
    } else {
      this.isError = true;
      this.errorMessage = 'Session introuvable. Veuillez vous reconnecter.';
    }
  }

  private initForm(): void {
    this.profileForm = this.fb.group({
      name: [this.user?.name || '', [Validators.required, Validators.minLength(2)]],
      email: [{ value: this.user?.email || '', disabled: true }],
      password: ['', [Validators.minLength(8)]],
      password_confirmation: ['', []],
    });

    this.profileForm.get('password')?.valueChanges.subscribe((value) => {
      const confirmControl = this.profileForm.get('password_confirmation');
      if (value) {
        confirmControl?.setValidators([Validators.required, Validators.minLength(8)]);
      } else {
        confirmControl?.clearValidators();
        confirmControl?.setValue('');
      }
      confirmControl?.updateValueAndValidity();
    });
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulaire invalide',
        detail: 'Veuillez corriger les erreurs.',
      });
      return;
    }

    const password = this.profileForm.get('password')?.value;
    const passwordConfirmation = this.profileForm.get('password_confirmation')?.value;
    if (password && password !== passwordConfirmation) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Les mots de passe ne correspondent pas.',
      });
      return;
    }

    this.isLoading = true;
    const payload: any = {
      name: this.profileForm.get('name')?.value,
    };
    if (password) {
      payload.password = password;
      payload.password_confirmation = passwordConfirmation;
    }

    const userId = this.user.id;

    this.advancedService.updateResourceItem('users', { id: userId, ...payload }).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        // Mise à jour du cookie
        if (response?.response) {
          this.cookieService.set(GlobalConfig.user, encrypt(response.response));
          this.user = response.response;
        }
        // Message de succès
        this.messageService.add({
          severity: 'success',
          summary: 'Profil mis à jour',
          detail: 'Vos informations ont été modifiées avec succès.',
        });
        // Redirection vers le tableau de bord après un court délai
        setTimeout(() => {
          this.router.navigate([Paths.DASHBOARD]);
        }, 1500);
      },
      error: (err: any) => {
        this.isLoading = false;
        console.error('❌ Erreur mise à jour', err);
        const msg = err?.error?.message || 'Erreur lors de la mise à jour du profil.';
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: msg,
        });
      },
    });
  }

  /**
   * Annuler et revenir au tableau de bord
   */
  cancel(): void {
    this.router.navigate([Paths.DASHBOARD]);
  }
}