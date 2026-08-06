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
  standalone: true,
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
  loginData = { email: "", password: "", rememberMe: false };
  isLoading = false;
  hidePassword = true;
  paths = Paths;

  constructor(
    private router: Router,
    private cookieService: CookieService,
    private advancedService: AdvancedResourceService,
    private messageService: MessageService
  ) {}

  onSubmit() {
    this.isLoading = true;
    this.advancedService.updateCustom(ApiRoutes.LOGIN, this.loginData).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.success) {
          // ✅ Correction ici : le token est à la racine
          this.cookieService.set(GlobalConfig.token, response.token);
          this.cookieService.set(GlobalConfig.user, encrypt(response.response));
          this.messageService.add({
            severity: "success",
            summary: "Connexion réussie",
            detail: response.message || "Vous êtes connecté avec succès !",
          });
          // Redirection vers le tableau de bord
          this.router.navigate([this.paths.DASHBOARD]);
        } else {
          this.messageService.add({
            severity: "error",
            summary: "Erreur de connexion",
            detail: response.message || "Identifiants incorrects.",
          });
        }
      },
      error: (err) => {
        this.isLoading = false;
        let msg = "Une erreur est survenue !";
        if (err.status === 401) {
          msg = "Identifiant ou mot de passe incorrect !";
        } else if (err.error?.message) {
          msg = err.error.message;
        } else if (err.error?.errors) {
          const first = Object.values(err.error.errors)[0];
          msg = Array.isArray(first) ? first[0] : String(first);
        }
        this.messageService.add({
          severity: "error",
          summary: "Erreur de connexion",
          detail: msg,
        });
      },
    });
  }
}