import { Message } from 'amqplib';

export interface MessageDecoder {
    decode<T>(message: Message): T;
}
