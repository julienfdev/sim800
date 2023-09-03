# SIM800

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
client.on('incoming-sms', (sms) => {
  console.log("Received new SMS from ", sms.number)
  console.log(sms.text)
})
client.on('networkReady', async () => {
  const isModemOk = await client.send(new AtCommand());
  const smsUuid = await client.sendSms({
    number: '+33605040302',
    text: 'Hello, World!',
  });
});
```

### Features

- Auto init with sim unlock 🔒
- Network, Inbound and Outbound events 🛜
- SMS Concurrency support, you can reliably send an sms request without waiting for the previous one to complete ⚡️
- Full Unicode support 🤩
- Full multipart-SMS support 📨
- Single and Multipart Delivery Reports ✅
- Fully configurable low level AT commands (success and error conditions, expected data...) with reliable API 🤖

## Deep Dive

### Prerequisites

Please note that this package makes extensive use of the [RxJS](https://rxjs.dev) library. If you're not familiar with _RxJS_, this is not an issue. But if you want to dive deeper into the module, please read the `RxJS` documentation, as the package uses observables and subjects to handle the asynchronous and chaotic nature of the modem buffer.

### Paradigm

The `sim800` package is inspired by the new syntax of the `@aws-sdk` v3 packages, like [@aws-sdk/client-sns](https://www.npmjs.com/package/@aws-sdk/client-sns), it features a **Sim800Client** responsible for sending various **commands**.
All the available commands extends the `Sim800Command` class.

You are free to send raw commands, using the `Sim800Command` class, curated commands using the children classes (list below), or you can create your own, by simply extending the `Sim800Command` class.

In addition the the output commands, `Sim800Client` exposes some high-level methods like `sendSms` which abstract the tedious handling of Unicode and multipart SMS.

### Under the hood

The AT standard is an antique standard and does not get along with concurrency very well, thus, the client uses a pseudo-synchronous _FIFO_ queue to handle the commands sent by the user.
It ensures that only one command is handled at the same time, to prevent crosstalk as much as possible.

Each command is an instance of the `Sim800Command` class or its children, and implements several signals (`completeWhen`, `errorWhen`) and allows to use custom `Observer` to detect when it has either completed or errored.

The `Sim800Client` observe each command and manages its **output** buffer when the current command has completed, errored, or timeout.


### High-Level abstraction

- `awaitDevice()`: Returns a promise that resolves when the SIM800 device is ready for communication.

- `isNetworkReady()`: Returns a promise that resolves with the current network readiness status of the SIM800 module.

- `async sendSms(number: string, text: string, deliveryReport = false): number[] ` The `sendSms()` function sends an SMS message with the specified `number` and `text` content, with an optional parameter `deliveryReport` to request delivery reports (default is false). the number should be passed as an international number (+XXYYYYYY). the function returns a Promise which resolves with a composite id, containing all the internal message references for each part (eg: `[33, 34]` for a two-part SMS) 

### Events

1. `deviceReady`: This event is emitted when the SIM800 device is ready for communication. It doesn't carry any additional data and serves as an indicator that the device is prepared for operations.

2. `networkReady`: This event is emitted when the SIM800 module establishes a connection with the cellular network and is ready for network-related operations. It also doesn't carry any additional data and signifies that network-related actions can be performed.

3. `input`: This event is emitted when user input data is received from the SIM800 module. The `data` parameter in the listener function contains the received input data as a string.

4. `incoming-sms`: This event is emitted when an incoming SMS message is received by the SIM800 module. The `sms` parameter in the listener function contains the details of the incoming SMS, including the sender's number and the message text.

5. `sms-sent`: This event is emitted when an SMS message is successfully sent. The `compositeId` parameter in the listener function is an array of numbers representing the composite message ID(s) associated with the sent SMS message(s).

6. `delivery-report`: This event is emitted when a delivery report is received for a sent SMS message. The `compositeId` parameter represents the composite message ID associated with the delivered message, and the `status` parameter indicates the delivery status, while the optional `detail` parameter provides additional details about the delivery status.

These events and their associated listener functions allow users to handle various communication events and incoming data from the SIM800 module in a structured and event-driven manner, enabling effective control and monitoring of the module's behavior.

## Advanced usage

Be careful, if you're not sure what you're doing, this section could break your implementation easily. You can always open an issue to suggest a High-level abstraction or a custom event
### Streams

The raw RxJS streams and their interfaces exposed by the client : 

-  `ready$` (AsyncSubject<boolean>): This stream is used to indicate when the SIM800 module is ready for communication. It emits a boolean value when the module is ready or not.

- `network$` (AsyncSubject<boolean>): This stream provides information about the network status. It emits a boolean value to indicate whether the module is connected to the cellular network or not.

- `smsBusy$` (AsyncSubject<boolean>): This stream informs the user about the SIM800 module's SMS operation status. It emits a boolean value to indicate whether the module is busy with SMS operations or not.

- `stream$` (Subject<string>): This is a general-purpose stream for receiving data as strings. Users can subscribe to this stream to receive data from the SIM800 module.

- `inputStream$` (Subject<string>): Similar to `stream$`, this stream is specifically for receiving incoming data as strings. It can be used to read raw input data coming from the module

- `smsStream$` (Subject<Sim800OutgoingSmsStreamEvent>): This stream is used to receive events related to outgoing SMS messages. It can emit two types of events: 'part' events that provide details about individual parts of an outgoing SMS and 'sms' events that provide information about the entire outgoing SMS.

- `deliveryReportStream$` (Subject<Sim800DeliveryEvent>): This stream is used to receive delivery reports for SMS messages. It emits events with details about the delivery status of sent SMS messages, including message references, status, delivery details, and timestamps.



### Low-Level Commands

- `Sim800Command`

This is the parent class of all the command sent by the client, here's the constructor signature : 

```typescript
export type Sim800CommandInput = {
  command: Sim800CommandType | string;
  isInput?: boolean;
  expectedData?: (string | ((data: string) => boolean))[];
  arg?: string;
  timeoutMs?: number;
  observer?: Partial<Observer<string>>;
  completeWhen?: ((data: string) => boolean) | string;
  errorWhen?: ((data: string) => boolean) | string;
};
```

- 
  - `command` (required): This field represents the AT command that you want to send to the SIM800 module. It can be either of type `Sim800CommandType`, which is an enum containing predefined AT commands, or a custom string representing your own AT command.

  - `isInput` (optional): A boolean flag that indicates whether the provided `command` is user input (true) or a predefined command (false). When `isInput` is true, the command is treated as a buffer input terminated by the CTRL+Z character.

  - `expectedData` (optional): An array of strings or functions used to validate the data received from the SIM800 module after sending the command. If the data matches, it's added to the raw buffer and considered part of the command.

  - `arg` (optional): This field is used to provide additional arguments or parameters for the AT command. It is typically a string representing the argument to be passed to the AT command.

  - `timeoutMs` (optional): The maximum time, in milliseconds, to wait for a response from the SIM800 module after sending the command. If no response is received within this time, the command may be considered unsuccessful.

  - `observer` (optional): An **RxJS** observer that can include observer functions (`next`, `error`, `complete`) for various events related to the command execution.

  - `completeWhen` (optional): A condition or string that defines when the command is considered complete. It can be a function that takes the received data as input and returns a boolean, indicating whether the command is complete, or it can be a string that the received data should match for the command to be considered complete.

  - `errorWhen` (optional): A condition or string that defines when the command is considered to have encountered an error. It can be a function that takes the received data as input and returns a boolean, indicating whether an error occurred, or it can be a string that the received data should match for an error condition.

This constructor provides flexibility in defining and customizing AT commands and their expected behavior when interacting with the SIM800 module. You can specify different conditions for command completion and error handling based on your specific requirements.

- `CmgdCommand` 

Deletes a message from the SIM card storage.

Example:
```typescript
// Delete a message at a specific SIM index
const deleteCommand = new CmgdCommand(1);
```

- `CmgdaCommand` 

Deletes all messages from the SIM card storage based on the specified mode.

Example:
```typescript
// Delete all messages based on mode 6 (delete read messages)
const deleteAllCommand = new CmgdaCommand();
```

- `CmgfCommand`

Sets the message format for SMS messages on the SIM card.

Example:
```typescript
// Set message format to PDU mode
const setPduModeCommand = new CmgfCommand(CmgfMode.Pdu);
```

- `CmgrCommand`

Reads a message from the SIM card storage at the specified index.

Example:
```typescript
// Read a message from the SIM card at index 1
const readMessageCommand = new CmgrCommand(1);
```

- `CmgsCommand`

Prepares the Sim800 to send an SMS, this must immediately be followed by an `InputCommand`

Example:
```typescript
// Asks for the "> " input prompt
const sendMessageCommand = new CmgsCommand(123);
```

- `InputCommand`

Must be called when the SIM800 is in `> ` input prompt mode, Acts as an input device, and terminates the buffer by the CTRL+Z character, thus sending the SMS.
By default, it needs PDU data

Example:
```typescript
const customCommand = new InputCommand("6007537F4000885060804DD6C0201D83EDD720020004C006F00720");
```

- `CnmiCommand`

Sets the parameters for new message indications (CNMI) for incoming SMS messages.

Example:
```typescript
// Set CNMI parameters for new message indications
const setCnmiParametersCommand = new CnmiCommand('2,1,0,0,0');
```

- `CpinStatusCommand`

Queries the status of the SIM card (e.g., whether it is ready, locked, etc.).

Example:
```typescript
// Query the status of the SIM card
const querySimStatusCommand = new CpinStatusCommand();
```

- `CregStatusCommand`

Queries the registration status of the SIM card with the cellular network.

Example:
```typescript
// Query the registration status of the SIM card
const queryRegistrationStatusCommand = new CregStatusCommand();
```

- `PinUnlockCommand`

Unlocks the SIM card with the provided PIN.

Example:
```typescript
// Unlock the SIM card with a PIN
const unlockSimCommand = new PinUnlockCommand('1234');
```


## Contributing

As always, contributing is pretty straightforward, you can either : 

- Open an issue, whether it is to tell me about a bug or to request a feature, please follow usual issue report guidelines.

- Fork the project, create a feature branch on your GitHub, run `npm run prepublish` before any pull request.
