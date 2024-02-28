const { Octokit } = require("@octokit/rest");

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function commentOnPR() {
  // Assuming you have the PR number and the repository details
  const prNumber = process.env.PR_NUMBER;
  const owner = process.env.REPOSITORY_OWNER;
  const repo = process.env.REPOSITORY_NAME;

  const comment = "Hello, PR comment";

  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body: comment,
  });
}

commentOnPR().catch((error) => {
  console.error(error);
  process.exit(1);
});
