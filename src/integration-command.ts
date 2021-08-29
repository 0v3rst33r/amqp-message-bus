import { Message } from './message';

export interface IntegrationCommand extends Message {
    isCommandMessage(): void;
}

export class AbstractIntegrationCommand implements IntegrationCommand {
    public isIntegrationCommand(): boolean {
        return true;
    }

    public isCommandMessage(): boolean {
        return true;
    }

    public isMessageBusMessage(): boolean {
        return true;
    }

    public typeName(): string {
        throw new Error('typeName() not implemented in concrete type');
    }
}
