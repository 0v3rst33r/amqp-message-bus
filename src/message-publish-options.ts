import { MessageEncoding } from './message-encoding';
import * as amqp from 'amqplib/callback_api';

export interface MessagePublishOptions {
    encoding?: MessageEncoding;
    sendChannel?: amqp.Channel;
    exchangeName?: string;
    exchangeType?: string;
    exchangeDurable?: boolean;
    publishToQueue?: boolean;
    queueName?: string;
    queueDurable?: boolean;
    routingKey?: string;
    headers?: { userId: string };
}
