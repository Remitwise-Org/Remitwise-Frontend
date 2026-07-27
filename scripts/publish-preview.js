#!/usr/bin/env node

/**
 * Script to publish preview URLs as comments on a GitHub Pull Request.
 * Searches for an existing preview comment to update, otherwise posts a new one.
 */

const fs = require('fs');

async function publishPreview({ repo, prNumber, token, eventPath }) {
  if (!repo) {
    throw new Error('Missing GITHUB_REPOSITORY environment variable.');
  }
  if (!token) {
    throw new Error('Missing GITHUB_TOKEN environment variable.');
  }

  let finalPrNumber = prNumber;
  if (!finalPrNumber && eventPath) {
    try {
      const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
      if (eventData.pull_request && eventData.pull_request.number) {
        finalPrNumber = eventData.pull_request.number;
      }
    } catch (err) {
      throw new Error(`Failed to parse GITHUB_EVENT_PATH: ${err.message}`);
    }
  }

  if (!finalPrNumber) {
    throw new Error('Could not identify the Pull Request number.');
  }

  const previewUrl = `https://preview-pr-${finalPrNumber}.remitwise.org`;
  const marker = '<!-- remitwise-preview-marker -->';
  const commentBody = `🚀 **Preview deployment is ready!**\n\n**Preview URL:** [${previewUrl}](${previewUrl})\n\n${marker}`;

  console.log(`Checking comments on PR #${finalPrNumber} in ${repo}...`);

  const commentsUrl = `https://api.github.com/repos/${repo}/issues/${finalPrNumber}/comments`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'remitwise-preview-bot'
  };

  const response = await fetch(commentsUrl, { headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API error while fetching comments (status ${response.status}): ${errorText}`);
  }

  const comments = await response.json();
  const existingComment = comments.find(c => c.body && c.body.includes(marker));

  if (existingComment) {
    console.log(`Found existing preview comment (ID: ${existingComment.id}). Updating it...`);
    const updateUrl = `https://api.github.com/repos/${repo}/issues/comments/${existingComment.id}`;
    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ body: commentBody })
    });
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`GitHub API error while updating comment (status ${updateResponse.status}): ${errorText}`);
    }
    console.log('Successfully updated preview comment.');
  } else {
    console.log('No existing preview comment found. Creating a new one...');
    const createResponse = await fetch(commentsUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ body: commentBody })
    });
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`GitHub API error while creating comment (status ${createResponse.status}): ${errorText}`);
    }
    console.log('Successfully posted preview comment.');
  }

  return { previewUrl, prNumber: finalPrNumber };
}

async function run() {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const prNumber = process.env.GITHUB_PR_NUMBER ? parseInt(process.env.GITHUB_PR_NUMBER, 10) : undefined;

  try {
    const result = await publishPreview({ repo, prNumber, token, eventPath });
    console.log(`✓ Preview URL published: ${result.previewUrl}`);
    process.exit(0);
  } catch (err) {
    console.error(`❌ Error publishing preview URL: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  run();
}

module.exports = { publishPreview };
