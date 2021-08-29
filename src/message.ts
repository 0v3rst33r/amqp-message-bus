export interface Message {
    isMessageBusMessage(): boolean;

    typeName(): string;
}
