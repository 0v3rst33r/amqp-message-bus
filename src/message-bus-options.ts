export interface MessageBusOptions {
    /**
     * If not provided 'localhost' will be assumed.
     */
    host?: string;

    autoConnect?: boolean;
    autoReconnect?: boolean;
}
