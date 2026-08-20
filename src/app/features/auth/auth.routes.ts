import { Routes } from '@angular/router';
import { guestGuard } from '../../core/guards/guest.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    canActivateChild: [guestGuard],
    loadComponent: () =>
      import('../../layouts/auth-layout/auth-layout.component').then(
        (component) => component.AuthLayoutComponent,
      ),
    children: [
      {
        path: 'login',
        title: 'Iniciar sesión · Savia Up',
        loadComponent: () =>
          import('./login/login.component').then((component) => component.LoginComponent),
      },
      {
        path: 'register',
        title: 'Crear cuenta · Savia Up',
        loadComponent: () =>
          import('./register/register.component').then((component) => component.RegisterComponent),
      },
      {
        path: 'forgot-password',
        title: 'Recuperar contraseña · Savia Up',
        loadComponent: () =>
          import('./forgot-password/forgot-password.component').then(
            (component) => component.ForgotPasswordComponent,
          ),
      },
    ],
  },
];
