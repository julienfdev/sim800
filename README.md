# SIM800

WARNING: This is a work in progress, please don't use as an npm package for now

A modern and opiniated module for SIM800 modems ( SIM800 / SIM800L ). 
The `sim800` paradigm is mainly inspired by the version 3 of the [aws-sdk](https://github.com/aws/aws-sdk-js-v3)

## Installation and Usage

### Installation
`npm i sim800` or `yarn add sim800`

### Usage
```ts
    import { Sim800Client } from "sim800"

    const config: Sim800ClientConfig = {
        port: "/dev/ttyUSB0",
        pin: "1234"
    }

    const client = new Sim800Client(config)
    client.on("networkReady", async () => {
        const sendSmsCommand = new SendSmsCommand({
            number: "+33605040302",
            content: "Hello, World!",
        })
        const smsUuid = await client.send(sendSmsCommand)
    })
```

## Deep Dive

WIP