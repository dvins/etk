import { Module } from '@nestjs/common';
import { RavenModule } from 'nest-raven';
import { SentryService } from './sentry.service';
import { SentryApolloPlugin } from './sentry.apollo.plugin';
import { SentryModule } from '@sentry/nestjs/setup';

@Module({
  imports: [
    SentryModule.forRoot(),
    RavenModule,
  ],
  exports: [
    SentryModule.forRoot(),
    SentryService,
  ],
  providers: [
    SentryService,
    SentryApolloPlugin,
  ],
})
export class NestjsSentryModule { }
