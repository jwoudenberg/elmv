# elmv
Automatically call the right versions of `elm`, `elm-format`, and `elm-test` for the project you're working on.

## Installation
Remove any currently installed versions of `elm`, `elm-format`, and `elm-test`.
Run `npm install -g elmv`.

## Usage
- After installation running `elm`, `elm-format` or `elm-test` in an elm project directory will run the version of the command specified in the `elmv.json` in the root of that project.
- If no `elmv.json` exists one will be created with the latest versions of these tools as defaults.
- Versions will be installed automatically if they aren't already.
- Outside of elm project directories you will always get the latest available version of each tool.

## TODO:
- [ ] Pass `elm-format` the right `--elm-version` parameter.
- [ ] Allow a different version to be set by passing a `--version <version>` to any command.
