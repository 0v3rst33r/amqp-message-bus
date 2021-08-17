# amqp-message-bus

Fast track services communications via the RabbitMQ Message Broker.

[![0v3rst33r - amqp-message-bus](https://img.shields.io/static/v1?label=0v3rst33r&message=amqp-message-bus&color=blue&logo=github)](https://github.com/0v3rst33r/amqp-message-bus)
[![stars - amqp-message-bus](https://img.shields.io/github/stars/0v3rst33r/amqp-message-bus?style=social)](https://github.com/0v3rst33r/amqp-message-bus)
[![forks - amqp-message-bus](https://img.shields.io/github/forks/0v3rst33r/amqp-message-bus?style=social)](https://github.com/0v3rst33r/amqp-message-bus)

[![GitHub tag](https://img.shields.io/github/tag/0v3rst33r/amqp-message-bus?include_prereleases=&sort=semver)](https://github.com/0v3rst33r/amqp-message-bus/releases/) ![Contributors](https://img.shields.io/github/contributors/0v3rst33r/amqp-message-bus?color=dark-green) ![Issues](https://img.shields.io/github/issues/0v3rst33r/amqp-message-bus) ![License](https://img.shields.io/github/license/0v3rst33r/amqp-message-bus)



## Table Of Contents

* [Setup](#setup)
* [Build](#build)
* [Test](#test)
* [Publish](#publish)
* [Contributing](#contributing)
* [License](#license)

## Setup

Install `nvm` if you have not done so yet, then:

```sh
nvm use
```

## Build

```sh
npm run build
```

## Test

Start `rabbitmq` on your local machine:

```sh
docker run --rm -it --hostname rabbitmq-amqp-message-bus -p 15672:15672 -p 5672:5672 rabbitmq:3-management
```

Then exeucte the tests:

```sh
npm run test
```

Expected output:

```
  IntegrationCommands
    when subscribing and publishing
      ✔ then the message is received (55ms)

  IntegrationEvents
    2 queues with different names against the same exchange
      when subscribing and publishing
        ✔ then the message is consumed twice by both queues (2056ms)
    2 queues with identical names against the same exchange
      when subscribing and publishing
        ✔ then the message is consumed only once by one of the queues (2047ms)


  3 passing (4s)
```

## Publish

You need to be an `@inrange` organisation team member in order to publish.

Use the `--dry-run` flag if you first want to test/confirm what will be published.

```sh
npm publish --access public
```

## Contributing

Contributions are what make the open source community such an amazing place to be learn, inspire, and create. Any contributions you make are **greatly appreciated**.
* If you have suggestions for adding or removing projects, feel free to [open an issue](https://github.com/0v3rst33r/amqp-message-bus/issues/new) to discuss it, or directly create a pull request after you edit the *README.md* file with necessary changes.
* Please make sure you check your spelling and grammar.
* Create individual PR for each suggestion.

## License

See [LICENSE](https://github.com/0v3rst33r/amqp-message-bus/blob/develop/LICENSE) for more information.
