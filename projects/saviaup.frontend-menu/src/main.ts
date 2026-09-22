import { bootstrapApplication } from '@angular/platform-browser';
import { menuAppConfig } from './app/app.config';
import { MenuApp } from './app/app';

bootstrapApplication(MenuApp, menuAppConfig).catch((error: unknown) => console.error(error));
