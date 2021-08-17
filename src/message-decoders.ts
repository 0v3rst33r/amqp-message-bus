import { Message } from './message';
import { MessageDecoder } from './message-decoder';
import { MessageDecoding } from './message-decoding';

export class MessageDecoders {
    private decoders: Map<string, MessageDecoder> = new Map<string, MessageDecoder>();

    public add<T extends Message>(decoding: MessageDecoding, messageType: new () => T, decoder: new () => MessageDecoder): void {
        this.decoders.set(decoding + '-' + new messageType().typeName(), new decoder());
    }

    public get(decoding: MessageDecoding, messageType: string): MessageDecoder {
        const decoder: MessageDecoder = this.decoders.get(decoding + '-' + messageType);
        if (decoder === undefined) {
            throw new Error('MessageDecoder not configured for type: ' + messageType);
        }
        return decoder;
    }
}
