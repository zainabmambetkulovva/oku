import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvent } from './domain-events';

/**
 * События, накопленные внутри транзакции. После commit их публикует
 * DomainEventPublisher; при откате транзакции они просто не публикуются.
 */
export class DomainEventOutbox {
  private readonly events: DomainEvent[] = [];

  add(event: DomainEvent): void {
    this.events.push(event);
  }

  drain(): DomainEvent[] {
    return this.events.splice(0, this.events.length);
  }
}

@Injectable()
export class DomainEventPublisher {
  constructor(private readonly emitter: EventEmitter2) {}

  /** Публикует события по порядку. Ошибки обработчиков не влияют на вызывающий код. */
  async publish(outbox: DomainEventOutbox | DomainEvent[]): Promise<void> {
    const events = Array.isArray(outbox) ? outbox : outbox.drain();
    for (const event of events) {
      await this.emitter.emitAsync(event.name, event.payload);
    }
  }
}
