import {createServer, OutgoingHttpHeaders} from 'http';

import * as commander from 'commander';
import {createReadStream} from 'fs';

// prepare commander
commander
    .arguments('<file>')
    .option('-p --port <port>')
    .option('-s --status <status>')
    .option('-t --timeout <seconds>')
    .option('-d --delay <milliseconds>')
    .option('-h --headers <string>')
    .option('--ignore-request')
    .action((file, opts) => {
        opts.file = file;
    });

// parse environment variables
commander.parse(process.argv);

const processSend = (name: string, payload?: any) => {
    process.send({name, payload});
};

console.log('Starting server with options: ' + JSON.stringify(commander.opts()));
createServer(async (request, response) => {
    processSend('onRequest', {
        headers: request.headers
    });

    if (commander.delay) {
        await new Promise(resolve => setTimeout(resolve, commander.delay));
    }

    let headers: OutgoingHttpHeaders = {};

    if (commander.headers) {
        headers = JSON.parse(commander.headers);
    }

    response.writeHead(commander.status, headers);
    response.setTimeout(commander.timeout * 1000, () => {
        response.end();
    });

    if (commander.ignoreRequest) {
        return;
    }

    if (Number(commander.status) === 200) {
        const fileStream = createReadStream(commander.file);
        fileStream.pipe(response);

        fileStream.on('end', function () {
            response.end();
        });
    } else {
        response.end();
    }
}).listen(commander.port, (err: any) => {
    if (err) {
        processSend('failed');
        console.error(err);
        process.exit(1);
    }

    console.log('Server is running on port: ' + commander.port);
    processSend('started');
});
