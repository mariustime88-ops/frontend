import { NgIf, NgClass } from "@angular/common";
import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink, RouterModule } from "@angular/router";
import { ApiRoutes } from "@app/api.routes";
import { GlobalConfig } from "@app/app.config";
import { FormSubmitDirective } from "@app/cores/directives/form-submit.directive";
import { ValidateDirective } from "@app/cores/directives/validate.directive";
import { AdvancedResourceService } from "@app/cores/services/advanced-resource.service";
import { encrypt } from "@app/cores/utils/cryptage";
import { Paths } from "@app/paths";
import { CookieService } from "ngx-cookie-service";
import { MessageService } from "primeng/api";
import { Toast } from "primeng/toast";

@Component({
  selector: "app-login",
  imports: [
    FormsModule,
    ValidateDirective,
    FormSubmitDirective,
    NgIf,
    NgClass,
    Toast,
    RouterModule,
  ],
  templateUrl: "./login.component.html",
  styleUrl: "./login.component.scss",
  providers: [MessageService],
})
export class LoginComponent {
  loginData: { email: string; password: string; rememberMe: boolean } = {
    email: "",
    password: "",
    rememberMe: false,
  };
  isLoading: boolean = false;
  hidePassword: boolean = true;
  paths = Paths;

  constructor(
    private router: Router,
    private cookieService: CookieService,
    private advancedService: AdvancedResourceService,
    private messageService: MessageService,
  ) {}

  onSubmit() {
    this.isLoading = true;

    this.advancedService
      .updateCustom(ApiRoutes.LOGIN, this.loginData)
      .subscribe({
        next: (response: any) => {
          this.isLoading = false;

          // Vérification de la structure de réponse API V2
          if (response.success) {
            // Stockage du token et des informations utilisateur
            sessionStorage.removeItem('level_chosen');
            this.cookieService.set(GlobalConfig.token, response.response.token);
            this.cookieService.set(
              GlobalConfig.user,
              encrypt(response.response.user),
            );

            const user = response.response.user;

            this.messageService.add({
              severity: "success",
              summary: "Connexion réussie",
              detail: response.message || "Vous êtes connecté avec succès !",
            });

            this.router.navigate([this.paths.DASHBOARD]);
          } else {
            this.messageService.add({
              severity: "error",
              summary: "Erreur de connexion",
              detail: response.message || "Erreur de connexion",
            });
          }
        },
        error: (err) => {
          this.isLoading = false;
          this.handleApiError(err);
        },
      });
  }

  private handleApiError(err: any): void {
    let errorMessage = "Une erreur est survenue !";

    if (err.status === 401) {
      errorMessage = "Identifiant ou mot de passe incorrect !";
    } else if (err.error?.message) {
      errorMessage = err.error.message;
    } else if (err.error?.errors) {
      // Gestion des erreurs de validation API V2
      const firstError = Object.values(err.error.errors)[0];
      errorMessage = Array.isArray(firstError)
        ? firstError[0]
        : String(firstError);
    }

    this.messageService.add({
      severity: "error",
      summary: "Erreur de connexion",
      detail: errorMessage,
    });
  }
}