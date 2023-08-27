# SIM800

WARNING: This is a work in progress, please don't use as an npm package for now

A modern and opiniated module for SIM800 modems ( SIM800 / SIM800L ).
The `sim800` paradigm is mainly inspired by the version 3 of the [aws-sdk](https://github.com/aws/aws-sdk-js-v3)

## Installation and Usage

### Installation

`npm i sim800` or `yarn add sim800`

### Usage

```ts
import { Sim800Client } from 'sim800';

const config: Sim800ClientConfig = {
  port: '/dev/ttyUSB0',
  pin: '1234',
};

const client = new Sim800Client(config);
client.on('networkReady', async () => {
  const sendSmsCommand = new SendSmsCommand({
    number: '+33605040302',
    content: 'Hello, World!',
  });
  const smsUuid = await client.send(sendSmsCommand);
});
```

## Deep Dive

### Prerequisites

Please note that this package makes extensive use of the [RxJS](https://rxjs.dev) library. If you're not familiar with _RxJS_, this is not an issue. But if you want to dive deeper into the module, please read the `RxJS` documentation, as the package uses observables and subjects to handle the asynchronous and chaotic nature of the modem buffer.

### Paradigm

The `sim800` package is inspired by the new syntax of the `@aws-sdk` v3 packages, like [@aws-sdk/client-sns](https://www.npmjs.com/package/@aws-sdk/client-sns), it features a **Sim800Client** responsible for sending various **commands**.
All the available commands extends the `Sim800Command` class.

You are free to send raw commands, using the `Sim800Command` class, curated commands using the children classes (list below), or you can create your own, by simply extending the `Sim800Command` class.

In addition the the output commands,

### Under the hood

The AT standard is an antique standard and does not get along with concurrency very well, thus, the client uses a pseudo-synchronous _FIFO_ queue to handle the commands sent by the user.
It ensures that only one command is handled at the same time, to prevent crosstalk as much as possible.

Each command is an instance of the `Sim800Command` class or its children, and implements several signals (`completeWhen`, `errorWhen`) and allows to use custom `Observer` to detect when it has either completed or errored.

The `Sim800Client` observe each command and manages its **output** buffer when the current command has completed, errored, or timeout.

### Commands

- `Sim800Command`

This is the parent class of all the command sent by the client

// WIP

### Events

// WIP // incoming SMS and delivery reports handling
