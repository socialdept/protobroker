# Contributing

Contributions are **welcome** and will be fully **credited**.

## Etiquette

This project is open source, and as such, the maintainers give their free time to build and maintain the source code held within. They make the code freely available in the hope that it will be of use to other developers. It would be extremely unfair for them to suffer abuse or anger for their hard work.

Please be considerate towards maintainers when raising issues or presenting pull requests. Let's show the world that developers are civilized and selfless people.

It's the duty of the maintainer to ensure that all submissions to the project are of sufficient quality to benefit the project. Many developers have different skillsets, strengths, and weaknesses. Respect the maintainer's decision, and do not be upset or abusive if your submission is not used.

## Viability

When requesting or submitting new features, first consider whether it might be useful to others. Open source projects are used by many developers, who may have entirely different needs to your own. Think about whether or not your feature is likely to be used by other users of the project.
## Procedure

### Before Filing an Issue

- Search existing issues to avoid duplicates
- Check the [README](README.md) to ensure it's not a usage question
- Provide a clear title and description
- Include steps to reproduce the issue, with the client ID URL you used
- Specify your environment (Worker or Docker, Bun version, the authorization server you signed in with)
- Never include private keys or client assertions

### Before Submitting a Pull Request

- **Discuss non-trivial changes first** by opening an issue
- **Fork the repository** and create a feature branch from `main`
- **Follow all requirements** listed below
- **Write tests** for your changes
- **Update documentation** if behavior changes
- **Run the type check** with `bun run typecheck`
- **Ensure all tests pass** with `bun test`
- **Write clear commit messages** that explain what and why

## Requirements

- **Type checked** - `bun run typecheck` must pass for both the Worker and the Bun builds.
- **Add tests** - Your patch won't be accepted if it doesn't have tests. Metadata changes must keep passing Bluesky's own client metadata validators, which the suite runs.
- **Stay stateless** - Protobroker keeps no database. Everything a client needs is encoded in its client ID, and a change that adds stored state will not be accepted.
- **Keep v1 blobs working** - Client IDs under `/v1/` are live in other people's apps. A change to the blob format goes under a new version path, and `/v1/` keeps answering exactly as before.
- **Document any change in behavior** - Make sure the `README.md` is kept up-to-date.
- **One pull request per feature** - If you want to do more than one thing, send multiple pull requests.
- **Send coherent history** - Make sure each individual commit in your pull request is meaningful. If you had to make multiple intermediate commits while developing, please [squash them](https://www.git-scm.com/book/en/v2/Git-Tools-Rewriting-History#Changing-Multiple-Commit-Messages) before submitting.

## How Changes Land

`main` is protected. Every change arrives by pull request, and direct pushes are
blocked.

- **Merges are squash-only, and the PR title becomes the permanent commit
  message on `main`.** Write it as one descriptive line. Individual commit
  messages are preserved in the body.
- **One check must pass:** `Tests (Bun)`, which runs the type check and the tests.
  Your branch must also be up to date with `main` before merging.
- No approval is required, but review threads must be resolved.
- A merge to `main` deploys to https://proto.broker.

## Running Tests

```bash
bun install
bun test
bun run typecheck
```

To try a change by hand, `bun run dev` serves the Worker with Wrangler and `bun run start` serves the Bun build on `:8787`.
