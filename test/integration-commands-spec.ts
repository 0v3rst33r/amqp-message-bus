import 'reflect-metadata';
import 'mocha';
import { expect } from 'chai';
import {
    AmqpMessageBus,
    Message,
    MessageBus,
    MessageDecoder,
    MessageDecoding,
    MessageEncoder,
    MessageEncoding,
    AbstractIntegrationCommand
} from '../src';

describe('IntegrationCommands', function () {
    const messageBus: MessageBus = new AmqpMessageBus();

    beforeEach(function () {
        messageBus.init({
            host: 'amqp://localhost',
            autoReconnect: false
        });

        messageBus.addEncoder(MessageEncoding.Json, TestIntegrationCommand, TestIntegrationCommandJsonEncoder);

        messageBus.addDecoder(MessageDecoding.Json, TestIntegrationCommand, TestIntegrationCommandJsonDecoder);
    });

    afterEach(function () {
        messageBus.closeConnection();
    });

    context('when subscribing and publishing', function () {
        it('then the message is received', function (done) {
            this.timeout(0);

            messageBus.subscribe<TestIntegrationCommand>(
                TestIntegrationCommand,
                (command: TestIntegrationCommand) => {
                    expect(command).to.exist;
                    expect(1).to.equals(1);
                    done();
                },
                {
                    decoding: MessageDecoding.Json
                }
            );

            messageBus.initialisedSubject.subscribe((initialised: boolean) => {
                if (initialised) {
                    const endSessionIntegrationCommand = new TestIntegrationCommand();
                    messageBus.publish(endSessionIntegrationCommand, {
                        encoding: MessageEncoding.Json
                    });
                }
            });
        });
    });
});

class TestIntegrationCommand extends AbstractIntegrationCommand {
    constructor(private readonly rawData?: any) {
        super();
    }

    public getRawData(): any {
        return this.rawData;
    }

    public typeName(): string {
        return 'TestIntegrationCommand';
    }
}

class TestIntegrationCommandJsonEncoder implements MessageEncoder {
    public encode<T>(_message: Message): T {
        return Buffer.from(JSON.stringify({ key: 'value' })) as any;
    }
}

class TestIntegrationCommandJsonDecoder implements MessageDecoder {
    public decode<T>(message: any): T {
        return message;
    }
}
