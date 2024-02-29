const { Octokit } = require("@octokit/rest");

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

if(process.env.GITHUB_TOKEN){
    console.log("GITHUB_TOKEN:", process.env.GITHUB_TOKEN);
}

async function commentOnPR() {
  // Assuming you have the PR number and the repository details
  const prNumber = process.env.PR_NUMBER ? process.env.PR_NUMBER : 1;
  const owner = process.env.REPOSITORY_OWNER;
  const repo = process.env.REPOSITORY_NAME;

  const comment = `Comment "PR:${prNumber}, Owner:${owner}, repo:${repo}"`;
  // Markdown: 

const mdComment = `| Severity | Number | Line of Code     | Link to Code                             |
|----------|--------|------------------|-------------------------------------------|
| Critical | 1      | \`const foo = 42;\`| [View Code](https://github.com/user/repo/blob/branch/filename.js#L1) |
| High     | 2      | \`let bar = foo;\` | [View Code](https://github.com/user/repo/blob/branch/filename.js#L2) |
| Medium   | 3      | \`if (bar) {...}\` | [View Code](https://github.com/user/repo/blob/branch/filename.js#L3) |
| Low      | 4      | \`return bar;\`    | [View Code](https://github.com/user/repo/blob/branch/filename.js#L4) |"
`

if(!prNumber){
    console.error("Missing", prNumber);
    return;
  }
  try{
    await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: mdComment,
      });
  }catch(err){
    console.error(err); 
  }

}

commentOnPR().catch((error) => {
  console.error(error);
  process.exit(1);
});
