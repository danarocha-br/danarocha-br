#!/usr/bin/env node
// Fetch the contribution calendar and the featured repos into data/profile.json.
//
// In GitHub Actions this uses the workflow's own GITHUB_TOKEN. Locally it uses
// GITHUB_TOKEN / GH_TOKEN if set, otherwise the token of the GitHub CLI (`gh auth login`).
// No dependencies: Node 20+ only.

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import config from '../profile.config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function token() {
  const fromEnv = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (fromEnv) return fromEnv;
  try {
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
  } catch {
    throw new Error('No GitHub token found. Set GITHUB_TOKEN, or sign in with `gh auth login`.');
  }
}

const names = config.showRepos ? config.repos.map((r) => r.name) : []; // nothing to fetch while the section is hidden
const query = `
query($login: String!${names.map((_, i) => `, $r${i}: String!`).join('')}) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar { weeks { contributionDays { date contributionCount } } }
    }
    repositories(first: 100, ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false, orderBy: { field: STARGAZERS, direction: DESC }) {
      totalCount
      nodes { name stargazerCount }
    }
  }
  ${names
    .map(
      (_, i) =>
        `r${i}: repository(owner: $login, name: $r${i}) { name description url isPrivate stargazerCount primaryLanguage { name } }`,
    )
    .join('\n  ')}
}`;

const variables = { login: config.login };
names.forEach((name, i) => {
  variables[`r${i}`] = name;
});

const response = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: {
    authorization: `bearer ${token()}`,
    'content-type': 'application/json',
    'user-agent': 'profile-cards',
  },
  body: JSON.stringify({ query, variables }),
});
if (!response.ok) throw new Error(`GitHub API answered ${response.status}: ${await response.text()}`);

const { data, errors } = await response.json();
if (!data?.user) throw new Error(`Could not read user "${config.login}": ${JSON.stringify(errors)}`);

const days = data.user.contributionsCollection.contributionCalendar.weeks
  .flatMap((week) => week.contributionDays)
  .map((day) => ({ date: day.date, count: day.contributionCount }));

const repos = {};
names.forEach((name, i) => {
  const repo = data[`r${i}`];
  if (!repo || repo.isPrivate) {
    console.warn(`skipped "${name}": not found, or private`);
    return;
  }
  repos[name] = {
    description: repo.description ?? '',
    language: repo.primaryLanguage?.name ?? '',
    stars: repo.stargazerCount,
    url: repo.url,
  };
});

// Stars earned across your own public, non-fork repositories.
const owned = data.user.repositories;
const stars = {
  total: owned.nodes.reduce((sum, repo) => sum + repo.stargazerCount, 0),
  repositories: owned.totalCount,
  top: owned.nodes.filter((repo) => repo.stargazerCount > 0).map((repo) => ({ name: repo.name, stars: repo.stargazerCount })),
};

// One day per line keeps the daily diff to a line or two.
const json = `{
  "login": ${JSON.stringify(config.login)},
  "stars": ${JSON.stringify(stars, null, 2).replace(/\n/g, '\n  ')},
  "repos": ${JSON.stringify(repos, null, 2).replace(/\n/g, '\n  ')},
  "days": [
${days.map((d) => `    ${JSON.stringify(d)}`).join(',\n')}
  ]
}
`;

mkdirSync(path.join(ROOT, 'data'), { recursive: true });
writeFileSync(path.join(ROOT, 'data', 'profile.json'), json);
console.log(`wrote data/profile.json: ${days.length} days, ${Object.keys(repos).length} repos`);
