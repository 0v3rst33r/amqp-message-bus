export interface MessageDecoder {
    decode<T>(message: any): T;
}
