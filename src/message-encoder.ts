import { Message } from './message';

export interface MessageEncoder {
    encode<T>(message: Message): T;
}
