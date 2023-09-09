# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2023-09-09
### Added
- Error event

The error event is fired asynchronously when a `send` ends in an error. It allows you to easily implement a watchdog, monitor sms or network failures, etc... 

## [0.3.0] - 2023-09-03
### Added
- Concurrency for SMS sending : you can now call sendSms asynchronously multiple times, there is a queue system to prevent crosstalk

When called, sendSms will instanciate an `Sim800Sms` and put it in a queue, then, the function will wait for the `Sim800Sms` `execute` method to resolve before sending back the `compositeId`. sendSms does not execute the method directly, it waits for the queue to handle it, thus preventing crosstalk

*this is absolutely mandatory in an API context, where you can have multiple requests sending SMS at the same time. Please note that as AT modems does not support concurrency, only one SMS will actually be sent at the same time, thus increasing the response time of SMSes far down the queue, please use responsibly*

- `noInit` option in `Sim800ClientConfig`, to allow for custom initialization routine implementation
- `reset` public method, which resets the module
- `deleteAllStoredSms` public method.
- `deliveryDate` in `delivery-report` event
- `date` property in `Sim800IncomingSms` interface

### Changed
- The `init` routine now checks if there are SMS to delete before calling the delete-all command, to prevent meaningless errors
- `checkNetwork` is now public

### Fixed
- Tiny memory leak in command observable subscription
- Tiny memory leak in command observer
- Tiny memory leak in network observable
- A bug with `checkNetwork` that didn't work more than once

## [0.2.0] - 2023-09-02
### Fixed
- A bug preventing multi part delivery reports from being handled correctly

### Removed
- carrierReference for outgoing SMSs

### Changed
- `Sim800Client` Refactoring
- Improved `delivery-report` event interface (breaking)

## [0.1.2] - 2023-09-02

### Added 
- Initial Release


[Unreleased]: https://github.com/julienfdev/sim800/compare/v0.4.0...HEAD
[0.4.0]:  https://github.com/julienfdev/sim800/releases/tag/v0.4.0
[0.3.0]:  https://github.com/julienfdev/sim800/releases/tag/v0.3.0
[0.2.0]:  https://github.com/julienfdev/sim800/releases/tag/v0.2.0
[0.1.2]:  https://github.com/julienfdev/sim800/releases/tag/v0.1.2