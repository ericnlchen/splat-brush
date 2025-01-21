import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

const HOST_LOCAL = true;

let baseDirectory = './build-ts/';
let port = 3000;

let host = HOST_LOCAL ? '0.0.0.0' : '108.61.23.254';
let lasttRequesTime = performance.now() / 1000;

const serve = async (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET");
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Cross-Origin-Resource-Policy", "same-site");
  response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");

  console.log("ACCESS!")
  let filePath = baseDirectory + request.url;

  const extname = path.extname(filePath);
  let contentType = "text/html";
  switch (extname) {
    case ".js":
      contentType = "text/javascript";
      break;
    case ".css":
      contentType = "text/css";
      break;
    case ".json":
      contentType = "application/json";
      break;
    case ".png":
      contentType = "image/png";
      break;
    case ".jpg":
      contentType = "image/jpg";
      break;
  }

  const requestTime = performance.now() / 1000;
  if (requestTime - lasttRequesTime > 1) {
    console.log("");
    console.log("-----------------------------------------------");
  }

  let queryString;
  let queryStringStart = filePath.indexOf('?');
  if (queryStringStart && queryStringStart > 0) {
    queryString = filePath.substring(queryStringStart + 1);
    filePath = filePath.substring(0, queryStringStart);
  }

  let testDirectory = filePath;
  if (testDirectory.endsWith("/")) {
    testDirectory = testDirectory.substring(0, testDirectory.length - 1);
  }
  try {
    if (fs.lstatSync(filePath).isDirectory()) {
      let testDirectory = filePath;
      if (!testDirectory.endsWith("/")) testDirectory = testDirectory + "/";
      if (fs.existsSync(testDirectory + "index.html")) {
        filePath = testDirectory + "index.html";
      } else if (fs.existsSync(testDirectory + "index.htm")) {
        filePath = testDirectory + "index.htm";
      }
    }
  } catch(err) {
    // ignore
  }

  try {
    const stats = fs.statSync(filePath);
    if (stats && stats.size) {
      const fileSizeInBytes = stats.size;
      response.setHeader("Content-Length", fileSizeInBytes);
    }
  } catch(err) {
    // ignore
  }

  fs.readFile(filePath, async function (error, content) {
    if (error) {
      if (error.code == "ENOENT") {
        console.log("HTTP(404) Request for " + filePath + " -> File not found.");
      } else {
        console.log("HTTP(500)) Request for " + filePath + " -> Server error.");
        response.writeHead(500);
        response.end(
          "Sorry, check with the site admin for error: " +
            error.code +
            " ..\n"
        );
        response.end();
      }
    } else {
      console.log("HTTP(200) Request for " + filePath);
      response.writeHead(200, { "Content-Type": contentType });
      response.end(content, "utf-8");
    }
  });

  lasttRequesTime = requestTime;
}

http.createServer(serve).listen(port, 'localhost');

console.log("Server running at " + host + ':' + port);
