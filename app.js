import dotenv from 'dotenv'
import fs from 'fs'
import http from 'http'
import url from 'url'
import { Octokit, App } from 'octokit'
import { createNodeMiddleware } from '@octokit/webhooks'
import { intelligentlyAnalyseReview } from './code-analyzer/review_intelligent.js'

// Load environment variables from .env file
dotenv.config()

// Set configured values
const appId = process.env.APP_ID
const privateKeyPath = process.env.PRIVATE_KEY_PATH
const privateKey = fs.readFileSync(privateKeyPath, 'utf8')
const secret = process.env.WEBHOOK_SECRET
const sampleReport = fs.readFileSync('./sampleReport.md', 'utf8')

// Create an authenticated Octokit client authenticated as a GitHub App
const app = new App({
  appId,
  privateKey,
  webhooks: {
    secret
  }
})

// Optional: Get & log the authenticated app's name
const { data } = await app.octokit.request('/app')
// Read more about custom logging: https://github.com/octokit/core.js#logging 
app.octokit.log.debug(`Authenticated as '${data.name}'`)
console.log("data:",data);

async function getRawSolFile(octokit, payload, path) {
  console.log("path:", path);
  const repoRes = await octokit.rest.repos.getContent({
    mediaType: {
      format: "raw",
    },
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    path
  })
  return repoRes?.data;
}

// Subscribe to the "pull_request.opened" webhook event
app.webhooks.on('pull_request.reopened', async ({ octokit, payload }) => {
  console.log(`Received a pull request event for #${payload.pull_request.number}`)
  try {

    const tree_sha = 'heads/main';
    const repoTree = await octokit.rest.git.getTree({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      tree_sha,
      recursive: '1'
    })

    const pathTree = repoTree?.data.tree
    const contractsPaths = pathTree.filter(leaf => {
      return leaf.path.split(".").slice(-1)[0] === 'sol' || leaf.path.split(".").slice(-1)[0] === 'rs' 
        ? true
        : false
    })

    if (!fs.existsSync("./contracts/")) {
      fs.mkdir(`./contracts`, { recursive: true }, (err) => {
        if (err) { console.error(err) }
      })
    }
    for (const contract of contractsPaths) {
      const rawSolFile = await getRawSolFile(octokit, payload, contract.path);
      fs.writeFile(`./contracts/${contract.path.split('/').slice(-1)[0]}`, rawSolFile, err => {
        if (err) { console.error(err) }
      });
    }

    console.log("Getting ready to call LLM to generate insights.......")
    const report = await intelligentlyAnalyseReview(`contracts`);
    console.log("\nReport\n", report);

    await octokit.rest.issues.createComment({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: payload.pull_request.number,
      body: report ? report : sampleReport,
    })
    fs.rm(`./contracts`, { recursive: true, force: true }, (err) => {
      if (err) { console.error(err) }
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
const middleware = createNodeMiddleware(app.webhooks, { path: webhookPath })

const server = http.createServer(async (req, res) => {
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

  // serve terminal logo
  if (parsedUrl.pathname === '/github/terminalicon.png') {
    fs.readFile('./icons/terminalicon.png', (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
      } else {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(data);
      }
    });
    return; // Important to return here so the code below doesn't execute for CSS requests
  }

  // serve circle-progress.min.js
  if (parsedUrl.pathname === '/github/circle-progress.min.js') {
    fs.readFile('./circle-progress.min.js', (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
      }
      else {
        res.writeHead(200, { 'Content-Type': 'text/javascript' });
        res.end(data);
      }
    });
    return; // Important to return here so the code below doesn't execute for CSS requests
  }

  // serve speedometericon.png
  if (parsedUrl.pathname === '/github/speedometericon.png') {
    fs.readFile('./icons/speedometericon.png', (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
      } else {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(data);
      }
    });
    return; // Important to return here so the code below doesn't execute for CSS requests
  }

  // server linesicon logo
  if (parsedUrl.pathname === '/github/linesicon.png') {
    fs.readFile('./icons/linesicon.png', (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
      } else {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(data);
      }
    });
    return; // Important to return here so the code below doesn't execute for CSS requests
  }

  // serve logo
  if (parsedUrl.pathname === '/contractaidlogo.png') {
    fs.readFile('./contractaidlogo.png', (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
      } else {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(data);
      }
    });
    return; // Important to return here so the code below doesn't execute for CSS requests
  }

  // serve logo on dashboard
  if (parsedUrl.pathname === '/github/contractaidlogo.png') {
    fs.readFile('./contractaidlogo.png', (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
      } else {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(data);
      }
    });
    return; // Important to return here so the code below doesn't execute for CSS requests
  }

  // Server login CSS file
  if (parsedUrl.pathname === '/login.css') {
    fs.readFile('./login.css', (err, data) => {
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

  // Serve Github logo
  if (parsedUrl.pathname === '/githubicon.png') {
    fs.readFile('./githubicon.png', (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
      } else {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(data);
      }
    });
    return; // Important to return here so the code below doesn't execute for CSS requests
  }

  // Check if the request URL matches the webhook path
  if (parsedUrl.pathname === webhookPath) {
    console.log("got webhook");
    // If the request is for the webhook, use the middleware to handle it
    await middleware(req, res);
    res.end();
  } else if (parsedUrl.pathname === '/github/callback') {
    // res.writeHead(200, { 'Content-Type': 'text/html' });
    console.log("queryParameters:", queryParameters);
    // Read the HTML content from the file
    const dashboardHtml = fs.readFileSync('./dashboard.html', 'utf8');
    // Replace placeholders with actual content
    res.writeHead(200, { 'Content-Type': 'text/html' });
    const customizedHtml = dashboardHtml.replace('{{userCode}}', "zk1tty ").replace('{{repoName}}', "bunzz-Vesting-module");
    res.end(customizedHtml);
  } else {
    // Handle other paths or serve static files here
    // For example, serve a simple message for the root path
    if (parsedUrl.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      const html = fs.readFileSync('./index.html', 'utf8');
      res.end(html);
    } else {
      // If the path is not recognized, return a 404 Not Found
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  }
});



server.listen(port, () => {
  console.log(`Server is listening for events at: ${localWebhookUrl}`)
  console.log('Press Ctrl + C to quit.')
})

