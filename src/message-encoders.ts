import { MessageEncoding } from './message-encoding';
import { Message } from './message';
import { MessageEncoder } from './message-encoder';

export class MessageEncoders {
    private encoders: Map<string, MessageEncoder> = new Map<string, MessageEncoder>();

    public add<T extends Message>(encoding: MessageEncoding, messageType: new () => T, encoder: new () => MessageEncoder): void {
        this.encoders.set(encoding + '-' + new messageType().typeName(), new encoder());
    }

    public get(encoding: MessageEncoding, messageType: string): MessageEncoder {
        const encoder: MessageEncoder = this.encoders.get(encoding + '-' + messageType);
        if (encoder === undefined) {
            throw new Error('MessageEncoder not configured for type: ' + messageType);
        }
        return encoder;
    }
}
