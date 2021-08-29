import { Message } from './message';

export interface IntegrationEvent extends Message {
    isEventMessage(): void;

    publish(): void;
}

export class AbstractIntegrationEvent implements IntegrationEvent {
    public isIntegrationEvent(): boolean {
        return true;
    }

    public isEventMessage(): boolean {
        return true;
    }

    public isMessageBusMessage(): boolean {
        return true;
    }

    public typeName(): string {
        throw new Error('typeName() not implemented in concrete type');
    }

    public publish(): void {
        throw new Error('publish() not implemented in concrete type');
    }
}
