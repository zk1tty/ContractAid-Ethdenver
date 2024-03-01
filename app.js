import dotenv from 'dotenv'
import fs from 'fs'
import http from 'http'
import url from 'url'
import { Octokit, App } from 'octokit'
import { createNodeMiddleware } from '@octokit/webhooks'

// Load environment variables from .env file
dotenv.config()

// Set configured values
const appId = process.env.APP_ID
const privateKeyPath = process.env.PRIVATE_KEY_PATH
const privateKey = fs.readFileSync(privateKeyPath, 'utf8')
const secret = process.env.WEBHOOK_SECRET
const enterpriseHostname = process.env.ENTERPRISE_HOSTNAME
const messageForNewPRs = fs.readFileSync('./message.md', 'utf8')

// Create an authenticated Octokit client authenticated as a GitHub App
const app = new App({
  appId,
  privateKey,
  webhooks: {
    secret
  },
  ...(enterpriseHostname && {
    Octokit: Octokit.defaults({
      baseUrl: `https://${enterpriseHostname}/api/v3`
    })
  })
})

// Optional: Get & log the authenticated app's name
const { data } = await app.octokit.request('/app')
// Read more about custom logging: https://github.com/octokit/core.js#logging 
app.octokit.log.debug(`Authenticated as '${data.name}'`)

// Subscribe to the "pull_request.opened" webhook event
app.webhooks.on('pull_request.opened', async ({ octokit, payload }) => {
  console.log(`Received a pull request event for #${payload.pull_request.number}`)
  try {
    await octokit.rest.issues.createComment({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: payload.pull_request.number,
      body: messageForNewPRs
    })
  } catch (error) {
    if (error.response) {
      console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`)
    } else {
      console.error(error)
    }
  }
})

// Optional: Handle errors
app.webhooks.onError((error) => {
  if (error.name === 'AggregateError') {
    // Log Secret verification errors
    console.log(`Error processing request: ${error.event}`)
  } else {
    console.log(error)
  }
})

// Launch a web server to listen for GitHub webhooks
const port = process.env.PORT || 3000
const webhookPath = '/api/webhook'
const localWebhookUrl = `http://localhost:${port}${webhookPath}`

// See https://github.com/octokit/webhooks.js/#createnodemiddleware for all options
const middleware = createNodeMiddleware(app.webhooks, {webhookPath })

const server = http.createServer(async(req, res) => {
  const parsedUrl = url.parse(req.url);
  const queryParameters = parsedUrl.query;

  // Serve the CSS file
  if (parsedUrl.pathname === '/style.css') {
    fs.readFile('./style.css', (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/css' });
        res.end(data);
      }
    });
    return; // Important to return here so the code below doesn't execute for CSS requests
  }

  // Check if the request URL matches the webhook path
  if (parsedUrl.pathname === webhookPath) {
    // If the request is for the webhook, use the middleware to handle it
    middleware(req, res);
  } else if(parsedUrl.pathname === '/github/callback'){
    res.writeHead(200, {'Content-Type': 'text/html'});
    console.log("queryParameters:", queryParameters);
    const code = queryParameters?.code; 
    //res.end(`<h1>Your user code is ${queryParameters} </h1>`);

    // Prepare dashboard HTML content
    const dashboardHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="/style.css">
        <title>Dashboard</title>
        <style>
          /* Add some basic styling */
          body { font-family: Arial, sans-serif; }
          .dashboard { margin: 20px; }
          .dashboard h1 { color: #333; }
          .dashboard p { color: #666; }
        </style>
      </head>
      <body>
        <div class="dashboard">
          <h1>Your user code is ${queryParameters}</h1>
          <p>Welcome to your Dashboard</p>
          <!-- Add more dashboard details here -->
          <p>Here you can find detailed information about your interaction with our GitHub App.</p>
          <!-- Example: Display a link or instructions -->
          <p>Here is more info! <a href="https://example.com/documentation">documentation</a></p>
        </div>
      </body>
      </html>
    `;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(dashboardHtml);

  } else {
    // Handle other paths or serve static files here
    // For example, serve a simple message for the root path
    if (parsedUrl.pathname === '/') {
      res.writeHead(200, {'Content-Type': 'text/html'});
      const html = fs.readFileSync('./index.html', 'utf8');
      res.end(html);
    } else {
      // If the path is not recognized, return a 404 Not Found
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.end('Not Found');
    }
  }
});
  
server.listen(port, async() => {
  console.log(`Server is listening for events at: ${localWebhookUrl}`)
  console.log('Press Ctrl + C to quit.')
})

