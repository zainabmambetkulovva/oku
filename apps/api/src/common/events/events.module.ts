import { Global, Module } from '@nestjs/common';
import { DomainEventPublisher } from './domain-event-outbox';

@Global()
@Module({
  providers: [DomainEventPublisher],
  exports: [DomainEventPublisher],
})
export class DomainEventsModule {}
