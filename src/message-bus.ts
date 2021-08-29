import { MessagePublishOptions } from './message-publish-options';
import { MessageSubscribeOptions } from './message-subscribe-options';
import { Message } from './message';
import { MessageBusOptions } from './message-bus-options';
import { MessageDecoding } from './message-decoding';
import { MessageDecoder } from './message-decoder';
import { MessageEncoding } from './message-encoding';
import { MessageEncoder } from './message-encoder';
import { Subject } from 'rxjs';

export interface MessageBus {
    readonly initialisedSubject: Subject<boolean>;
    readonly subscriptionAddedSubject: Subject<boolean>;

    init(options: MessageBusOptions): void;

    closeChannels(): void;
    closeConnection(): void;

    addDecoder<T extends Message>(decoding: MessageDecoding, messageType: new () => T, decoder: new () => MessageDecoder): void;

    addEncoder<T extends Message>(encoding: MessageEncoding, messageType: new () => T, encoder: new () => MessageEncoder): void;

    /**
     * Sends a message from <code>1:N</code> processes in a <code>fan-out</code> architecture.  The message will be
     * published and any number of subscribers can receive it.
     *
     * @param {Message} message
     * @param {MessagePublishOptions} options
     */
    publish(message: Message, options?: MessagePublishOptions): void;

    /**
     * Subscribe to event or command messages.
     *
     * @param {(t: T)} messageType
     * @param {(t: T) => void} handler
     * @param {MessageSubscribeOptions} options
     */
    subscribe<T extends Message>(messageType: new () => T, handler: (t: T) => void, options?: MessageSubscribeOptions): void;
}
