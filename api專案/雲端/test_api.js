const http = require('http');

const options = {
    hostname: '127.0.0.1',
    port: 3030,
    path: '/api/files?folder=',
    method: 'GET',
};

const req = http.request(options, res => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';

    res.on('data', chunk => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Response Body:');
        try {
            const json = JSON.parse(data);
            console.log(JSON.stringify(json, null, 2));
        } catch (e) {
            console.log(data);
        }
    });
});

req.on('error', error => {
    console.error(error);
});

req.end();
