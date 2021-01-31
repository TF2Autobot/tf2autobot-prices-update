const { version: BOT_VERSION } = require('../package.json');
process.env.BOT_VERSION = BOT_VERSION as string;

import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

import SocketManager from './classes/SocketManager';
import sendWebHookPriceUpdateV1 from './webhook';
import SchemaManager from 'tf2-schema-2';

const socketManger = new SocketManager('https://api.prices.tf');
const schemaManager = new SchemaManager({ apiKey: process.env.STEAM_API_KEY });

schemaManager.init(err => {
    if (err) {
        console.warn('Fail to get schema');
        process.exit(1);
    }
    socketManger.init().then(() => {
        socketManger.on('price', data => {
            sendWebHookPriceUpdateV1({ sku: data.sku, prices: { buy: data.buy, sell: data.sell }, time: data.time }, schemaManager.schema);
        })
    })
})

import ON_DEATH from 'death';
import * as inspect from 'util';

ON_DEATH({ uncaughtException: true })((signalOrErr, origin) => {
    const crashed = signalOrErr !== 'SIGINT';

    if (crashed) {
        console.error(
            [
                'Price update bot' +
                ' crashed! Please create an issue with the following log:',
                `package.version: ${process.env.BOT_VERSION || undefined}; node: ${process.version} ${
                    process.platform
                } ${process.arch}}`,
                'Stack trace:',
                inspect.inspect(origin)
            ].join('\r\n')
        );
    } else {
        console.warn('Received kill signal `' + (signalOrErr as string) + '`');
    }

    socketManger.shutDown()
    process.exit(1);
});