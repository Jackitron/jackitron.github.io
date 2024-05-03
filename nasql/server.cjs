// server.js
// Jack Edwards 20039542
// Provides the hosting capability for the production environment
// Serves files using two ports, frontend at port 80 and a backend on port 8080.
// A small command line interface then allows the server to be shut down when running.

// Return a result for a given query.
var http = require('http');
var readline = require('readline');
var fs = require('fs');
var path = require('path');
var mysql = require('mysql');

// Database connection credentials may vary on different systems.
// may be changed for different machines
// the "nasql" user only has the SELECT priviledge.
var dbconn = mysql.createPool({
    host: 'localhost',
    user: 'nasql',
    password: 'nasql',
    database: 'employees',
});

// Regex to ensure query is valid
const limitRegex = /LIMIT \d+$/

// Disallow the following unless surrounded by unescaped quotes
//const disallow = //

// Console colours;
const C_RED =   '\x1b[31m\x1b[1m';
const C_YELLOW ='\x1b[33m\x1b[1m';
const C_BLUE =  '\x1b[36m\x1b[1m\x1b[4m';
const C_GREEN = '\x1b[32m\x1b[1m';
const C_NONE =  '\x1b[0m';
// And control character to reset the console cursor
// Used to display logs in parallel with the prompt.
const ERASELINE = '\r';

// NASQL command line prompt
const version = `Node ${process.version}`;
const promptLine = C_YELLOW + 'NASQL' + C_NONE + '@' + C_GREEN + version + C_NONE + '> ';

// Get a JSON of network interfaces and find the one to use
const NIs = require('os').networkInterfaces();
// Ignore local/internal adresses (127.0.0.1 etc)
const externalNI = Object.keys(NIs).filter(NIType => NIs[NIType][0].internal == false)
// Find every IPv4
const serverIP = NIs[externalNI[0]].filter(n => n.family == 'IPv4')[0].address;

// NASQL logo
ShowTitle();

// Run the database query-handling server on port 8080.
http.createServer(function (req, res) {
    var reqIP = req.socket.remoteAddress;
    let query = decodeURIComponent(req.url);
    
    // Ensure no semi-colons present?
    // How to ensure "dRoP" can't elude detection?
    //matches.forEach(b => {
        //query.replaceAll(b,'');
    //});
    // Remove slash from start, and ONLY from start.
    query = query.substring(1);
    
    // Abort if does not start with select
    if (query.startsWith('SELECT') == false) {
		LogWarning('Query did not start with SELECT.');
		cmdLine.prompt();
		return;
	}
    
    // If no LIMIT is present, add one in.
    if (query.match(limitRegex) == null) {
        query += ' LIMIT 500;';
    }

    LogInfo(reqIP + ' requested a query:'+query);
    cmdLine.prompt();

    // Store request or an error in the output
    // This is asynchronous, so all of the response is handled within the function.
	var options = {sql: query, nestTables: true};
    dbconn.query(options, function (error, results, fields) {
        let output = '';
        if (error) {
            LogWarning(error); cmdLine.prompt();
            // Write error for user to see
            output = '<p>' + error.message + '</p>';
        }
        else {
            output += '<h3>'+results.length+' rows Returned. </h3>';
            if (results.length > 0) {
                // Pull and write table headings
                output += '<table><tr>';
                fields.forEach(f => {
					if (f.name == f.orgName) {
						output += '<th>' + f.table + '.' + f.name + '</th>';
					}
					// If field renamed AS something else, ignore table name
					else {
						output += '<th>' + f.name + '</th>';
					}
                });
                output += '</tr>';
                // Then append table rows to output by unwrapping
                results.forEach(table => {
                    output += '<tr>';
                    Object.keys(table).forEach(row => {
						Object.keys(table[row]).forEach(col => {
							output += '<td>' + table[row][col] + '</td>';
						});
                    });
                    output += '</tr>';
                });
                output += '</table>';
            }
        }
        
        // Write results into the web page, or iframe in the app.
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write('<html><head>');
        // simple styling for table
        res.write('<style>');
        res.write('html,body{font-family: sans-serif} ');
        res.write('table{width: 100%} ');
        res.write('th,tr,td{border-left: 1px solid; border-bottom: 1px solid; text-align: center;} ');
        res.write('th{ background-color: #ddf; } ');
        res.write('p{ font-weight: bold; color: #f77; } ');
        res.write('</style>');
        res.write('</head><body>');
        res.write(output);
        // Finish writing and send response
        res.write('</body></html>');
        res.end();
    });
}).listen(8080);
LogInfo('NASQL DB Connection Server started on '+ C_BLUE + serverIP +':8080' + C_NONE);




// Run the react frontend server, supplying the node editor.
http.createServer(function(req, res) {
    // Add in line before prompt
    var reqIP = req.socket.remoteAddress;
    var dirtyPath = '.' + req.url;

	// Ensure requests do not leave root directory!
    if (dirtyPath.includes("/..") == false) {
        // Redirect blank URLs to index
        cleanPath = dirtyPath.trim();
        if (dirtyPath == './') { cleanPath = './index.html' }

        // Only provide for HTML/CSS/JS and nothing else for security reasons.
        var mimeType = 'text/html';
        if (path.extname(cleanPath) == '.css') { mimeType = 'text/css' }
        if (path.extname(cleanPath) == '.jsx') { mimeType = 'text/javascript' }
        if (path.extname(cleanPath) == '.js') { mimeType = 'text/javascript' }
        
        fs.readFile(cleanPath, function(error, content) {
            if (error) {
                // If file not found, write a small error message
                if(error.code == 'ENOENT') {
                    res.writeHead(404, {'Content-Type': 'text/html'});
                    res.write('<html> <head><title>404</title></head> <body>');
                    res.write('<h1>404</h1>');
                    res.write('</body></html>');
                    res.end();
                    LogWarning(reqIP +' requested nonexistent file: '+ cleanPath);
                    cmdLine.prompt();
                }
                else {
                    LogWarning('Unknown error:' + error);
                    cmdLine.prompt();
                }
            }
            // Or else read file and send back
            else {
                res.writeHead(200, {'Content-Type': mimeType} );
                res.write(content);
                res.end();
                LogInfo(reqIP + ' Connected, requesting ' + cleanPath);
                cmdLine.prompt();
            }
        });
    }
	// Log suspicious requests
	else {
		LogWarning(reqIP +' requested files outside the root:'+ dirtyPath);
	}
}).listen(80);
LogInfo('NASQL Frontend Server started on '+ C_BLUE + serverIP +':80' + C_NONE);




// Once both servers are running, run CLI.
const cmdLine = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: promptLine
});
console.log();
cmdLine.prompt();
cmdLine.on('line', function(line) {
    // Based on stdin, run some code
    switch (line.trim())
    {
        case 'c':
            console.clear();
            ShowTitle();
        case 'h':
            PrintHelp('c', 'Clear console');
            PrintHelp('h', 'Show help');
            PrintHelp('i', 'Show server ip/port');
            PrintHelp('q', 'Shutdown server');
            break;
        case 'i':
            console.log('NASQL Server IP address is ' + C_BLUE + serverIP + ':80' + C_NONE);
            break;
        case 'q':
            Exit();
            break;
        default:
            console.error(" Not a Command. Enter 'h' for help.");
            break;
    }
    // And run prompt again when done.
    cmdLine.prompt();
});

// Log requests to server for debugging
function LogInfo(s) {
    console.log(ERASELINE + ' [INFO] ' + s);
}
function LogWarning(s) {
    console.log(ERASELINE + C_RED + ' [WARN] ' + s + C_NONE);
}

function PrintHelp(key, message) {
    console.log("\x1b[1m\x1b[36m '" + key + "'\x1b[0m - " + message + "\x1b[0m");
}

function Exit() {
    console.log('NASQL Server shutting down...');
    process.exit(0);
}

function ShowTitle() {
    console.log(C_RED);
    console.log('      ##    #    ####    ####    ####   #    ');
    console.log('     # #   #   #    #  #       #    #  #    ');
    console.log('    #  #  #   ######   ####   #  # #  #    ');
    console.log('   #   # #   #    #       #  #   #   #    ');
    console.log('  #    ##   #    #   ####    ### #   ####\x1b[0m');
    console.log(C_YELLOW + 'Node-Activated Structured Query Language 1.0' + C_NONE);
    console.log();
}