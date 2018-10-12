import {createServer} from 'http';

import * as commander from 'commander';
import {createReadStream} from 'fs';

// prepare commander
commander
    .arguments('<file>')
    .option('-p --port <port>')
    .option('-s --status <status>')
    .option('-t --timeout <seconds>')
    .option('--ignore-request')
    .action((file, opts) => {
        opts.file = file;
    });

// parse environment variables
commander.parse(process.argv);

console.log('Starting server with options: ' + JSON.stringify(commander.opts()));
createServer((request, response) => {
    response.writeHead(commander.status);
    response.setTimeout(commander.timeout * 1000, () => {
        response.end();
    });

    if (commander.ignoreRequest) {
        return;
    }

    if (Number(commander.status) === 200) {
        const fileStream = createReadStream(commander.file);
        fileStream.on('data', function (data) {
            response.write(data);
        });

        fileStream.on('end', function () {
            response.end();
        });
    } else {
        response.end();
    }
}).listen(commander.port, (err: any) => {
    if (err) {
        process.send('failed');
        console.error(err);
        process.exit(1);
    }

    console.log('Server is running on port: ' + commander.port);
    process.send('started');
});
