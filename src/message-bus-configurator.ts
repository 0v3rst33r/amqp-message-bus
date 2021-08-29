import { MessageBusOptions } from './message-bus-options';

export interface MessageBusConfigurator {
    configure(options: MessageBusOptions): void;
}
