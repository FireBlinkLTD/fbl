import { createServer, OutgoingHttpHeaders } from 'http';

import * as commander from 'commander';
import { createReadStream } from 'fs';

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
    process.send({ name, payload });
};

console.log('Starting server with options: ' + JSON.stringify(commander.opts()));
createServer(async (request, response) => {
    processSend('onRequest', {
        headers: request.headers,
    });

    const options = commander.opts();

    if (options.delay) {
        await new Promise((resolve) => setTimeout(resolve, options.delay));
    }

    let headers: OutgoingHttpHeaders = {};

    if (options.headers) {
        headers = JSON.parse(options.headers);
    }

    response.writeHead(options.status, headers);
    response.setTimeout(options.timeout * 1000, () => {
        response.end();
    });

    if (options.ignoreRequest) {
        return;
    }

    if (Number(options.status) === 200) {
        const fileStream = createReadStream(options.file);
        fileStream.pipe(response);

        fileStream.on('end', function () {
            response.end();
        });
    } else {
        response.end();
    }
})
    .on('error', (err) => {
        processSend('failed');
        console.error(err);
        process.exit(1);
    })
    .listen(commander.opts().port, () => {
        console.log('Server is running on port: ' + commander.opts().port);
        processSend('started');
    });
